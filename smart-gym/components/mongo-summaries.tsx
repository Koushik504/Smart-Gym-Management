import { type Row, shortDate } from "./data";
import { Empty } from "./dashboard";
export function MongoSummaries({ data }: { data: Row }) {
  return (
    <div className="report-charts">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">MEASUREMENTS · LAST 90 DAYS</span>
            <h2>Member progress summary</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Entries</th>
                <th>Latest weight</th>
                <th>Recorded change</th>
                <th>Last entry</th>
              </tr>
            </thead>
            <tbody>
              {data.measurements.map((r: Row) => (
                <tr key={r._id}>
                  <td>{r.memberName}</td>
                  <td>{r.entries}</td>
                  <td>{r.latestWeight} kg</td>
                  <td>
                    {r.weightChange > 0 ? "+" : ""}
                    {r.weightChange} kg
                  </td>
                  <td>{shortDate(r.lastDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.measurements.length && <Empty />}
        </div>
        <p className="panel-footnote">
          Change is latest minus earliest recorded weight in this window. It
          does not label gain or loss as inherently positive.
        </p>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CONNECTED ACTIVITY · LAST 90 DAYS</span>
            <h2>Activity by event type</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Count</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {data.activity.map((r: Row) => (
                <tr key={r._id}>
                  <td>{r._id}</td>
                  <td>{r.events}</td>
                  <td>{shortDate(r.lastEvent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.activity.length && <Empty />}
        </div>
        <p className="panel-footnote">
          Counts use delivered MongoDB activity documents. Pending outbox
          entries appear after successful delivery.
        </p>
      </section>
    </div>
  );
}
