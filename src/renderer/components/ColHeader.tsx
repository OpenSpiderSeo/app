/** Table column label with optional SEO specialist hint (native title tooltip). */
export function ColHeader({ label, hint }: { label: string; hint?: string }) {
  if (!hint) return <>{label}</>;
  return (
    <span className="col-header-hint" title={hint}>
      {label}
    </span>
  );
}
