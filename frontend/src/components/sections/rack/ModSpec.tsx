import { Ears } from "./Ears";
import { REAL } from "./real-run";

/** MOD 1: the plain-English spec and the port list. */
export function ModSpec() {
  return (
    <section className="mod" aria-label="Module 1, spec in">
      <Ears />
      <div className="mh">
        <span className="eng">MOD 1 · SPEC IN</span>
        <span className="mh-r">
          <span className="word dim">{REAL.part}</span>
        </span>
      </div>
      <div className="field-l lab">
        <span>Plain English spec</span>
        <span>{REAL.spec.title}</span>
      </div>
      <div className="field" role="textbox" aria-readonly="true" aria-label="Spec typed into the input">
        {REAL.spec.text}
        <span className="caret" aria-hidden="true" />
      </div>
      <div className="ports">
        <div className="lab" style={{ marginBottom: 6 }}>
          Port list
        </div>
        <table className="tbl" aria-label="Port list">
          <thead>
            <tr>
              <th>Port</th>
              <th>Dir</th>
              <th className="num">Bits</th>
            </tr>
          </thead>
          <tbody>
            {REAL.ports.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.dir}</td>
                <td className="num">{p.bits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
