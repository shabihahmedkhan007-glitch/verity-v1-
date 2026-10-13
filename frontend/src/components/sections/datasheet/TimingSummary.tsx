/** Table 5-1: the numbers that frame the timeline above, kept in normal flow after the pinned section ends. */
export function TimingSummary() {
  return (
    <div className="tl-sum">
      <div className="wrap">
        <h3 className="sub-h">
          <span className="n">5.1</span>Run summary
        </h3>
        <div className="tbl-wrap">
          <table className="dtbl">
            <thead>
              <tr>
                <th>Parameter</th>
                <th className="num">Value</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total time</td>
                <td className="num">88</td>
                <td>s</td>
              </tr>
              <tr>
                <td>Versions built</td>
                <td className="num">6</td>
                <td>v1 to v6</td>
              </tr>
              <tr>
                <td>Fixes made</td>
                <td className="num">2</td>
                <td>fixes</td>
              </tr>
              <tr>
                <td>Versions rejected</td>
                <td className="num">1</td>
                <td>v6</td>
              </tr>
              <tr>
                <td>Human inputs</td>
                <td className="num">2</td>
                <td>inputs</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="foot-note">
          <span className="sd">Sample data</span> from one recorded run. Times are seconds from the moment the spec was submitted.
        </p>
      </div>
    </div>
  );
}
