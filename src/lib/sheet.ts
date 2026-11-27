/**
 * Parses rows pasted from Excel/Google Sheets (tab-separated) or a CSV file.
 * The first row is the header; keys are lower-cased with spaces turned into underscores.
 */
export function parseSheet(text: string): { header: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) return { header: [], rows: [] };
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => (delim === "\t" ? line.split("\t") : splitCsv(line));
  const header = split(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const cells = split(line);
    const r: Record<string, string> = {};
    header.forEach((h, i) => {
      const v = (cells[i] ?? "").trim();
      if (v !== "") r[h] = v;
    });
    return r;
  });
  return { header, rows };
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
