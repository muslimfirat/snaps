import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`bg-[#222533]/80 animate-pulse rounded-xl transition-colors duration-150 ${className}`}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#1B1D27] border border-[#2D3245] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-36 h-4 rounded" />
            <Skeleton className="w-24 h-3 rounded" />
          </div>
        </div>
        <Skeleton className="w-20 h-7 rounded-lg" />
      </div>
      <Skeleton className="w-full h-16 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="w-full h-12 rounded-xl" />
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>
    </div>
  );
};
