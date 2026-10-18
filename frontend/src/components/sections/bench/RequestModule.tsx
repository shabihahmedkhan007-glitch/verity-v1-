"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  FAMILIES,
  OUT_OF_RANGE,
  RANGES_ARE_DRAFT,
  familyById,
  isDefaultKnobs,
  knobDefaults,
  knobError,
  type Family,
  type KnobDef,
  type KnobValue,
} from "@/lib/contracts/presets";
import type { Credits, Priority } from "@/lib/contracts/types";
import type { LiveHealth } from "@/lib/contracts/view-types";
import { formatUsd } from "@/lib/format";
import { Mod } from "../studio/chrome/Mod";
import { AccessCode } from "./AccessCode";
import { ParseBox } from "./ParseBox";

const PRIORITIES: { id: Priority; label: string; hint: string }[] = [
  { id: "area", label: "Smaller", hint: "area" },
  { id: "speed", label: "Faster", hint: "clock" },
  { id: "power", label: "Lower power", hint: "estimate" },
];

export type RunRequest = { familyId: string; knobs: Record<string, KnobValue>; priority: Priority; title: string; sendKnobs: boolean };

function KnobField({ k, value, disabled, onChange }: { k: KnobDef; value: KnobValue; disabled: boolean; onChange(v: KnobValue): void }) {
  const id = useId();
  const err = knobError(k, value);
  if (k.kind === "int") {
    const n = typeof value === "number" ? value : k.default;
    return (
      <div className="b-knob">
        <div className="b-knob-h">
          <label htmlFor={id}>{k.label}</label>
          <output htmlFor={id} className="m">
            {n} <span>{k.unit}</span>
          </output>
        </div>
        <input
          id={id}
          type="range"
          min={k.min}
          max={k.max}
          step={1}
          value={n}
          disabled={disabled}
          aria-valuetext={`${n} ${k.unit}`}
          style={{ "--p": `${((n - k.min) / (k.max - k.min)) * 100}%` } as React.CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="b-knob-r m" aria-hidden>
          <span>{k.min}</span>
          <span>{k.max}</span>
        </div>
      </div>
    );
  }
  if (k.kind === "bool") {
    const on = value === true;
    return (
      <div className="b-knob b-knob-bool">
        <span className="b-knob-l" id={`${id}-l`}>
          {k.label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-l`}
          className="b-switch"
          disabled={disabled}
          onClick={() => onChange(!on)}
        >
          <span className="rkq" data-on={on ? "" : undefined} aria-hidden />
          {on ? k.on : k.off}
        </button>
      </div>
    );
  }
  const s = typeof value === "string" ? value : k.default;
  return (
    <div className="b-knob">
      <div className="b-knob-h">
        <label htmlFor={id}>{k.label}</label>
        <span className="m b-knob-u">
          {k.minLen} to {k.maxLen} bits
        </span>
      </div>
      <input
        id={id}
        className="b-bits m"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        maxLength={k.maxLen}
        value={s}
        disabled={disabled}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${id}-e` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^01]/g, ""))}
      />
      {err ? (
        <p id={`${id}-e`} className="b-note" role="alert">
          <span className="rkq fail" aria-hidden /> {err}
        </p>
      ) : null}
    </div>
  );
}

/** Why Run cannot start right now, or null when it can. */
function blocker(f: Family, knobs: Record<string, KnobValue>, health: LiveHealth): string | null {
  const bad = f.knobs.map((k) => knobError(k, knobs[k.id])).find((e) => e !== null);
  if (bad) return bad;
  if (health.features?.includes("params")) return null;
  if (!f.liveAtDefaults) return `${f.name} runs land with knob support in the backend. The MAC array at its default knobs runs today.`;
  if (!isDefaultKnobs(f, knobs)) return "Custom knob values land with the backend. Reset to the defaults to run today.";
  return null;
}

/**
 * The REQUEST module: plain English or knobs, the out-of-range list, the goal, the access code and Run (the page's one
 * amber action), then the cost meter. The knobs are rendered from the FAMILIES table, never written in JSX.
 */
