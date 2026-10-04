"use client";

import { useState, type ReactNode } from "react";
import { Cpu, FileCode, FlaskConical, GitCompare, X } from "lucide-react";
import { BlockSteerPanel } from "@/components/domain/BlockSteerPanel";
import { CandidateCard } from "@/components/domain/CandidateCard";
import { CandidateList } from "@/components/domain/CandidateList";
import { CodeDiff } from "@/components/domain/CodeDiff";
import { CodeView } from "@/components/domain/CodeView";
import { EqyBadge } from "@/components/domain/EqyBadge";
import { ExpectedVsGotTable } from "@/components/domain/ExpectedVsGotTable";
import { FitnessBreakdown } from "@/components/domain/FitnessBreakdown";
import { GoldenModelCard } from "@/components/domain/GoldenModelCard";
import { HonestyNote } from "@/components/domain/HonestyNote";
import { PpaTable } from "@/components/domain/PpaTable";
import { PriorityRadio } from "@/components/domain/PriorityRadio";
import { SampleDataBadge } from "@/components/domain/SampleDataBadge";
import { SpecCard } from "@/components/domain/SpecCard";
import { StatusSquare } from "@/components/domain/StatusSquare";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatFitness } from "@/components/sections/shared/fitness-text";
import type { Candidate } from "@/lib/contracts/types";
import type { InspectorTab, SelectedEntity } from "@/lib/contracts/view-types";
import { useRunSummary, useSelectedEntity } from "@/lib/hooks/use-run-views";
import { useLive, useRun, useUi } from "@/lib/store";

type CandidateEntity = Extract<SelectedEntity, { kind: "candidate" }>;
type BlockEntity = Extract<SelectedEntity, { kind: "block" }>;

