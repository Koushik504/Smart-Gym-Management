"use client";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Chart } from "./charts";
import { useData, money, shortDate, type Row } from "./data";
export function Dashboard() {
  const { data, error, loading, refresh } = useData("dashboard");
  const me = useData("me");
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  if (!data) return null;
  const m = data.metrics;
  const cards = [
    {
      label: "Total members",
      value: m.totalMembers,
      icon: Users,
      caption: "Currently registered",
      href: "/members",
    },
    {
      label: "Active memberships",
      value: m.activeMemberships,
      icon: ShieldCheck,
      caption: `${m.expiredMembers} expired memberships`,
      href: "/subscriptions",
    },
    {
      label: me.data?.role === "ADMIN" ? "Monthly revenue" : "Assigned members",
      value:
        me.data?.role === "ADMIN" ? money(m.monthlyRevenue) : m.totalMembers,
      icon: CreditCard,
      caption:
        me.data?.role === "ADMIN"
          ? "Paid transactions this month"
          : "Your training community",
      href: me.data?.role === "ADMIN" ? "/payments" : "/members",
    },
    {
      label: "Check-ins today",
      value: m.todayAttendance,
      icon: Activity,
      caption: "Daily attendance · UTC",
      href: "/attendance",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DAILY PULSE</span>
          <h1>
            Overview<span className="heading-dot">.</span>
          </h1>
          <p>
            Welcome back, {me.data?.name.split(" ")[0] || "there"}. Let’s keep
            your gym moving.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={refresh}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <span className="date-chip">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </span>
          <Link className="button primary" href="/members">
            <Plus size={17} />{" "}
            {me.data?.role === "ADMIN" ? "Add member" : "View members"}
          </Link>
        </div>
      </div>
      <div className="stat-grid">
        {cards.map((c, i) => (
          <Link
            href={
              c.href === "/subscriptions" && me.data?.role !== "ADMIN"
                ? "/members"
                : c.href
            }
            className="stat-card"
            key={c.label}
          >
            <div className="stat-top">
              <span>{c.label}</span>
              <span className={"stat-icon tone-" + i}>
                <c.icon size={18} />
              </span>
            </div>
            <strong className="stat-number">{c.value}</strong>
            <div className="stat-caption">
              <span className="tiny-dot" />
              {c.caption}
              <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {me.data?.role === "ADMIN"
                  ? "FINANCIAL HEALTH"
                  : "MEMBER ENGAGEMENT"}
              </span>
              <h2>
                {me.data?.role === "ADMIN"
                  ? "Revenue overview"
                  : "Attendance overview"}
              </h2>
            </div>
            <span className="subtle-pill">
              {me.data?.role === "ADMIN" ? "Last 6 months" : "Last 30 days"}
            </span>
          </div>
          <div className="chart-summary">
            <strong>
              {me.data?.role === "ADMIN"
                ? money(
                    data.charts.revenue.reduce(
                      (s: number, r: Row) => s + Number(r.value),
                      0,
                    ),
                  )
                : data.charts.attendance.reduce(
                    (s: number, r: Row) => s + Number(r.value),
                    0,
                  )}
            </strong>
            <span>
              <span className="legend-dot" />{" "}
              {me.data?.role === "ADMIN"
                ? "Recorded revenue"
                : "Recorded check-ins"}
            </span>
          </div>
          <Chart
            data={
              me.data?.role === "ADMIN"
                ? data.charts.revenue
                : data.charts.attendance
            }
          />
        </section>
        <section className="panel membership-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">THE BIG PICTURE</span>
              <h2>Membership mix</h2>
            </div>
            <ShieldCheck size={19} className="muted" />
          </div>
          <div className="donut-wrap">
            <Chart data={data.charts.distribution} type="pie" />
            <div className="donut-center">
              <strong>{m.activeMemberships}</strong>
              <span>active members</span>
            </div>
          </div>
          <div className="chart-legend">
            {data.charts.distribution.map((r: Row, i: number) => (
              <div key={r.label}>
                <span
                  style={{
                    background: ["#256f54", "#b9e67a", "#79b3a4"][i % 3],
                  }}
                />
                {r.label}
                <strong>{Number(r.value)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SHOWING UP, GETTING STRONGER</span>
              <h2>Attendance trends</h2>
            </div>
            <Link className="text-link" href="/attendance">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          <Chart data={data.charts.attendance} type="bar" />
        </section>
        <section className="panel focus-panel">
          <span className="eyebrow">A LITTLE ATTENTION GOES A LONG WAY</span>
          <h2>Your gym, in focus.</h2>
          <p>Turn everyday data into the next right action.</p>
          <Link href="/reports">
            <span className="focus-icon">
              <Clock3 size={19} />
            </span>
            <div>
              <strong>{data.retentionCount} members to reconnect with</strong>
              <small>Expiry and attendance insights</small>
            </div>
            <ArrowUpRight size={18} />
          </Link>
          {me.data?.role === "ADMIN" && (
            <>
              <Link href="/payments">
                <span className="focus-icon amber">
                  <CreditCard size={19} />
                </span>
                <div>
                  <strong>{m.pendingPayments} pending payments</strong>
                  <small>{money(m.pendingAmount)} to follow up</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
              <Link href="/equipment">
                <span className="focus-icon">
                  <Settings2 size={19} />
                </span>
                <div>
                  <strong>{m.maintenanceAlerts} maintenance alerts</strong>
                  <small>{m.totalTrainers} trainers on your team</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            </>
          )}
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ON THE GYM FLOOR</span>
              <h2>Recent check-ins</h2>
            </div>
            <Link href="/attendance" className="text-link">
              Attendance <ArrowRight size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Date</th>
                  <th>Check-in · UTC</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r: Row) => (
                  <tr key={r.memberId + "-" + r.date}>
                    <td>
                      <span className="table-person">
                        <span className="mini-avatar">{r.member.name[0]}</span>
                        {r.member.name}
                      </span>
                    </td>
                    <td>{shortDate(r.date)}</td>
                    <td>
                      {new Date(r.checkIn).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td>
                      <span
                        className={
                          "badge " + (r.checkOut ? "neutral" : "green")
                        }
                      >
                        {r.checkOut ? (
                          <Check size={12} />
                        ) : (
                          <span className="tiny-dot" />
                        )}
                        {r.checkOut ? "Completed" : "In the gym"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.recent.length && <Empty />}
          </div>
        </section>
        <section className="panel growth-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">BUILDING YOUR COMMUNITY</span>
              <h2>Member growth</h2>
            </div>
            <ArrowDownRight size={18} className="muted" />
          </div>
          <Chart data={data.charts.growth} type="bar" />
        </section>
      </div>
      <div className="data-note">
        <span className="live-dot" /> Live database records <span>·</span>{" "}
        Synthetic demonstration seed is labelled in setup documentation{" "}
        <span>·</span>{" "}
        <Link href="/reports">
          Explore your insights <ArrowUpRight size={13} />
        </Link>
      </div>
    </>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="empty-state">
      <h2>We couldn’t load this view</h2>
      <p role="alert">{message}</p>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
export function Empty({
  message = "Add your first record or adjust the filters.",
}: {
  message?: string;
}) {
  return (
    <div className="empty-state">
      <Users size={28} />
      <h3>No records yet</h3>
      <p>{message}</p>
    </div>
  );
}