export function RequestModule({
  health,
  locked,
  starting,
  startError,
  needsCode,
  codeNotice,
  credits,
  hasRun,
  onSubmitCode,
  onRun,
}: {
  health: LiveHealth;
  /** A live run is in progress: the request is read-only until it ends. */
  locked: boolean;
  starting: boolean;
  startError: string | null;
  needsCode: boolean;
  codeNotice: string | null;
  credits: Credits | null;
  hasRun: boolean;
  onSubmitCode(code: string): Promise<string | null>;
  onRun(req: RunRequest): void;
}) {
  const [familyId, setFamilyId] = useState(FAMILIES[0].id);
  const family = familyById(familyId) ?? FAMILIES[0];
  const [knobs, setKnobs] = useState<Record<string, KnobValue>>(() => knobDefaults(FAMILIES[0]));
  const [priority, setPriority] = useState<Priority>("area");
  const groupId = useId();

  const pickFamily = (id: string, next?: Record<string, KnobValue>) => {
    const f = familyById(id);
    if (!f) return;
    setFamilyId(f.id);
    setKnobs(next ?? knobDefaults(f));
  };

  const ready = health.status === "ready";
  const why = blocker(family, knobs, health);
  const disabled = locked || starting;
  const canRun = ready && !disabled && !needsCode && why === null;
  const capUsd = credits?.capUsd ?? health.capUsd;

  const runLabel = starting ? "Starting..." : locked ? "Running" : hasRun ? "Run again" : "Run";

  return (
    <Mod
      label="Request"
      className="b-req"
      right={RANGES_ARE_DRAFT ? <span className="badge" title="Ranges are set by real probe runs before they ship">Draft ranges</span> : null}
    >
      <form
        className="b-req-body"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canRun) return;
          onRun({ familyId: family.id, knobs, priority, title: family.describe(knobs), sendKnobs: health.features?.includes("params") === true });
        }}
      >
        <ParseBox available={health.features?.includes("parse") === true} disabled={disabled} onApply={pickFamily} />

        <fieldset className="b-fs" disabled={disabled}>
          <legend className="b-h">Chip family</legend>
          <div className="b-fam">
            {FAMILIES.map((f) => (
              <label key={f.id} className="b-fam-o">
                <input type="radio" name={`${groupId}-fam`} value={f.id} checked={f.id === family.id} onChange={() => pickFamily(f.id)} />
                <span className="b-fam-n">{f.name}</span>
                <span className="b-fam-s">{f.summary}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="b-fs" disabled={disabled}>
          <legend className="b-h">Knobs</legend>
          <p className="b-title">{family.describe(knobs)}</p>
          {family.knobs.map((k) => (
            <KnobField key={`${family.id}-${k.id}`} k={k} value={knobs[k.id]} disabled={disabled} onChange={(v) => setKnobs((prev) => ({ ...prev, [k.id]: v }))} />
          ))}
          {!isDefaultKnobs(family, knobs) ? (
            <button type="button" className="btn ghost xs" onClick={() => setKnobs(knobDefaults(family))}>
              Reset to defaults
            </button>
          ) : null}
        </fieldset>

        <details className="b-out">
          <summary className="b-h">What Verity cannot build</summary>
          <ul>
            {OUT_OF_RANGE.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>

        <fieldset className="b-fs" disabled={disabled}>
          <legend className="b-h">Goal</legend>
          <div className="b-seg">
            {PRIORITIES.map((p) => (
              <label key={p.id}>
                <input type="radio" name={`${groupId}-pri`} value={p.id} checked={priority === p.id} onChange={() => setPriority(p.id)} />
                <span>
                  {p.label} <small>{p.hint}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="b-go">
          {health.status === "checking" ? (
            <p className="b-note">
              <span className="rkq run" aria-hidden /> Checking whether live runs are open.
            </p>
          ) : !ready ? (
            <Unavailable health={health} />
          ) : needsCode && !locked ? (
            <AccessCode onSubmit={onSubmitCode} notice={codeNotice} />
          ) : (
            <>
              <button type="submit" className="btn b-run" disabled={!canRun} aria-describedby={why ? `${groupId}-why` : undefined}>
                {runLabel}
              </button>
              {why && !locked ? (
                <p id={`${groupId}-why`} className="b-note">
                  {why}
                </p>
              ) : null}
            </>
          )}
          {startError ? (
            <p className="b-note" role="alert">
              <span className="rkq fail" aria-hidden /> {startError}
            </p>
          ) : null}
        </div>

        <div className="b-cost">
          <div className="b-knob-h">
            <span className="lab">Credits</span>
            <span className="m">
              {credits ? formatUsd(credits.usedUsd) : formatUsd(0)}
              {capUsd !== null ? ` of ${formatUsd(capUsd)} cap` : " (no cap reported)"}
            </span>
          </div>
          <span className="tlb-meter b-meter" aria-hidden>
            <span style={{ transform: `scaleX(${credits && capUsd ? Math.min(1, credits.usedUsd / capUsd) : 0})` }} />
          </span>
          <p className="b-note b-dim">The server stops every run at its cap. One run at a time.</p>
        </div>
      </form>
    </Mod>
  );
}

function Unavailable({ health }: { health: LiveHealth }) {
  const text =
    health.status === "not_configured"
      ? "Live runs are offline on this site. The recorded run shows the same loop and costs nothing."
      : health.status === "budget_exhausted"
        ? "Today's live budget is used up. Live runs open again tomorrow."
        : health.status === "busy"
          ? "Another live run is in progress. Live runs are limited so each one stays on budget."
          : "Live runs could not be reached. The agent did not respond.";
  return (
    <div className="b-unavail" role="status">
      <p className="b-note">
        <span className="rkq fail" aria-hidden /> {text}
      </p>
      <div className="b-acts">
        <Link prefetch={false} href="/studio?run=mac4-real" className="btn ghost xs">
          Watch the recorded run
        </Link>
        {health.status !== "not_configured" ? (
          <button type="button" className="btn ghost xs" onClick={() => window.location.reload()}>
            Check again
          </button>
        ) : null}
      </div>
    </div>
  );
}
