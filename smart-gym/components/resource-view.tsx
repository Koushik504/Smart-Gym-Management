"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api, useData, type Row, money, shortDate, isoToday } from "./data";
import { configs, type Field } from "./resource-config";
import { Empty, ErrorState, Loading } from "./dashboard";
import { canAccess, mutationPath, type AppRole } from "@/lib/permissions";
const studio = ["workouts", "plans", "assignments", "exercises", "progress"];
export function ResourceView({
  resource,
  role,
}: {
  resource: string;
  role: AppRole;
}) {
  const admin = role === "ADMIN";
  const [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [status, setStatus] = useState(""),
    [memberId, setMemberId] = useState("");
  const [modal, setModal] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const baseConfig =
    resource === "payments"
      ? {
          title: "Payments",
          kicker: "EVERY TRANSACTION, ACCOUNTED FOR",
          description:
            "Monitor paid and pending transactions. Enrollment creates one payment per subscription.",
          singular: "payment",
          fields: [],
        }
      : configs[resource];
  const config =
    role === "USER"
      ? {
          ...baseConfig,
          title:
            (
              {
                subscriptions: "My memberships",
                payments: "My payments",
                attendance: "My attendance",
                workouts: "My workouts",
                progress: "My progress",
                plans: "My workout plans",
              } as Record<string, string>
            )[resource] || baseConfig.title,
          kicker: "YOUR PERSONAL GYM SPACE",
          description:
            resource === "exercises"
              ? "Browse the exercise catalog for your training."
              : "View and track your own gym records.",
        }
      : baseConfig;
  const query = new URLSearchParams({
    q,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(status ? { status } : {}),
    ...(memberId ? { memberId } : {}),
  });
  const data = useData<Row[]>(resource + "?" + query.toString()),
    lookups = useData("lookups");
  const canCreate =
    canAccess(role, resource, "create") && resource !== "payments";
  const canEdit =
    configs[resource]?.editable && canAccess(role, resource, "update");
  const canDelete =
    configs[resource]?.deletable && canAccess(role, resource, "delete");
  async function action(path: string, method: string, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(mutationPath(role, path), { method });
      setNotice("Change saved to the database.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const dateFilter = [
    "payments",
    "attendance",
    "subscriptions",
    "maintenance",
    "workouts",
    "progress",
  ].includes(resource);
  const statuses: Record<string, string[]> = {
    members: ["ACTIVE", "INACTIVE"],
    subscriptions: ["ACTIVE", "EXPIRED", "CANCELLED"],
    payments: ["PAID", "PENDING"],
    equipment: ["AVAILABLE", "MAINTENANCE", "RETIRED"],
  };
  function exportRows() {
    if (!data.data) return;
    const fields = columns(resource);
    const clean = (s: unknown) =>
      '"' +
      String(s ?? "")
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      fields.map((c) => clean(c.label)).join(","),
      ...data.data.map((row) =>
        fields.map((c) => clean(c.value(row))).join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = resource + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{config.kicker}</span>
          <h1>
            {config.title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          <button
            className="button"
            disabled={data.loading}
            onClick={() => {
              data.refresh();
              lookups.refresh();
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            className="button"
            onClick={exportRows}
            disabled={!data.data?.length}
          >
            <Download size={16} />
            Export
          </button>
          {canCreate && (
            <button className="button primary" onClick={() => setModal({})}>
              <Plus size={17} />
              Add {config.singular}
            </button>
          )}
          {resource === "payments" && admin && (
            <Link className="button primary" href="/subscriptions">
              <Plus size={17} />
              New enrollment
            </Link>
          )}
        </div>
      </div>
      {studio.includes(resource) && (
        <div className="tab-bar">
          {studio
            .filter(
              (r) =>
                canAccess(role, r, "read") &&
                (role !== "USER" || r !== "assignments"),
            )
            .map((r) => (
              <Link
                key={r}
                className={r === resource ? "active" : ""}
                href={"/" + r}
              >
                {r === "workouts"
                  ? "Session history"
                  : r === "progress"
                    ? "Progress tracking"
                    : r === "exercises"
                      ? "Exercise catalog"
                      : r[0].toUpperCase() + r.slice(1)}
              </Link>
            ))}
        </div>
      )}
      {["equipment", "maintenance"].includes(resource) && (
        <div className="tab-bar">
          <Link
            href="/equipment"
            className={resource === "equipment" ? "active" : ""}
          >
            Inventory
          </Link>
          <Link
            href="/maintenance"
            className={resource === "maintenance" ? "active" : ""}
          >
            Maintenance history
          </Link>
        </div>
      )}
      {["subscriptions", "packages"].includes(resource) && (
        <div className="tab-bar">
          <Link
            href="/subscriptions"
            className={resource === "subscriptions" ? "active" : ""}
          >
            Member subscriptions
          </Link>
          <Link
            href="/packages"
            className={resource === "packages" ? "active" : ""}
          >
            Packages & pricing
          </Link>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-banner" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      <section className="panel resource-panel">
        <div className="resource-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search records"
              placeholder={"Search " + config.title.toLowerCase() + "…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            {statuses[resource] && (
              <label className="sr-only" htmlFor="status-filter">
                Filter status
              </label>
            )}
            {statuses[resource] && (
              <select
                id="status-filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {statuses[resource].map((s) => (
                  <option key={s} value={s}>
                    {s.toLowerCase()}
                  </option>
                ))}
              </select>
            )}
            {dateFilter && (
              <>
                <label>
                  From
                  <input
                    aria-label="From date"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    aria-label="To date"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </>
            )}
            {[
              "attendance",
              "workouts",
              "progress",
              "payments",
              "subscriptions",
              "assignments",
            ].includes(resource) &&
              role !== "USER" && (
                <select
                  aria-label="Filter member"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  <option value="">All members</option>
                  {lookups.data?.members.map((m: Row) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            <Filter size={16} className="muted" />
          </div>
        </div>
        <div className="table-caption">
          <strong>{data.data?.length || 0} records</strong>
          <span>
            Showing up to 200 matching records · Export uses this view
            {data.updatedAt && (
              <span role="status">
                {" "}
                · Last refreshed{" "}
                {new Date(data.updatedAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                · Auto-refresh 15s
              </span>
            )}
          </span>
        </div>
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorState message={data.error} retry={data.refresh} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns(resource).map((c) => (
                    <th key={c.label}>{c.label}</th>
                  ))}
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.map((row: Row) => {
                  const key = recordKey(resource, row);
                  return (
                    <tr key={key}>
                      {columns(resource).map((c, i) => (
                        <td key={c.label}>
                          {i === 0 ? (
                            <span className="table-person">
                              {[
                                "members",
                                "trainers",
                                "workouts",
                                "progress",
                              ].includes(resource) && (
                                <span className="mini-avatar">
                                  {String(c.value(row))[0]}
                                </span>
                              )}
                              <strong>{c.value(row)}</strong>
                            </span>
                          ) : c.badge ? (
                            <span
                              className={
                                "badge " +
                                ([
                                  "ACTIVE",
                                  "PAID",
                                  "AVAILABLE",
                                  "COMPLETED",
                                ].includes(String(c.value(row)))
                                  ? "green"
                                  : "neutral")
                              }
                            >
                              {c.value(row)}
                            </span>
                          ) : (
                            c.value(row)
                          )}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          {resource === "members" && (
                            <Link
                              title="View member profile"
                              aria-label={"View " + row.name}
                              className="icon-button"
                              href={"/members/" + row.id}
                            >
                              <ArrowUpRight size={17} />
                            </Link>
                          )}
                          {canEdit && (
                            <button
                              className="icon-button"
                              aria-label={
                                "Edit " +
                                (row.name || row.memberName || "record")
                              }
                              onClick={() => setModal(row)}
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {resource === "payments" &&
                            admin &&
                            row.status === "PENDING" && (
                              <button
                                className="small-button"
                                disabled={busy}
                                onClick={() =>
                                  action("payments/" + row.id, "PATCH")
                                }
                              >
                                Mark paid
                              </button>
                            )}
                          {resource === "attendance" &&
                            canAccess(role, "attendance", "update") &&
                            !row.checkOut && (
                              <button
                                className="small-button"
                                disabled={busy}
                                onClick={() =>
                                  action("attendance/" + key, "PATCH")
                                }
                              >
                                Check out
                              </button>
                            )}
                          {canDelete && (
                            <button
                              disabled={
                                busy ||
                                (["members", "packages"].includes(resource) &&
                                  !row.active) ||
                                (resource === "subscriptions" &&
                                  row.status === "CANCELLED")
                              }
                              className="icon-button danger"
                              aria-label={"Remove " + (row.name || "record")}
                              onClick={() =>
                                action(
                                  resource + "/" + key,
                                  "DELETE",
                                  resource === "members"
                                    ? "Deactivate this member? Their history will be preserved."
                                    : resource === "subscriptions"
                                      ? "Cancel this subscription? Paid transactions remain recorded; this does not issue a refund."
                                      : "Remove or retire this record? Referenced history is protected.",
                                )
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!data.data?.length && (
              <Empty
                message={
                  role === "USER" && !canCreate
                    ? "No matching records are linked to your account. Your gym administrator manages these records."
                    : undefined
                }
              />
            )}
          </div>
        )}
      </section>
      {modal && (
        <Editor
          role={role}
          resource={resource}
          record={modal}
          lookups={lookups.data}
          lookupError={lookups.error}
          close={() => setModal(null)}
          saved={() => {
            setModal(null);
            setNotice("Record saved to the database.");
          }}
        />
      )}
    </>
  );
}
type Column = {
  label: string;
  value: (r: Row) => string | number;
  badge?: boolean;
};
const text = (v: unknown) => (v === null || v === undefined ? "—" : String(v));
const time = (v: unknown) =>
  v
    ? new Date(String(v)).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "—";
const memberState = (r: Row) => {
  if (!r.active) return "INACTIVE";
  const today = isoToday();
  const active = r.subscriptions?.some(
    (s: Row) =>
      s.status === "ACTIVE" &&
      s.payment?.status === "PAID" &&
      s.startsAt.slice(0, 10) <= today &&
      s.endsAt.slice(0, 10) >= today,
  );
  return active ? "ACTIVE" : "NO ACTIVE PLAN";
};
function columns(resource: string): Column[] {
  switch (resource) {
    case "members":
      return [
        { label: "Member", value: (r) => r.name },
        { label: "Email", value: (r) => r.email },
        {
          label: "Trainer",
          value: (r) => r.trainer?.user.name || "Unassigned",
        },
        { label: "Joined", value: (r) => shortDate(r.joinedAt) },
        { label: "Membership", value: memberState, badge: true },
      ];
    case "trainers":
      return [
        { label: "Trainer", value: (r) => r.user.name },
        { label: "Email", value: (r) => r.user.email },
        { label: "Specialty", value: (r) => r.specialty },
        { label: "Members", value: (r) => r._count.members },
        { label: "Plans", value: (r) => r._count.plans },
      ];
    case "packages":
      return [
        { label: "Package", value: (r) => r.name },
        { label: "Price", value: (r) => money(r.price) },
        { label: "Duration", value: (r) => r.durationDays + " days" },
        {
          label: "Availability",
          value: (r) => (r.active ? "ACTIVE" : "INACTIVE"),
          badge: true,
        },
      ];
    case "subscriptions":
      return [
        { label: "Member", value: (r) => r.member.name },
        { label: "Package", value: (r) => r.package.name },
        { label: "Starts", value: (r) => shortDate(r.startsAt) },
        { label: "Ends", value: (r) => shortDate(r.endsAt) },
        { label: "Agreed price", value: (r) => money(r.price) },
        {
          label: "Status",
          value: (r) =>
            r.status === "CANCELLED"
              ? "CANCELLED"
              : r.endsAt.slice(0, 10) < isoToday()
                ? "EXPIRED"
                : r.payment?.status === "PENDING"
                  ? "PAYMENT PENDING"
                  : r.startsAt.slice(0, 10) > isoToday()
                    ? "SCHEDULED"
                    : "ACTIVE",
          badge: true,
        },
      ];
    case "payments":
      return [
        { label: "Member", value: (r) => r.subscription.member.name },
        { label: "Package", value: (r) => r.subscription.package.name },
        { label: "Amount", value: (r) => money(r.amount) },
        { label: "Method", value: (r) => r.method },
        { label: "Recorded", value: (r) => shortDate(r.createdAt) },
        { label: "Paid", value: (r) => shortDate(r.paidAt) },
        { label: "Status", value: (r) => r.status, badge: true },
      ];
    case "attendance":
      return [
        { label: "Member", value: (r) => r.member.name },
        { label: "Date", value: (r) => shortDate(r.date) },
        { label: "Check-in · UTC", value: (r) => time(r.checkIn) },
        { label: "Check-out · UTC", value: (r) => time(r.checkOut) },
        {
          label: "Status",
          value: (r) => (r.checkOut ? "COMPLETED" : "IN THE GYM"),
          badge: true,
        },
      ];
    case "equipment":
      return [
        { label: "Equipment", value: (r) => r.name },
        { label: "Quantity", value: (r) => r.quantity },
        { label: "Next service", value: (r) => shortDate(r.nextService) },
        { label: "Service records", value: (r) => r._count.maintenance },
        { label: "Status", value: (r) => r.status, badge: true },
      ];
    case "maintenance":
      return [
        { label: "Equipment", value: (r) => r.equipment.name },
        { label: "Service date", value: (r) => shortDate(r.performedAt) },
        { label: "Service details", value: (r) => r.description },
        { label: "Cost", value: (r) => money(r.cost) },
      ];
    case "exercises":
      return [
        { label: "Exercise", value: (r) => r.name },
        { label: "Muscle group", value: (r) => r.muscleGroup },
        { label: "Equipment", value: (r) => r.equipment?.name || "Bodyweight" },
        { label: "Sets", value: (r) => r.defaultSets },
        { label: "Reps", value: (r) => r.defaultReps },
      ];
    case "plans":
      return [
        { label: "Plan", value: (r) => r.name },
        { label: "Goal", value: (r) => r.goal },
        { label: "Trainer", value: (r) => r.trainer.user.name },
        { label: "Duration", value: (r) => r.durationWeeks + " weeks" },
        {
          label: "Exercises",
          value: (r) => r.exercises.map((e: Row) => e.exercise.name).join(", "),
        },
        { label: "Assigned", value: (r) => r._count.assignments },
      ];
    case "assignments":
      return [
        { label: "Member", value: (r) => r.member.name },
        { label: "Plan", value: (r) => r.plan.name },
        { label: "Assigned", value: (r) => shortDate(r.assignedAt) },
      ];
    case "workouts":
      return [
        { label: "Member", value: (r) => r.memberName },
        { label: "Date", value: (r) => shortDate(r.date) },
        { label: "Duration", value: (r) => r.durationMinutes + " min" },
        { label: "Exercises", value: (r) => r.entries.length },
        { label: "Notes", value: (r) => text(r.notes) },
        { label: "Completion", value: (r) => r.status, badge: true },
      ];
    case "progress":
      return [
        { label: "Member", value: (r) => r.memberName },
        { label: "Date", value: (r) => shortDate(r.date) },
        { label: "Weight", value: (r) => r.weightKg + " kg" },
        { label: "Waist", value: (r) => r.waistCm + " cm" },
        { label: "Goal", value: (r) => r.goal },
      ];
    default:
      return [];
  }
}
function recordKey(resource: string, row: Row) {
  return resource === "attendance"
    ? `${row.memberId}_${row.date.slice(0, 10)}`
    : resource === "assignments"
      ? `${row.memberId}-${row.planId}`
      : String(row.id);
}
function Editor({
  role,
  resource,
  record,
  lookups,
  lookupError,
  close,
  saved,
}: {
  role: AppRole;
  resource: string;
  record: Row;
  lookups: Row | null;
  lookupError: string;
  close: () => void;
  saved: () => void;
}) {
  const config = configs[resource],
    editing = Boolean(record.id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [entries, setEntries] = useState<Row[]>(
    record.entries ||
      record.exercises?.map((e: Row) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
      })) || [
        { exerciseId: "", sets: 3, reps: 12, weight: 0, completed: true },
      ],
  );
  const initial: Row = {
    ...(role === "USER" ? { memberId: lookups?.members[0]?.id } : {}),
    active: true,
    date: isoToday(),
    performedAt: isoToday(),
    defaultSets: 3,
    defaultReps: 12,
    durationWeeks: 8,
    durationMinutes: 45,
    ...record,
    ...(resource === "trainers" && record.user
      ? { name: record.user.name, email: record.user.email }
      : {}),
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget),
      body: Row = Object.fromEntries(form);
    for (const field of config.fields)
      if (field.type === "checkbox") body[field.key] = form.has(field.key);
    if (body.password === "") delete body.password;
    if (role === "USER") body.memberId = lookups?.members[0]?.id;
    if (resource === "subscriptions") body.requestKey = requestKey;
    if (resource === "plans")
      body.exercises = entries.map(({ exerciseId, sets, reps }) => ({
        exerciseId,
        sets,
        reps,
      }));
    if (resource === "workouts") body.entries = entries;
    try {
      await api(
        mutationPath(role, resource + (editing ? "/" + record.id : "")),
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const updateEntry = (index: number, key: string, value: unknown) =>
    setEntries((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-heading"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) close();
        }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              {editing ? "UPDATE RECORD" : "MAKE IT HAPPEN"}
            </span>
            <h2 id="editor-heading">
              {editing ? "Edit" : "Add"} {config.singular}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            disabled={busy}
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {(error || lookupError) && (
              <div className="error-banner" role="alert">
                {error || lookupError}
              </div>
            )}
            {!lookups && !lookupError ? (
              <Loading />
            ) : (
              <div className="form-grid">
                {config.fields
                  .filter(
                    (field) => role !== "USER" || field.key !== "memberId",
                  )
                  .map((field: Field) => {
                    const value = initial[field.key];
                    return (
                      <label
                        key={field.key}
                        className={
                          field.type === "textarea" ? "full-width" : ""
                        }
                      >
                        {field.label}
                        {field.optional && <small> optional</small>}
                        {field.type === "select" ? (
                          <select
                            name={field.key}
                            defaultValue={value ?? ""}
                            required={!field.optional}
                            disabled={
                              editing &&
                              ["workouts", "progress"].includes(resource) &&
                              field.key === "memberId"
                            }
                          >
                            <option value="">
                              {field.optional ? "None" : "Choose an option"}
                            </option>
                            {field.options?.map((s) => (
                              <option value={s} key={s}>
                                {s.toLowerCase()}
                              </option>
                            ))}
                            {field.source &&
                              lookups?.[field.source]?.map((r: Row) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                  {field.source === "packages"
                                    ? " · " +
                                      money(r.price) +
                                      " / " +
                                      r.durationDays +
                                      " days"
                                    : ""}
                                </option>
                              ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            name={field.key}
                            defaultValue={value || ""}
                            rows={3}
                            required={!field.optional}
                          />
                        ) : field.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            name={field.key}
                            defaultChecked={value ?? true}
                          />
                        ) : (
                          <input
                            name={field.key}
                            type={field.type || "text"}
                            defaultValue={
                              field.type === "password"
                                ? ""
                                : field.type === "date" && value
                                  ? String(value).slice(0, 10)
                                  : (value ?? "")
                            }
                            min={field.min}
                            step={field.step || "1"}
                            required={!field.optional}
                            autoComplete={
                              field.type === "password"
                                ? "new-password"
                                : undefined
                            }
                          />
                        )}
                        {editing &&
                          ["workouts", "progress"].includes(resource) &&
                          field.key === "memberId" && (
                            <input
                              type="hidden"
                              name="memberId"
                              value={record.memberId}
                            />
                          )}
                      </label>
                    );
                  })}
              </div>
            )}
            {["plans", "workouts"].includes(resource) && (
              <div className="exercise-editor">
                <div className="section-heading">
                  <h3>Session exercises</h3>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setEntries([
                        ...entries,
                        {
                          exerciseId: "",
                          sets: 3,
                          reps: 12,
                          weight: 0,
                          completed: true,
                        },
                      ])
                    }
                  >
                    <Plus size={14} /> Add exercise
                  </button>
                </div>
                {entries.map((entry, index) => (
                  <div className="exercise-entry" key={index}>
                    <label>
                      Exercise
                      <select
                        aria-label={"Exercise " + (index + 1)}
                        required
                        value={entry.exerciseId}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            "exerciseId",
                            Number(e.target.value),
                          )
                        }
                      >
                        <option value="">Choose movement</option>
                        {lookups?.exercises.map((e: Row) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {[
                      "sets",
                      "reps",
                      ...(resource === "workouts" ? ["weight"] : []),
                    ].map((key) => (
                      <label key={key}>
                        {key === "weight" ? "Weight (kg)" : key}
                        <input
                          aria-label={key + " " + (index + 1)}
                          type="number"
                          required
                          min={key === "weight" ? 0 : 1}
                          step={key === "weight" ? ".5" : "1"}
                          value={entry[key]}
                          onChange={(e) =>
                            updateEntry(index, key, Number(e.target.value))
                          }
                        />
                      </label>
                    ))}
                    {resource === "workouts" && (
                      <label className="checkbox-label">
                        Done
                        <input
                          type="checkbox"
                          aria-label={"Completed " + (index + 1)}
                          checked={entry.completed}
                          onChange={(e) =>
                            updateEntry(index, "completed", e.target.checked)
                          }
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={entries.length === 1}
                      onClick={() =>
                        setEntries(entries.filter((_, i) => i !== index))
                      }
                      aria-label={"Remove exercise " + (index + 1)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {resource === "subscriptions" && (
              <p className="form-note">
                Renewal starts after the latest non-cancelled subscription ends.
                Pending payment reserves the period but does not grant access.
                Retrying this form reuses its request key.
              </p>
            )}
            {resource === "trainers" && (
              <p className="form-note">
                A password is required for new trainers. Leave it empty when
                editing to keep the existing password.
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy || !lookups}>
              {busy
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Save " + config.singular}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
