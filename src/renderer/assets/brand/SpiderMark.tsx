/** OpenSpider mark — 8-spoke web lattice (geometric, not clan mon). */
export function SpiderMark({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
      <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="32" cy="32" r="2.5" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1="32"
            y1="32"
            x2={32 + Math.cos(rad) * 28}
            y2={32 + Math.sin(rad) * 28}
            stroke="currentColor"
            strokeWidth="1.25"
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}

/** @deprecated */
export { SpiderMark as MonKumo };
