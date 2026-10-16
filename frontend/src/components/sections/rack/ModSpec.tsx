import { Ears } from "./Ears";

const PORTS: [string, string, string][] = [
  ["clk", "in", "1"],
  ["rst_n", "in", "1"],
  ["start", "in", "1"],
  ["a[0:3]", "in", "4 x 8"],
  ["b[0:3]", "in", "4 x 8"],
  ["acc", "out", "22"],
  ["done", "out", "1"],
];

/** MOD 1: the plain-English spec and the port list. */
export function ModSpec() {
  return (
    <section className="mod" aria-label="Module 1, spec in">
      <Ears />
      <div className="mh">
        <span className="eng">MOD 1 · SPEC IN</span>
        <span className="mh-r">
          <span className="word dim">VRT-MAC4</span>
        </span>
      </div>
      <div className="field-l lab">
        <span>Plain English spec</span>
        <span>4-lane MAC array, 8-bit</span>
      </div>
      <div className="field" role="textbox" aria-readonly="true" aria-label="Spec typed into the input">
        A 4-lane multiply-accumulate unit. Each cycle it multiplies four pairs of unsigned 8-bit inputs and adds the four products to a
        running sum. After 16 cycles it raises done and holds the 22-bit result until reset. Smallest area matters most.
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
            {PORTS.map(([p, d, b]) => (
              <tr key={p}>
                <td>{p}</td>
                <td>{d}</td>
                <td className="num">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
