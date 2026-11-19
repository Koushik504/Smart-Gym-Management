"use client";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/components/data";
import { useRouter } from "next/navigation";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const user = await api("auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
      });
      router.replace(user.role === "USER" ? "/my-account" : "/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <Activity />
          </span>
          <span>
            smart<span className="brand-light">gym</span>
          </span>
        </div>
        <span className="eyebrow light">A STRONGER WAY TO MANAGE</span>
        <h1>
          Better operations.
          <br />
          Stronger <em>members.</em>
        </h1>
        <p>
          Bring your people, memberships and workout progress into one connected
          workspace.
        </p>
        <div className="login-orbit">
          <DumbbellArt />
        </div>
        <div className="login-features">
          <span>
            <Users size={18} /> People first
          </span>
          <span>
            <BarChart3 size={18} /> Clear insights
          </span>
          <span>
            <ShieldCheck size={18} /> Secure by design
          </span>
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <span className="eyebrow">YOUR GYM, CONNECTED</span>
          <h2>Welcome back.</h2>
          <p>Sign in to your Smart Gym workspace.</p>
          <form onSubmit={submit}>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@yourgym.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>
            <button className="button primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-help">
            <ShieldCheck size={18} />
            <p>
              Access is managed by your gym administrator. Sessions expire after
              eight hours.
            </p>
          </div>
          <small>Smart Gym Management and Workout Analytics System</small>
        </div>
      </section>
    </main>
  );
}
function DumbbellArt() {
  return (
    <svg viewBox="0 0 400 240" aria-hidden="true">
      <g
        transform="translate(200 120) rotate(-25)"
        fill="none"
        stroke="currentColor"
      >
        <rect
          x="-70"
          y="-13"
          width="140"
          height="26"
          rx="8"
          fill="currentColor"
          opacity=".65"
        />
        <rect
          x="-105"
          y="-61"
          width="35"
          height="122"
          rx="12"
          strokeWidth="3"
        />
        <rect x="70" y="-61" width="35" height="122" rx="12" strokeWidth="3" />
        <rect x="-130" y="-43" width="25" height="86" rx="8" strokeWidth="3" />
        <rect x="105" y="-43" width="25" height="86" rx="8" strokeWidth="3" />
      </g>
      <circle
        cx="200"
        cy="120"
        r="108"
        stroke="currentColor"
        fill="none"
        opacity=".12"
      />
      <circle
        cx="200"
        cy="120"
        r="90"
        stroke="currentColor"
        fill="none"
        opacity=".12"
      />
    </svg>
  );
}
