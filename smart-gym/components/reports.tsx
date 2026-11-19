"use client";
import { MongoSummaries } from "./mongo-summaries";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { api, useData, type Row, shortDate, money } from "./data";
import { Chart } from "./charts";
import { Empty, ErrorState, Loading } from "./dashboard";
export function Reports({ admin }: { admin: boolean }) {
  const [memberId, setMemberId] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const { data, error, loading, refresh } = useData(
      "reports" + (memberId ? "?memberId=" + memberId : ""),
    ),
    lookups = useData("lookups");
  async function sync() {
    setBusy(true);
    try {
      const result = await api("admin/outbox", { method: "POST" });
      setNotice(
        `${result.delivered} events delivered; ${result.failed} failed; ${result.pending} pending.`,
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  if (!data) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM RECORDS TO BETTER DECISIONS</span>
          <h1>
            Analytics & insights<span className="heading-dot">.</span>
          </h1>
          <p>
            Understand the patterns. Give every member a reason to come back.
          </p>
        </div>
        <button className="button" onClick={refresh}>
          <RefreshCw size={16} />
          Refresh reports
        </button>
      </div>
      <div className="insight-intro">
        <span className="insight-symbol">
          <Sparkles size={24} />
        </span>
        <div>
          <h2>Clear rules. Useful insights.</h2>
          <p>
            Retention considers expiry in 14 days, zero visits in 14 days, or a
            50% fall between two 14-day windows. Workout suggestions use logged
            consistency and completion.
          </p>
        </div>
        <span className="subtle-pill">Transparent by design</span>
      </div>
      <div className="report-charts">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {admin ? "PAID TRANSACTIONS" : "YOUR ASSIGNED MEMBERS"}
              </span>
              <h2>{admin ? "Monthly revenue" : "Attendance trends"}</h2>
            </div>
          </div>
          <Chart
            data={
              admin
                ? data.overview.charts.revenue
                : data.overview.charts.attendance
            }
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">A GROWING COMMUNITY</span>
              <h2>Membership growth</h2>
            </div>
          </div>
          <Chart data={data.overview.charts.growth} type="bar" />
        </section>
      </div>
      <section className="panel report-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RETENTION & EXPIRY</span>
            <h2>Members who could use a check-in</h2>
          </div>
          <span className="subtle-pill">{data.retention.length} insights</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Expiry</th>
                <th>Last 14 days</th>
                <th>Previous 14 days</th>
                <th>Why reach out</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.retention.map((r: Row) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{shortDate(r.endsAt)}</td>
                  <td>{r.recentVisits} visits</td>
                  <td>{r.previousVisits} visits</td>
                  <td>
                    <div className="reason-list">
                      {r.reasons.map((reason: string) => (
                        <span className="badge amber" key={reason}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Link
                      aria-label={"View " + r.name}
                      className="icon-button"
                      href={"/members/" + r.id}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.retention.length && <Empty />}
        </div>
        <p className="panel-footnote">
          Expiry uses the latest non-cancelled subscription, including reserved
          pending-payment periods. Attendance windows include today (UTC). These
          are follow-up signals, not predictions.
        </p>
      </section>
      <section className="panel report-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">WORKOUT INTELLIGENCE · LAST 90 DAYS</span>
            <h2>Progress worth noticing</h2>
          </div>
          <select
            aria-label="Member for workout analytics"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">All assigned members</option>
            {lookups.data?.members.map((m: Row) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        {data.mongoError ? (
          <div className="error-banner" role="alert">
            {data.mongoError}
          </div>
        ) : (
          <>
            <div className="workout-report-grid">
              <div>
                <Chart
                  data={data.workout.monthly.map((r: Row) => ({
                    label: r._id,
                    value: r.sessions,
                  }))}
                  type="bar"
                />
                <p className="chart-label">Workout sessions by month</p>
              </div>
              <div className="workout-summary">
                <span className="eyebrow">THE WORK BEHIND THE NUMBERS</span>
                <strong>
                  {data.workout.monthly.reduce(
                    (s: number, r: Row) => s + r.sessions,
                    0,
                  )}
                  <small>logged sessions</small>
                </strong>
                <p>
                  {data.workout.monthly.reduce(
                    (s: number, r: Row) => s + r.minutes,
                    0,
                  )}{" "}
                  training minutes across the selected members.
                </p>
                <span className="badge green">
                  <CheckCircle2 size={13} /> Live workout aggregation
                </span>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Sessions</th>
                    <th>Completion</th>
                    <th>Volume change*</th>
                    <th>Recommended next step</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workout.insights.map((r: Row) => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.memberName}</strong>
                      </td>
                      <td>{r.sessions}</td>
                      <td>{r.completionRate}%</td>
                      <td>
                        {r.volumeChange === null
                          ? "More sessions needed"
                          : (r.volumeChange > 0 ? "+" : "") +
                            r.volumeChange +
                            "%"}
                      </td>
                      <td className="recommendation-cell">
                        {r.recommendation}
                        {r.suggestedPlans.length > 0 && (
                          <small>
                            Relevant plans:{" "}
                            {r.suggestedPlans
                              .map((p: Row) => p.name)
                              .join(", ")}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.workout.insights.length && <Empty />}
            </div>
            <p className="panel-footnote">
              *Volume compares the two latest sessions (completed sets × reps ×
              kg), without correcting for different exercises. It measures
              recorded workload, not fitness or medical outcomes. Fewer than 3
              sessions: build consistency. Completion below 70%: conditioning.
              Otherwise: discuss strength progression with a trainer.
            </p>
            <div className="section-heading inset">
              <h3>Exercise completion & recorded volume</h3>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Logged entries</th>
                    <th>Completed</th>
                    <th>Volume (kg × reps)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workout.exerciseCompletion.map((r: Row) => (
                    <tr key={r._id}>
                      <td>{r.name}</td>
                      <td>{r.entries}</td>
                      <td>{r.completed}</td>
                      <td>{Number(r.volume).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {data.workout && <MongoSummaries data={data.workout} />}{" "}
      {admin && (
        <>
          <section className="panel report-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SUPPORT ACROSS THE FLOOR</span>
                <h2>Trainer workload</h2>
              </div>
            </div>
            <div className="workload-grid">
              {data.workload.map((r: Row) => (
                <div key={r.id}>
                  <span className="mini-avatar">{r.name[0]}</span>
                  <strong>{r.name}</strong>
                  <small>{r.specialty}</small>
                  <span className="workload-count">
                    {Number(r.members)} <small>active members</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel report-section">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">CONNECTED ACTIVITY</span>
                <h2>Activity delivery</h2>
              </div>
              <button className="button" onClick={sync} disabled={busy}>
                <RefreshCw size={15} />
                {busy ? "Delivering…" : "Deliver pending events"}
              </button>
            </div>
            {notice && (
              <p className="panel-footnote" role="status">
                {notice}
              </p>
            )}
            <p className="panel-footnote">
              Transactional events are saved with MySQL changes. This action
              delivers them to MongoDB using unique event identifiers; failed
              deliveries remain available for retry.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Member reference</th>
                    <th>Recorded</th>
                    <th>Delivery</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.map((r: Row) => (
                    <tr key={r.id}>
                      <td>{r.type}</td>
                      <td>{r.memberId || "—"}</td>
                      <td>{shortDate(r.createdAt)}</td>
                      <td>
                        <span
                          className={
                            "badge " + (r.processedAt ? "green" : "amber")
                          }
                        >
                          {r.processedAt ? "Delivered" : "Pending"}
                        </span>
                      </td>
                      <td>{r.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="data-note">
            Pending payments: {data.overview.metrics.pendingPayments} ·{" "}
            {money(data.overview.metrics.pendingAmount)} · Revenue counts paid
            transactions only.
          </p>
        </>
      )}
    </>
  );
}
