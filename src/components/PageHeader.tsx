'use client';

import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  backPath?: string;
  rightAction?: React.ReactNode;
}

export default function PageHeader({ title, backPath, rightAction }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  return (
    <div className="sticky top-0 z-40 flex items-center h-14 px-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <button
        onClick={handleBack}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
        aria-label="Go back"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-200">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white ml-1 truncate">{title}</h1>
      {rightAction && <div className="ml-auto shrink-0">{rightAction}</div>}
    </div>
  );
}
