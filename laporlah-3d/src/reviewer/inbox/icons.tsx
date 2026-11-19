import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 14.2s4.6-3.9 4.6-7.6a4.6 4.6 0 1 0-9.2 0c0 3.7 4.6 7.6 4.6 7.6Z" />
      <circle cx="8" cy="6.5" r="1.6" />
    </Svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.2" y="3.2" width="11.6" height="10.6" rx="2" />
      <path d="M2.2 6.6h11.6M5.4 1.8v2.4M10.6 1.8v2.4" />
    </Svg>
  );
}

export function StackIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.2" y="2.2" width="8.6" height="8.6" rx="2" />
      <path d="M5.2 13.8h6.6a2 2 0 0 0 2-2V5.2" />
    </Svg>
  );
}

export function RankIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 13.6V8.8M8 13.6V2.8M13 13.6V6" />
    </Svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 2.2 7 9.2M14 2.2l-4.4 11.6-2.6-4.6-4.6-2.6L14 2.2Z" />
    </Svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 3 5 8l5 5" />
    </Svg>
  );
}
