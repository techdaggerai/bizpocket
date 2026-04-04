'use client';

/**
 * EvryWherMark — the Evrywher wordmark with Outfit 600 typography.
 * Evry: Outfit 600, indigo
 * wher: Outfit 600, amber
 */

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<Size, string> = {
  xs:   'text-[12px]',
  sm:   'text-[15px]',
  md:   'text-[20px]',
  lg:   'text-[28px]',
  hero: 'text-[42px]',
};

interface Props {
  size?: Size;
  className?: string;
}

export default function EvryWherMark({ size = 'md', className = '' }: Props) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-baseline ${className}`} style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
      <span className={`${s} text-[#4F46E5] dark:text-[#818CF8]`}>Evry</span>
      <span className={`${s} text-[#F59E0B]`}>wher</span>
    </span>
  );
}
