import type { SVGProps } from 'react';

export type IconName = 'send' | 'search' | 'plus' | 'settings' | 'check';

interface IconProps {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 20 }: IconProps) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'send') return <svg {...common}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === 'settings') return <svg {...common}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" transform="translate(-1 -1)"/></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;

  return null;
}
