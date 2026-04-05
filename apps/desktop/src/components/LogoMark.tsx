type LogoMarkProps = {
  size?: number;
};

export function LogoMark({ size = 28 }: LogoMarkProps) {
  const id = "sm-logo-grad";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(205 60% 45%)" />
          <stop offset="100%" stopColor="hsl(205 70% 62%)" />
        </linearGradient>
      </defs>
      <path
        d="M21 5c-3.5 0-6 1.2-7.8 3.2C11.4 10.2 10.5 13 12 15c1.5 2 4.5 3 7.5 4.2 2.2.9 3.5 2 3.5 3.8 0 2.5-2.8 4-5.5 4H11"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
