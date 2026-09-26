export type SkeletonProps = {
  height?: number | string;
  width?: number | string;
  radius?: string;
  className?: string;
};

/** Primitiva universal de loading da casa (a classe .skeleton já existia). */
export function Skeleton({
  height = 80,
  width = "100%",
  radius = "var(--radius)",
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      aria-hidden
      style={{ height, width, borderRadius: radius }}
    />
  );
}

export type SkeletonListProps = { count?: number; height?: number; gap?: number };

export function SkeletonList({ count = 3, height = 80, gap = 12 }: SkeletonListProps) {
  return (
    <div style={{ display: "grid", gap }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

export default Skeleton;
