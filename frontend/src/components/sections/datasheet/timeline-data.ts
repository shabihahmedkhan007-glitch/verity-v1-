/** Milestones of the recorded 88 s run (MEETING.md / BRIEF.md). All of it is sample data. */
export const TOTAL_SECONDS = 88;

export type Tone = "pass" | "fail" | "info" | "plain" | "win";

export type Milestone = {
  /** Seconds from the moment the spec was submitted. */
  t: number;
  /** Status word shown next to the square marker. Never colour alone. */
  status: string;
  tone: Tone;
  title: string;
  copy: string;
};

export const MILESTONES: Milestone[] = [
  { t: 0, status: "Running", tone: "info", title: "Spec read", copy: "Verity reads the plain-English spec: a 4-lane multiply-accumulate unit, 8-bit, smallest area first." },
  { t: 12, status: "Steer", tone: "info", title: "Human steer", copy: "A person pins a 2-stage multiplier pipeline. The plan keeps it." },
  { t: 22, status: "Locked", tone: "plain", title: "Answer key locked", copy: "The golden model and 16 tests are written and locked. The agent can run them, not edit them." },
  { t: 29, status: "Fail", tone: "fail", title: "v1 fails 13 of 16 tests", copy: "The accumulator is 16 bits and wraps. The failure stays in the record." },
  { t: 36, status: "Pass", tone: "pass", title: "v1 passes 16 of 16", copy: "After widening the accumulator to 22 bits. This is the baseline: 1840 um2." },
  { t: 49, status: "Fail", tone: "fail", title: "v3 fails 14 of 16 tests", copy: "The done flag rises one cycle late." },
  { t: 54, status: "Fixed", tone: "info", title: "v3 fixed", copy: "The agent corrects the timing and v3 passes all 16 tests." },
  { t: 59, status: "Kept", tone: "plain", title: "Kept v3 and v2", copy: "v4 was faster but larger, so it was dropped. The best one or two are kept." },
  { t: 72, status: "Rejected", tone: "fail", title: "v6 rejected", copy: "Two attempts, 14 then 15 of 16 tests. It still fails the restart test, so it is dropped." },
  { t: 78, status: "Winner", tone: "win", title: "v5 wins", copy: "Area -17.4% versus v1, with all 16 tests passing." },
  { t: 85, status: "Proven", tone: "pass", title: "v5 proven equal to v1", copy: "Yosys EQY formally checks v5 against v1: the smaller version behaves the same. Run complete at 88 s." },
];

/** Ruler ticks: every 2 s, a taller labelled tick every 10 s and at the end of the run. */
export const TICKS: { t: number; major: boolean; label: string | null }[] = Array.from({ length: TOTAL_SECONDS / 2 + 1 }, (_, i) => {
  const t = i * 2;
  const major = t % 10 === 0 || t === TOTAL_SECONDS;
  return { t, major, label: major ? (t === TOTAL_SECONDS ? `${t} s` : String(t)) : null };
});
