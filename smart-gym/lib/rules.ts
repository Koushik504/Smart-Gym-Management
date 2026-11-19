export function day(value = new Date()) {
  return new Date(value.toISOString().slice(0, 10) + "T00:00:00.000Z");
}
export function retentionRule(
  daysToExpiry: number | null,
  recent: number,
  previous: number,
) {
  const reasons: string[] = [];
  if (daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 14)
    reasons.push("Membership expires within 14 days");
  if (daysToExpiry !== null && daysToExpiry < 0)
    reasons.push("Membership expired");
  if (recent === 0) reasons.push("No check-ins in the last 14 days");
  else if (previous >= 2 && recent <= previous / 2)
    reasons.push("Attendance fell by at least 50%");
  return reasons;
}
export function progressRule(
  sessions: number,
  completed: number,
  latestVolume: number,
  previousVolume: number,
) {
  const rate = sessions ? Math.round((completed / sessions) * 100) : 0;
  return {
    completionRate: rate,
    volumeChange:
      previousVolume > 0
        ? Math.round(((latestVolume - previousVolume) / previousVolume) * 100)
        : null,
    recommendation:
      sessions < 3
        ? "Build consistency: aim for three logged sessions before increasing workload."
        : rate < 70
          ? "Choose a beginner conditioning plan and reduce session complexity."
          : "Consistency is strong. Review a strength plan with your trainer before increasing load.",
  };
}
