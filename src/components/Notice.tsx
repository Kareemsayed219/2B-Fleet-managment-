export function Notice({ kind, children }: { kind: "error" | "ok" | "info"; children: React.ReactNode }) {
  const color = kind === "error" ? "border-danger text-danger" : kind === "ok" ? "border-ok text-ok" : "border-border text-muted";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${color}`}>
      {children}
    </p>
  );
}
