// Validates public/runs/golden.json. Run with: npm run validate:fixture
// Relies on Node 24 type stripping: erasable TypeScript only, relative import with the .ts extension.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RunLogSchema } from "../src/lib/contracts/schemas.ts";

type Ppa = {
  areaUm2: number | null;
  clockPeriodNs: number | null;
  powerMw: number | null;
};
type Cand = {
  id: string;
  status: string;
  rtl: string;
  attempts: { n: number; rtl: string }[];
  ppa: Ppa | null;
  isBaseline: boolean;
  fitness: { score: number; priority: "area" | "speed" | "power"; weights: { area: number; timing: number; power: number } } | null;
};

const WEIGHTS = {
  area: { area: 0.6, timing: 0.25, power: 0.15 },
  speed: { area: 0.25, timing: 0.6, power: 0.15 },
  power: { area: 0.25, timing: 0.15, power: 0.6 },
} as const;

/** ARCHITECTURE 8.3: weighted gain vs the baseline; a missing metric is dropped and the weights renormalized. */
function recompute(base: Ppa, c: Ppa, priority: "area" | "speed" | "power"): number {
  const w = WEIGHTS[priority];
  const parts: { w: number; gain: number }[] = [];
  const add = (weight: number, b: number | null, v: number | null) => {
    if (b === null || v === null) return;
    parts.push({ w: weight, gain: (100 * (b - v)) / b });
  };
  add(w.area, base.areaUm2, c.areaUm2);
  add(w.timing, base.clockPeriodNs, c.clockPeriodNs);
  add(w.power, base.powerMw, c.powerMw);
  const total = parts.reduce((s, p) => s + p.w, 0);
  if (total === 0) return 0;
  return parts.reduce((s, p) => s + (p.w / total) * p.gain, 0);
}

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

const path = fileURLToPath(new URL("../public/runs/golden.json", import.meta.url));
const parsed = RunLogSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
if (!parsed.success) {
  console.error("golden.json does not match RunLogSchema:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}
const log = parsed.data;

// seq strictly increasing, tMs non-decreasing
let prevSeq = 0;
let prevT = 0;
for (const e of log.events) {
  if (e.seq <= prevSeq) fail(`seq not strictly increasing at seq ${e.seq} (previous ${prevSeq})`);
  if (e.tMs < prevT) fail(`tMs decreases at seq ${e.seq} (${e.tMs} < ${prevT})`);
  prevSeq = e.seq;
  prevT = e.tMs;
}
if (prevT > log.meta.durationMs) fail(`last event tMs ${prevT} is after meta.durationMs ${log.meta.durationMs}`);

// canvas ops: connects reference added nodes, content add_node count <= 12
const added = new Set<string>();
let contentNodes = 0;
for (const e of log.events) {
  if (e.t !== "op") continue;
  if (e.op.op === "add_node") {
    if (added.has(e.op.id)) fail(`add_node repeats id ${e.op.id} at seq ${e.seq}`);
    added.add(e.op.id);
    contentNodes += 1;
  } else if (e.op.op === "connect") {
    if (!added.has(e.op.source)) fail(`connect at seq ${e.seq}: source ${e.op.source} was not added before`);
    if (!added.has(e.op.target)) fail(`connect at seq ${e.seq}: target ${e.op.target} was not added before`);
  }
}
if (contentNodes > 12) fail(`content add_node count ${contentNodes} exceeds 12`);

// last upsert per candidate
const last = new Map<string, Cand>();
for (const e of log.events) if (e.t === "candidate") last.set(e.candidate.id, e.candidate as Cand);

const baseline = [...last.values()].find((c) => c.isBaseline);
if (!baseline || !baseline.ppa) {
  fail("no measured baseline candidate");
} else {
  for (const c of last.values()) {
    if (c.status === "measured" && !c.fitness) fail(`${c.id} is measured but has no fitness`);
    if (c.status !== "measured" && c.fitness) fail(`${c.id} has fitness but status ${c.status}`);
    if (!c.fitness || !c.ppa) continue;
    const expected = c.id === baseline.id ? 0 : recompute(baseline.ppa, c.ppa, c.fitness.priority);
    if (Math.abs(expected - c.fitness.score) > 0.01) {
      fail(`${c.id} fitness ${c.fitness.score} does not match recomputed ${expected.toFixed(3)}`);
    }
    const w = WEIGHTS[c.fitness.priority];
    if (c.fitness.weights.area !== w.area || c.fitness.weights.timing !== w.timing || c.fitness.weights.power !== w.power) {
      fail(`${c.id} stored weights do not match priority ${c.fitness.priority}`);
    }
  }
}

// winner and sample hygiene
const winner = [...log.events].reverse().find((e) => e.t === "winner");
if (!winner || winner.t !== "winner") fail("no winner event");
else if (!last.has(winner.candidateId)) fail(`winner ${winner.candidateId} is not a known candidate`);
if (log.meta.sample && !log.meta.note) fail("meta.sample is true but meta.note is empty");
for (const c of last.values()) {
  for (const a of c.attempts) {
    const lines = a.rtl.split("\n").length;
    if (lines < 20 || lines > 40) fail(`${c.id} attempt ${a.n} RTL has ${lines} lines (expected 20 to 40)`);
    if (log.meta.sample && !a.rtl.includes("// SAMPLE RTL for UI development")) fail(`${c.id} attempt ${a.n} RTL lacks the SAMPLE marker`);
  }
}

if (problems.length > 0) {
  console.error("golden.json validation failed:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `golden.json OK: ${last.size} versions, winner ${winner && winner.t === "winner" ? winner.candidateId : "none"}, ${contentNodes} nodes, fitness checks passed`,
);
