import React from 'react';

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  size = 'md',
  showLabel = true,
}) => {
  if (amount <= 0) return null;

  // Determine primary chip color tier
  const getChipStyle = (val: number) => {
    if (val >= 5000) return 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/30';
    if (val >= 1000) return 'bg-purple-600 text-white border-purple-400 shadow-purple-500/30';
    if (val >= 500) return 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30';
    if (val >= 100) return 'bg-slate-900 text-amber-300 border-amber-500/50 shadow-slate-950/50';
    if (val >= 25) return 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30';
    if (val >= 5) return 'bg-rose-600 text-white border-rose-400 shadow-rose-500/30';
    return 'bg-slate-200 text-slate-900 border-slate-400 shadow-slate-500/20';
  };

  const formattedAmount =
    amount >= 1000000
      ? `${(amount / 1000000).toFixed(1)}M`
      : amount >= 1000
      ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
      : amount.toLocaleString();

  const chipClass = getChipStyle(amount);

  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      <div className="relative flex items-center">
        {/* Layered visual stack */}
        <div
          className={`relative rounded-full border-2 border-dashed flex items-center justify-center font-black ${chipClass} ${
            size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'
          } shadow-md`}
        >
          <div className="w-2.5 h-2.5 rounded-full border border-white/40 flex items-center justify-center" />
        </div>
      </div>
      {showLabel && (
        <span className={`font-mono font-bold text-amber-200 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ${formattedAmount}
        </span>
      )}
    </div>
  );
};
