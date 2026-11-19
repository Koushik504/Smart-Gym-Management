"use client";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  Mail,
  UserRound,
} from "lucide-react";
import { useData, shortDate, money, type Row } from "./data";
import { Chart } from "./charts";
import { Empty, ErrorState, Loading } from "./dashboard";
export function MemberProfile({
  id,
  personal = false,
}: {
  id: string;
  personal?: boolean;
}) {
  const profile = useData("members/" + id),
    workouts = useData<Row[]>("workouts?memberId=" + id),
    progress = useData<Row[]>("progress?memberId=" + id),
    me = useData("me");
  if (profile.loading) return <Loading />;
  if (profile.error)
    return <ErrorState message={profile.error} retry={profile.refresh} />;
  const m = profile.data;
  if (!m) return null;
  return (
    <>
      {!personal && (
        <Link href="/members" className="text-link back-link">
          <ArrowLeft size={15} />
          All members
        </Link>
      )}
      <div className="profile-hero">
        <span className="profile-avatar">
          {m.name
            .split(" ")
            .map((s: string) => s[0])
            .join("")}
        </span>
        <div>
          <span className="eyebrow">
            {personal ? "MY ACCOUNT" : `MEMBER #${m.id}`}
          </span>
          <h1>{m.name}</h1>
          <p>{m.goal}</p>
          <div className="profile-meta">
            <span>
              <Mail size={14} />
              {m.email}
            </span>
            <span>
              <UserRound size={14} />
              {m.trainer?.user.name || "No assigned trainer"}
            </span>
            <span>
              <CalendarDays size={14} />
              Joined {shortDate(m.joinedAt)}
            </span>
          </div>
        </div>
        <span className={"badge " + (m.active ? "green" : "neutral")}>
          {m.active ? "Registered" : "Deactivated"}
        </span>
      </div>
      <div className="report-charts">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MEMBERSHIP HISTORY</span>
              <h2>Plans & subscriptions</h2>
            </div>
            {me.data?.role === "ADMIN" && (
              <Link href="/subscriptions" className="text-link">
                Manage <ArrowLeft className="rotate-180" size={15} />
              </Link>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Period</th>
                  <th>Status</th>
                  {me.data?.role && me.data.role !== "TRAINER" && (
                    <th>Agreed price</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {m.subscriptions.map((s: Row) => (
                  <tr key={s.id}>
                    <td>{s.package.name}</td>
                    <td>
                      {shortDate(s.startsAt)} – {shortDate(s.endsAt)}
                    </td>
                    <td>
                      <span className="badge neutral">
                        {s.status === "CANCELLED"
                          ? "Cancelled"
                          : s.payment?.status === "PENDING"
                            ? "Payment pending"
                            : s.endsAt.slice(0, 10) <
                                new Date().toISOString().slice(0, 10)
                              ? "Expired"
                              : s.startsAt.slice(0, 10) >
                                  new Date().toISOString().slice(0, 10)
                                ? "Scheduled"
                                : "Active"}
                      </span>
                    </td>
                    {me.data?.role && me.data.role !== "TRAINER" && (
                      <td>{money(s.price)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!m.subscriptions.length && <Empty />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PERSONAL PROGRESS</span>
              <h2>Body weight history</h2>
            </div>
          </div>
          {progress.error ? (
            <p className="error-banner">{progress.error}</p>
          ) : progress.loading ? (
            <Loading />
          ) : (
            <Chart
              data={[...(progress.data || [])].reverse().map((p) => ({
                label: p.date.slice(0, 10),
                value: p.weightKg,
              }))}
            />
          )}
          <p className="panel-footnote">
            Recorded weight in kg. Measurements are self-reported demonstration
            data.
          </p>
        </section>
      </div>
      <div className="report-charts">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR NEXT SESSION</span>
              <h2>Assigned workout plans</h2>
            </div>
          </div>
          <div className="plan-list">
            {m.assignments.map((a: Row) => (
              <div key={a.planId}>
                <Dumbbell size={20} />
                <div>
                  <h3>{a.plan.name}</h3>
                  <p>
                    {a.plan.goal} · {a.plan.durationWeeks} weeks
                  </p>
                  <small>
                    {a.plan.exercises
                      .map(
                        (e: Row) => `${e.exercise.name}: ${e.sets} × ${e.reps}`,
                      )
                      .join(" · ")}
                  </small>
                </div>
              </div>
            ))}
            {!m.assignments.length && <Empty />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SHOWING UP</span>
              <h2>Recent attendance</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {m.attendance.map((a: Row) => (
                  <tr key={a.date}>
                    <td>{shortDate(a.date)}</td>
                    <td>
                      {a.checkOut
                        ? Math.round(
                            (+new Date(a.checkOut) - +new Date(a.checkIn)) /
                              60000,
                          ) + " min"
                        : "—"}
                    </td>
                    <td>{a.checkOut ? "Completed" : "Checked in"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!m.attendance.length && <Empty />}
          </div>
        </section>
      </div>
      <section className="panel report-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">WORKOUT HISTORY</span>
            <h2>Every session tells a story</h2>
          </div>
          <Link href="/workouts" className="text-link">
            Workout studio <Dumbbell size={15} />
          </Link>
        </div>
        {workouts.error ? (
          <div className="error-banner">{workouts.error}</div>
        ) : workouts.loading ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Exercises</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {workouts.data?.map((w: Row) => (
                  <tr key={w.id}>
                    <td>{shortDate(w.date)}</td>
                    <td>{w.durationMinutes} min</td>
                    <td>{w.entries.length}</td>
                    <td>{w.notes || "—"}</td>
                    <td>
                      <span className="badge green">{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!workouts.data?.length && <Empty />}
          </div>
        )}
      </section>
    </>
  );
}
