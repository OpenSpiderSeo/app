/**
 * Empty-state marks for Echo Lattice — pulse / lattice / web / blank / error.
 */
type ArtKind = 'pulse' | 'blade' | 'scroll' | 'web' | 'error' | 'torii' | 'saya' | 'hanko';

export function EmptyStateArt({
  kind,
  size = 120,
  className = '',
}: {
  kind: ArtKind;
  size?: number;
  className?: string;
}) {
  const ink = 'var(--os-ink)';
  const mute = 'var(--os-faint)';
  const accent = 'var(--os-accent)';

  const resolved =
    kind === 'torii' ? 'pulse' : kind === 'saya' ? 'blade' : kind === 'hanko' ? 'error' : kind;

  if (resolved === 'pulse') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="48" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.25" />
        <circle cx="60" cy="60" r="30" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.45" />
        <circle cx="60" cy="60" r="12" stroke={accent} strokeWidth="2" fill="none" />
        <circle cx="60" cy="60" r="4" fill={accent} />
      </svg>
    );
  }

  if (resolved === 'blade') {
    return (
      <svg className={className} width={size} height={size * 0.4} viewBox="0 0 160 56" aria-hidden>
        <rect x="16" y="22" width="112" height="10" rx="2" fill={ink} opacity="0.35" />
        <rect x="128" y="18" width="20" height="18" rx="2" fill={accent} />
      </svg>
    );
  }

  if (resolved === 'scroll') {
    return (
      <svg className={className} width={size} height={size * 0.7} viewBox="0 0 140 90" aria-hidden>
        <rect x="22" y="16" width="96" height="58" rx="6" fill="var(--os-panel-solid)" stroke={ink} strokeWidth="1.5" opacity="0.9" />
        <path d="M36 34h68M36 46h56M36 58h40" stroke={mute} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (resolved === 'error') {
    return (
      <svg className={className} width={size * 0.55} height={size * 0.55} viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="26" stroke="var(--os-bad)" strokeWidth="2.5" fill="none" />
        <path d="M32 18v20M32 44v4" stroke="var(--os-bad)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} width={size} height={size * 0.75} viewBox="0 0 140 100" aria-hidden>
      <circle cx="70" cy="50" r="3" fill={accent} />
      <path
        d="M70 50 L28 18 M70 50 L112 20 M70 50 L18 72 M70 50 L122 74"
        stroke={ink}
        strokeWidth="1.2"
        opacity="0.45"
      />
      <path d="M38 28 Q70 42 102 30" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M32 64 Q70 54 108 68" stroke={mute} strokeWidth="1" fill="none" strokeDasharray="4 3" />
    </svg>
  );
}
