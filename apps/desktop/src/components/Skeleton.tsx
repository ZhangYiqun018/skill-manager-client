type SkeletonProps = {
  width?: string;
  height?: string;
  radius?: string;
};

export function Skeleton({ width, height, radius }: SkeletonProps) {
  return (
    <div
      style={{
        width: width ?? "100%",
        height: height ?? "1em",
        borderRadius: radius ?? "var(--sm-radius-sm)",
        background: "var(--sm-surface-hover)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}
