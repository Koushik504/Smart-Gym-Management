"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api } from "./data";
const links = [
  { href: "dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "members", label: "Members", icon: Users },
  { href: "trainers", label: "Trainers", icon: UserRound, admin: true },
  {
    href: "subscriptions",
    label: "Memberships",
    icon: ShieldCheck,
    admin: true,
  },
  { href: "payments", label: "Payments", icon: CreditCard, admin: true },
  { href: "attendance", label: "Attendance", icon: CalendarCheck },
  { href: "workouts", label: "Workout studio", icon: Dumbbell },
  { href: "equipment", label: "Equipment", icon: Settings2, admin: true },
  { href: "reports", label: "Analytics & insights", icon: BarChart3 },
  { href: "packages", label: "Packages", icon: Package, admin: true },
];
const memberLinks = [
  { href: "my-account", label: "My account", icon: UserRound },
  { href: "subscriptions", label: "My memberships", icon: ShieldCheck },
  { href: "payments", label: "My payments", icon: CreditCard },
  { href: "attendance", label: "My attendance", icon: CalendarCheck },
  { href: "workouts", label: "My workouts", icon: Dumbbell },
  { href: "progress", label: "My progress", icon: Activity },
  { href: "plans", label: "My workout plans", icon: BarChart3 },
  { href: "exercises", label: "Exercise catalog", icon: Dumbbell },
];
export function Shell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [signingOut, setSigningOut] = useState(false);
  const personal = user.role === "USER";
  const visibleLinks = personal
    ? memberLinks
    : links.filter((l) => !l.admin || user.role === "ADMIN");
  async function signout() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await api("auth/logout", { method: "POST" });
      // A full navigation discards authenticated client/router state as well.
      window.location.replace("/login");
    } catch (e) {
      setError((e as Error).message);
      setSigningOut(false);
    }
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Link href={personal ? "/my-account" : "/dashboard"} className="brand">
          <span className="brand-symbol">
            <Activity size={24} />
          </span>
          <span>
            smart<span className="brand-light">gym</span>
            <small>MOVE FORWARD.</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="sidebar-content">
          <div className="nav-caption">
            {personal
              ? "MEMBER AREA"
              : user.role === "ADMIN"
                ? "ADMINISTRATION"
                : "TRAINER WORKSPACE"}
          </div>
          <nav>
            {visibleLinks.map((l) => (
              <Link
                onClick={() => setOpen(false)}
                href={"/" + l.href}
                key={l.href}
                className={path.startsWith("/" + l.href) ? "active" : ""}
              >
                <l.icon size={19} />
                <span>{l.label}</span>
                {path.startsWith("/" + l.href) && <ChevronRight size={15} />}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="live-dot" /> Every rep. Every record.
            <p>
              {personal
                ? "Your training, membership and progress in one place."
                : "A clearer view of your gym, powered by connected data."}
            </p>
            <Link href={personal ? "/progress" : "/reports"}>
              {personal ? "Track my progress" : "Explore insights"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "ADMIN"
                ? "Administrator"
                : personal
                  ? "Member"
                  : "Trainer"}
            </small>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            onClick={signout}
            disabled={signingOut}
          >
            <LogOut size={18} />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
          {error && (
            <p className="signout-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </aside>
      {open && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>
              {personal
                ? "Member area"
                : user.role === "ADMIN"
                  ? "Administration"
                  : "Trainer workspace"}
            </span>
            <ChevronRight size={14} />
            <strong>
              {visibleLinks.find((l) => path.startsWith("/" + l.href))?.label ||
                "Workout studio"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-tag">
              <span className="live-dot" /> Local workspace
            </span>
            <span className="top-avatar">{user.name[0]}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="page-footer">
          <span>SMART GYM · MANAGEMENT & WORKOUT ANALYTICS</span>
          <span>Built for better everyday operations.</span>
        </footer>
      </div>
    </div>
  );
}
