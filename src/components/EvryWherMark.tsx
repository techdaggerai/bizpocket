'use client';

/**
 * EvryWherMark — the Evrywher wordmark with brand typography.
 * EVRY: uppercase, system-ui, weight 450, indigo
 * wher: lowercase, Georgia serif, italic, amber
 */

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<Size, { evry: string; wher: string; spacing: string }> = {
  xs:   { evry: 'text-[10px]', wher: 'text-[13px]', spacing: '2px' },
  sm:   { evry: 'text-[12px]', wher: 'text-[15px]', spacing: '3px' },
  md:   { evry: 'text-[14px]', wher: 'text-[18px]', spacing: '4px' },
  lg:   { evry: 'text-[18px]', wher: 'text-[24px]', spacing: '5px' },
  hero: { evry: 'text-[32px]', wher: 'text-[44px]', spacing: '6px' },
};

interface Props {
  size?: Size;
  className?: string;
}

export default function EvryWherMark({ size = 'md', className = '' }: Props) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        className={`${s.evry} uppercase text-[#4F46E5] dark:text-[#818CF8]`}
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 450, letterSpacing: s.spacing }}
      >
        EVRY
      </span>
      <span
        className={`${s.wher} text-[#F59E0B] italic`}
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400 }}
      >
        wher
      </span>
    </span>
  );
}
