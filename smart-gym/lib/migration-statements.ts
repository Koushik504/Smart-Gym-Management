// Controlled SQL files only. This parser supports the DELIMITER form used by
// our checked-in migrations; it is not a parser for arbitrary user SQL.
export function statements(source: string) {
  let delimiter = ";",
    pending = "";
  const out: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*--/.test(line) || !line.trim()) continue;
    const match = line.match(/^DELIMITER\s+(\S+)/i);
    if (match) {
      if (pending.trim()) throw new Error("Unterminated SQL");
      delimiter = match[1];
      continue;
    }
    pending += line + "\n";
    if (pending.trimEnd().endsWith(delimiter)) {
      out.push(pending.trimEnd().slice(0, -delimiter.length));
      pending = "";
    }
  }
  if (pending.trim()) throw new Error("Unterminated SQL");
  return out;
}
