'use client';

interface SkeletonBaseProps {
  className?: string;
}

const shimmerClass = [
  'bg-[length:200%_100%]',
  'bg-[linear-gradient(90deg,var(--pm-surface-2)_25%,var(--pm-surface-3)_50%,var(--pm-surface-2)_75%)]',
  'animate-[shimmer_1.5s_ease-in-out_infinite]',
].join(' ');

export function Skeleton({ className = '' }: SkeletonBaseProps) {
  return (
    <div
      className={`${shimmerClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonText({ className = '' }: SkeletonBaseProps) {
  return <Skeleton className={`h-4 w-full rounded ${className}`} />;
}

export function SkeletonCircle({ className = '' }: SkeletonBaseProps) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

export function SkeletonCard({ className = '' }: SkeletonBaseProps) {
  return <Skeleton className={`h-[200px] rounded-xl ${className}`} />;
}

export function SkeletonButton({ className = '' }: SkeletonBaseProps) {
  return <Skeleton className={`h-10 w-[120px] rounded-[20px] ${className}`} />;
}

export function SkeletonTrustBar({ className = '' }: SkeletonBaseProps) {
  return <Skeleton className={`h-2 w-full rounded-full ${className}`} />;
}

export default Skeleton;
