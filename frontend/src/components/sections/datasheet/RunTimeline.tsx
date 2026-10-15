"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { MILESTONES, TICKS, TOTAL_SECONDS } from "./timeline-data";

/** Pinned horizontal mode needs room and permission: wide, tall enough, and no reduced-motion preference. */
const LIVE_QUERY = "(min-width: 768px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)";
/** Fraction of the stage width over which a milestone reveals as it travels toward the centre. */
const REVEAL_START = 0.42;
const REVEAL_SPAN = 0.36;
/** Lerp factor per frame for the scroll smoothing. */
const EASE = 0.12;
const LAST_T = MILESTONES[MILESTONES.length - 1].t;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Section 5. By default (and on phones, short screens, reduced motion, or before hydration) it is a plain vertical list
 * with the stems drawn. When the viewport allows, the effect below sets data-live: the section becomes tall, an inner
 * stage sticks to the viewport, and vertical scroll slides the track sideways. Each milestone draws its stem and fades
 * its copy in as it nears the horizontal centre. No library: a requestAnimationFrame lerp supplies the smoothing.
 */
export function RunTimeline() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const axis = axisRef.current;
    const done = doneRef.current;
    const readout = readoutRef.current;
    const stage = root?.querySelector<HTMLElement>(".tl-stage");
    const view = root?.querySelector<HTMLElement>(".tl-view");
    if (!root || !track || !axis || !done || !readout || !stage || !view) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".tl-item"));
    const painted = items.map(() => -1);
    const mq = window.matchMedia(LIVE_QUERY);

    let live = false;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let travel = 0;
    let pxPerSec = 1;
    let viewW = 1;
    let bandH = 0;
    let xs: number[] = [];
    let current = -1;

    const measure = () => {
      pxPerSec = axis.offsetWidth / TOTAL_SECONDS;
      travel = pxPerSec * LAST_T;
      viewW = view.clientWidth || 1;
      bandH = parseFloat(getComputedStyle(stage).top) || 0;
      xs = items.map((el) => el.offsetLeft);
    };

    const readTarget = () => {
      const range = root.offsetHeight - stage.offsetHeight;
      const progress = range > 0 ? clamp((bandH - root.getBoundingClientRect().top) / range, 0, 1) : 0;
      target = progress * travel;
    };

    const apply = () => {
      track.style.transform = `translate3d(${-cur}px,0,0)`;
      const t = cur / pxPerSec;
      done.style.transform = `scaleX(${(t / TOTAL_SECONDS).toFixed(4)})`;
      readout.textContent = `t = ${t.toFixed(1)} s`;
      let nearest = 0;
      let best = Infinity;
      items.forEach((el, i) => {
        const dx = xs[i] - cur;
        const p = clamp((REVEAL_START * viewW - dx) / (REVEAL_SPAN * viewW), 0, 1);
        if (Math.abs(p - painted[i]) > 0.004) {
          painted[i] = p;
          el.style.setProperty("--p", p.toFixed(3));
        }
        if (Math.abs(dx) < best) {
          best = Math.abs(dx);
          nearest = i;
        }
      });
      if (nearest !== current) {
        if (current >= 0) items[current].removeAttribute("data-current");
        items[nearest].setAttribute("data-current", "");
        current = nearest;
      }
    };

    const tick = () => {
      const d = target - cur;
      if (Math.abs(d) < 0.25) {
        cur = target;
        raf = 0;
      } else {
        cur += d * EASE;
        raf = requestAnimationFrame(tick);
      }
      apply();
    };

    const onScroll = () => {
      readTarget();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      measure();
      readTarget();
      cur = target;
      apply();
    };

    const enable = () => {
      if (live) return;
      live = true;
      root.setAttribute("data-live", "true");
      measure();
      readTarget();
      cur = target;
      painted.fill(-1);
      current = -1;
      apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
    };

    const disable = () => {
      if (!live) return;
      live = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      raf = 0;
      root.removeAttribute("data-live");
      track.style.transform = "";
      done.style.transform = "";
      items.forEach((el) => {
        el.style.removeProperty("--p");
        el.removeAttribute("data-current");
      });
    };

    const sync = () => (mq.matches ? enable() : disable());
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      disable();
    };
  }, []);

  return (
    <section ref={rootRef} className="tl" id="timing" aria-labelledby="timing-h">
      <div className="tl-stage">
        <div className="wrap tl-head">
          <h2 className="page-h" id="timing-h">
            <span className="n">5</span>Run timing
          </h2>
          <p className="lede">
            The whole recorded run took <b>88 seconds</b>. Scroll to move along it: Verity plans, locks the tests, builds, fails, fixes,
            then evolves and proves. Failures stay in the record, marked with hollow squares, before the fixes.{" "}
            <span className="sd">Sample data.</span>
          </p>
          <div className="tl-legend-row">
            <div className="timing-legend" role="list" aria-label="Legend">
              <span className="mk pass" role="listitem">Pass or proven</span>
              <span className="mk fail" role="listitem">Fail or rejected</span>
              <span className="mk info" role="listitem">Human steer or fix</span>
              <span className="mk plain" role="listitem">Work step</span>
            </div>
            <span className="tl-readout" ref={readoutRef} aria-hidden="true">
              t = 0.0 s
            </span>
          </div>
        </div>

        <div className="tl-view">
          <div className="tl-track" ref={trackRef}>
            <div className="tl-axis" ref={axisRef}>
              <div className="tl-ruler" aria-hidden="true">
                {TICKS.map((k) => (
                  <span key={k.t} className={k.major ? "maj" : undefined} style={{ "--t": k.t } as CSSProperties}>
                    {k.label ? <em>{k.label}</em> : null}
                  </span>
                ))}
              </div>
              <div className="tl-done" ref={doneRef} aria-hidden="true" />
              <ol className="tl-list" aria-label="Milestones of the recorded run, sample data">
                {MILESTONES.map((m, i) => (
                  <li
                    key={m.t}
                    className="tl-item"
                    data-side={i % 2 === 0 ? "up" : "down"}
                    data-tone={m.tone}
                    style={{ "--t": m.t } as CSSProperties}
                  >
                    <span className="tl-stem" aria-hidden="true" />
                    <span className="tl-dot" aria-hidden="true" />
                    <div className="tl-card">
                      <p className="tl-meta">
                        <span className="tl-time">{m.t} s</span>
                        <span className={`mk ${m.tone}`}>{m.status}</span>
                      </p>
                      <p className="tl-title">{m.title}</p>
                      <p className="tl-copy">{m.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="tl-play" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
