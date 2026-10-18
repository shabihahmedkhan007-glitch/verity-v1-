// Every figure on the landing comes from the recorded run (public/runs/mac4-real.json), read at build time.
// Nothing here is typed by hand: change the fixture and the landing follows. validate-fixture.ts checks the fixture itself.
import raw from "../../../../public/runs/mac4-real.json";
import { formatClock, formatDelta } from "@/lib/format";
import type { Candidate, RunLog } from "@/lib/contracts/types";

const log = raw as unknown as RunLog;

const last = new Map<string, Candidate>();
for (const e of log.events) if (e.t === "candidate") last.set(e.candidate.id, e.candidate);

const specEvent = log.events.find((e) => e.t === "spec");
if (!specEvent || specEvent.t !== "spec") throw new Error("mac4-real.json has no spec event");
const winnerEvent = log.events.find((e) => e.t === "winner");
if (!winnerEvent || winnerEvent.t !== "winner") throw new Error("mac4-real.json has no winner event");

const candidates = [...last.values()].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
const v1 = candidates.find((c) => c.isBaseline);
const winner = last.get(winnerEvent.candidateId);
if (!v1?.ppa || !winner?.ppa || !winner.fitness) throw new Error("mac4-real.json has no measured baseline or winner");
const v1ppa = v1.ppa;
const winnerPpa = winner.ppa;

const num = (n: number, digits = 0) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const areaOf = (c: Candidate) => c.ppa?.areaUm2 ?? null;
const pct = (v: number, b: number) => formatDelta(v, b, { lowerIsBetter: true }).text;

/** One failing attempt, in version order. `kind` is what failed: the lint and contract check or the locked tests. */
const failed = candidates.flatMap((c) => {
  const bad = c.attempts.find((a) => a.verification.lint === "fail" || a.verification.passed < a.verification.total);
  if (!bad) return [];
  return [{ label: c.label, kind: bad.verification.lint === "fail" ? ("lint" as const) : ("tests" as const), rejected: c.status === "rejected" }];
});

const rejectedWithTests = candidates.find((c) => c.status === "rejected" && (c.verification?.failures.length ?? 0) > 0);
const lockMs = log.meta.chapters.find((c) => c.id === "lock")?.tMs ?? 0;
const rounds = log.events.reduce((m, e) => (e.t === "round" ? Math.max(m, e.round) : m), 0);
const tools = [...new Set(winnerPpa.tools.map((t) => t.replace(/\s+[\d.+]+$/, "")))];

export const REAL = {
  part: "VRT-MAC4",
  date: log.meta.recordedAt.slice(0, 10),
  spec: specEvent.spec,
  ports: specEvent.spec.ports.map((p) => ({
    name: p.count ? `${p.name}[0:${p.count - 1}]` : p.name,
    dir: p.dir,
    bits: p.count ? `${p.count} x ${p.width}` : String(p.width),
  })),
  testCount: specEvent.spec.testCount,
  weights: winner.fitness.weights,
  priority: winner.fitness.priority,
  versions: candidates.length,
  rejected: candidates.filter((c) => c.status === "rejected").length,
  fixes: candidates.reduce((s, c) => s + c.fixCount, 0),
  humanInputs: log.events.filter((e) => e.t === "human").length,
  rounds,
  stages: { lockAt: formatClock(lockMs), of: formatClock(log.meta.durationMs) },
  failed,
  failingTest: rejectedWithTests
    ? {
        label: rejectedWithTests.label,
        passed: rejectedWithTests.verification?.passed ?? 0,
        total: rejectedWithTests.verification?.total ?? 0,
        test: rejectedWithTests.verification?.failures[0],
      }
    : null,
  v1: { label: v1.label, area: v1ppa.areaUm2, clock: v1ppa.clockPeriodNs, power: v1ppa.powerMw },
  winner: {
    label: winner.label,
    area: winnerPpa.areaUm2,
    clock: winnerPpa.clockPeriodNs,
    power: winnerPpa.powerMw,
    eqy: winner.eqy?.status ?? "not_run",
    areaDelta: v1ppa.areaUm2 !== null && winnerPpa.areaUm2 !== null ? pct(winnerPpa.areaUm2, v1ppa.areaUm2) : "n/a",
    clockDelta: v1ppa.clockPeriodNs !== null && winnerPpa.clockPeriodNs !== null ? pct(winnerPpa.clockPeriodNs, v1ppa.clockPeriodNs) : "n/a",
  },
  tools: tools.join(" and "),
  pdk: winnerPpa.pdk,
  areaRows: candidates.map((c) => {
    const a = areaOf(c);
    const base = v1ppa.areaUm2;
    return {
      label: c.label,
      area: a,
      delta: a !== null && base !== null && !c.isBaseline ? pct(a, base) : null,
      isBaseline: c.isBaseline,
      isWinner: c.id === winner.id,
      rejected: c.status === "rejected",
    };
  }),
  areaMax: Math.max(...candidates.map((c) => areaOf(c) ?? 0)),
} as const;

export { num };