const RUNNING = new Set(["drafting", "linting", "simulating", "fixing", "synthesizing"]);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b bg-surface-2 px-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {onClose ? (
          <Button variant="ghost" size="icon" aria-label="Clear selection" onClick={onClose} className="size-8">
            <X />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

const LEGEND: { status: Parameters<typeof StatusSquare>[0]["status"]; label: string }[] = [
  { status: "pass", label: "Passed the locked tests" },
  { status: "fail", label: "Failed a locked test" },
  { status: "running", label: "Running" },
  { status: "rejected", label: "Rejected after repeated failures" },
  { status: "locked", label: "Locked: the agent cannot edit it" },
  { status: "idle", label: "Waiting" },
];

function Overview() {
  const summary = useRunSummary();
  const caption = useRun((r) => r.caption);
  const { select } = useUi();
  return (
    <Shell title="Run overview">
      {caption ? <p className="text-base text-fg-muted">{caption.text}</p> : null}
      <Section title="Versions">
        <CandidateList
          items={summary.candidates}
          selectedId={null}
          onSelect={(id) => select({ kind: "candidate", id })}
        />
      </Section>
      <Section title="Status colors">
        <ul className="space-y-2">
          {LEGEND.map((l) => (
            <li key={l.label} className="flex items-center gap-2 text-sm text-fg-muted">
              <StatusSquare status={l.status} animate={false} />
              {l.label}
            </li>
          ))}
        </ul>
      </Section>
      <p className="text-sm text-fg-subtle">
        Select a block or a version on the canvas, or from the list, to see its details.
      </p>
    </Shell>
  );
}

function SpecBody({ spec, onClose }: { spec: Extract<SelectedEntity, { kind: "spec" }>["spec"]; onClose: () => void }) {
  return (
    <Shell title="Spec" onClose={onClose}>
      <SpecCard spec={spec} variant="full" />
      <Section title="Goal">
        <PriorityRadio value={spec.priority} onChange={() => {}} disabled />
      </Section>
      <p className="text-sm text-fg-muted">Human input 1: the spec.</p>
    </Shell>
  );
}

function GoldenBody({
  entity,
  onClose,
}: {
  entity: Extract<SelectedEntity, { kind: "golden" }>;
  onClose: () => void;
}) {
  return (
    <Shell title="Golden model" onClose={onClose}>
      <GoldenModelCard variant="full" status="locked" testCount={entity.testCount} files={entity.files} />
      {entity.source ? (
        <CodeView code={entity.source} language="python" filename="tests/golden_model.py" maxHeight="26rem" />
      ) : null}
    </Shell>
  );
}

function BlockBody({ entity, onClose }: { entity: BlockEntity; onClose: () => void }) {
  const { block, lastDiff, planRevision } = entity;
  const mode = useRun((r) => r.mode);
  const reason = useRun((r) => r.plan.reason);
  const { steer, pendingSteers } = useLive();
  const pending = pendingSteers.some((s) => (s.kind === "pin" || s.kind === "toggle") && s.blockId === block.id);
  const changed = lastDiff?.changed.includes(block.id) ?? false;
  const added = lastDiff?.added.includes(block.id) ?? false;

  const apply = (change: { pins: string[]; variants: Record<string, string> }) => {
    const pinSet = new Set(block.pins);
    const nextSet = new Set(change.pins);
    for (const pin of new Set([...pinSet, ...nextSet])) {
      if (pinSet.has(pin) !== nextSet.has(pin)) void steer({ kind: "pin", blockId: block.id, pin });
    }
    for (const v of block.variants) {
      const next = change.variants[v.id];
      if (next !== undefined && next !== v.value) {
        void steer({ kind: "toggle", blockId: block.id, variantId: v.id, value: next });
      }
    }
  };

  return (
    <Shell title={block.name} onClose={onClose}>
      <BlockSteerPanel block={block} readOnly={mode === "replay"} pending={pending} onApply={apply} />
      {changed || added ? (
        <p className="text-sm text-fg-muted">
          {added ? "Added" : "Changed"} in replan {planRevision}
          {reason ? `: ${reason}` : "."}
        </p>
      ) : null}
    </Shell>
  );
}

type DiffChoice = { id: string; label: string; before: string; after: string; reason: string };

function diffChoices(c: Candidate, parent: Candidate | null, parentLabel: string | null): DiffChoice[] {
  const out: DiffChoice[] = [];
  if (parent && parentLabel) {
    out.push({
      id: "parent",
      label: `From parent (${parentLabel} to ${c.label})`,
      before: parent.rtl,
      after: c.attempts[0]?.rtl ?? c.rtl,
      reason: c.attempts[0]?.reason ?? c.reason,
    });
  }
  for (let i = 1; i < c.attempts.length; i++) {
    const a = c.attempts[i];
    out.push({
      id: `fix-${i}`,
      label: `Fix (attempt ${i} to ${i + 1})`,
      before: c.attempts[i - 1].rtl,
      after: a.rtl,
      reason: a.reason,
    });
  }
  return out;
}

function DiffTab({ c, parent, parentLabel }: { c: Candidate; parent: Candidate | null; parentLabel: string | null }) {
  const choices = diffChoices(c, parent, parentLabel);
  const [picked, setPicked] = useState<string | null>(null);
  if (choices.length === 0) {
    return <p className="text-sm text-fg-muted">{c.label} is the first version and has no changes to compare yet.</p>;
  }
  const choice = choices.find((x) => x.id === picked) ?? choices[0];
  return (
    <div className="space-y-3">
      {!parent && c.attempts.length > 1 ? (
        <p className="text-sm text-fg-muted">
          {c.label} is the first version. Its fix is under Fix (attempt 1 to 2).
        </p>
      ) : null}
      {choices.length > 1 ? (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={choice.id}
          onValueChange={(v) => v && setPicked(v)}
          aria-label="Compare"
          className="flex-wrap justify-start"
        >
          {choices.map((x) => (
            <ToggleGroupItem key={x.id} value={x.id} className="h-8 px-3 text-sm">
              {x.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <p className="text-sm font-medium text-foreground">{choice.label}</p>
      )}
      {choice.reason ? <p className="text-base text-fg-muted">{choice.reason}</p> : null}
      <CodeDiff
        before={choice.before}
        after={choice.after}
        beforeLabel={choice.id === "parent" ? (parentLabel ?? "before") : "before the fix"}
        afterLabel={choice.id === "parent" ? c.label : "after the fix"}
      />
    </div>
  );
}

function TestsTab({ c }: { c: Candidate }) {
  const running = RUNNING.has(c.status);
  const total = c.verification?.total ?? c.attempts.at(-1)?.verification.total;
  const last = c.attempts.at(-1);
  return (
    <div className="space-y-5">
      {c.attempts.map((a) => (
        <ExpectedVsGotTable key={a.n} verification={a.verification} attemptLabel={`Attempt ${a.n}`} />
      ))}
      {running ? (
        <div className="space-y-2" aria-live="polite">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <p className="text-sm text-fg-muted">Running {total ?? 16} tests.</p>
        </div>
      ) : null}
      {last ? (
        <div className="space-y-1 text-sm text-fg-muted">
          <p>
            Lint: {last.verification.lint === "pass" ? "pass" : "fail"} (Verilator)
          </p>
          <p>Checked against the locked golden model ({last.verification.total} tests).</p>
        </div>
      ) : !running ? (
        <p className="text-sm text-fg-muted">No test results yet.</p>
      ) : null}
    </div>
  );
}

function PpaTab({
  entity,
  baselineLabel,
  sample,
}: {
  entity: CandidateEntity;
  baselineLabel: string;
  sample: boolean;
}) {
  const c = entity.candidate;
  const measured = c.ppa !== null;
  return (
    <div className="space-y-4">
      {measured || c.isBaseline ? (
        <PpaTable ppa={c.ppa} baseline={entity.baseline} status={c.status} isBaseline={c.isBaseline} sample={sample} />
      ) : (
        <p className="text-sm text-fg-muted">
          {c.status === "fail" || c.status === "rejected"
            ? "Not measured. Versions that fail the locked tests are never synthesized."
            : "Not measured yet."}
        </p>
      )}
      <FitnessBreakdown fitness={c.fitness} status={c.status} />
      {c.eqy || entity.isWinner ? <EqyBadge eqy={c.eqy} againstLabel={baselineLabel} /> : null}
      <HonestyNote variant="block" />
      {sample ? <SampleDataBadge /> : null}
    </div>
  );
}

const TAB_ICON = { rtl: FileCode, diff: GitCompare, tests: FlaskConical, ppa: Cpu } as const;
const TAB_LABEL: Record<InspectorTab, string> = { rtl: "RTL", diff: "Diff", tests: "Tests", ppa: "PPA" };

function CandidateBody({ entity, onClose }: { entity: CandidateEntity; onClose: () => void }) {
  const { candidate: c } = entity;
  const candidates = useRun((r) => r.candidates);
  const baselineId = useRun((r) => r.baselineId);
  const winnerId = useRun((r) => r.winnerId);
  const mode = useRun((r) => r.mode);
  const sample = useRun((r) => r.sample);
  const priority = useRun((r) => r.spec?.priority ?? "area");
  const { inspectorTab, setTab } = useUi();
  const { steer, overrideWinnerLocal } = useLive();
  const [confirming, setConfirming] = useState(false);

  const parent = c.parentId ? (candidates[c.parentId] ?? null) : null;
  const baselineLabel = baselineId ? (candidates[baselineId]?.label ?? "v1") : "v1";
  const winner = winnerId ? candidates[winnerId] : null;
  const canOverride = c.status === "measured" && !entity.isWinner;
  const lines = c.rtl ? c.rtl.split("\n").length : 0;

  const confirm = () => {
    if (mode === "live") void steer({ kind: "winner_override", candidateId: c.id });
    else overrideWinnerLocal(c.id);
    setConfirming(false);
  };

  const actions = canOverride ? (
    confirming ? (
      <div className="space-y-2 rounded-md border bg-surface-2 p-3" role="group" aria-label="Confirm winner change">
        <p className="text-sm text-foreground">
          Make {c.label} the winner? Its fitness is {c.fitness ? formatFitness(c.fitness.score) : "not scored"};{" "}
          {winner ? `${winner.label} has ${winner.fitness ? formatFitness(winner.fitness.score) : "no score"}` : "there is no winner yet"}.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8 px-3" onClick={confirm}>
            Confirm
          </Button>
          <Button variant="ghost" className="h-8 px-3" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </div>
    ) : (
      <Button variant="outline" className="h-8 px-3" onClick={() => setConfirming(true)}>
        Make winner
      </Button>
    )
  ) : undefined;

  return (
    <Shell title={c.label} onClose={onClose}>
      <CandidateCard
        candidate={c}
        baseline={entity.baseline}
        priority={priority}
        variant="hero"
        isWinner={entity.isWinner}
        winnerBy={entity.winnerBy ?? undefined}
        parentLabel={entity.parentLabel}
        actions={actions}
      />
      {entity.winnerBy === "user" && mode === "replay" ? (
        <p className="text-sm text-fg-muted">
          Local to this replay. Restarting the replay resets it.
          {entity.aiWinnerLabel ? ` AI pick: ${entity.aiWinnerLabel}.` : ""}
        </p>
      ) : null}
      <Tabs value={inspectorTab} onValueChange={(v) => setTab(v as InspectorTab)}>
        <TabsList className="w-full">
          {(["rtl", "diff", "tests", "ppa"] as const).map((t) => {
            const Icon = TAB_ICON[t];
            return (
              <TabsTrigger key={t} value={t} className="h-8 gap-1.5 text-sm">
                <Icon aria-hidden className="size-3.5" />
                {TAB_LABEL[t]}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="rtl" className="mt-3 space-y-2">
          {c.rtl ? (
            <>
              <CodeView code={c.rtl} language="verilog" filename={`${c.label}.v`} copyable maxHeight="28rem" />
              <p className="text-xs text-fg-subtle">{lines} lines</p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">{c.label} has no RTL yet. The agent is writing it.</p>
          )}
        </TabsContent>
        <TabsContent value="diff" className="mt-3">
          <DiffTab c={c} parent={parent} parentLabel={entity.parentLabel} />
        </TabsContent>
        <TabsContent value="tests" className="mt-3">
          <TestsTab c={c} />
        </TabsContent>
        <TabsContent value="ppa" className="mt-3">
          <PpaTab entity={entity} baselineLabel={baselineLabel} sample={sample} />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

/** The right-hand panel: what is selected on the canvas, or the run overview when nothing is. */
export function InspectorPanel() {
  const entity = useSelectedEntity();
  const { select } = useUi();
  const close = () => select(null);
  if (!entity) return <Overview />;
  switch (entity.kind) {
    case "spec":
      return <SpecBody spec={entity.spec} onClose={close} />;
    case "golden":
      return <GoldenBody entity={entity} onClose={close} />;
    case "block":
      return <BlockBody entity={entity} onClose={close} />;
    case "candidate":
      return <CandidateBody key={entity.candidate.id} entity={entity} onClose={close} />;
  }
}
