import React from 'react';
import { motion } from 'motion/react';
import { Card, Suit } from '../poker/types';
import { SUIT_SYMBOLS } from '../poker/evaluator';

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  isWinning?: boolean;
  fourColor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  delay?: number;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  isWinning = false,
  fourColor = true,
  size = 'md',
  className = '',
  delay = 0,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md shadow',
    md: 'w-14 h-20 text-sm rounded-lg shadow-md',
    lg: 'w-18 h-26 text-base rounded-xl shadow-lg',
  };

  if (faceDown || !card) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.25, delay }}
        className={`relative ${sizeClasses[size]} bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/40 flex items-center justify-center select-none overflow-hidden ${className}`}
      >
        <div className="absolute inset-1 rounded border border-indigo-400/20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:6px_6px] opacity-40" />
        <div className="w-5 h-5 rounded-full border border-amber-400/30 flex items-center justify-center text-amber-400/40 text-[10px] font-bold">
          ♠
        </div>
      </motion.div>
    );
  }

  const getRankLabel = (rank: number): string => {
    if (rank === 14) return 'A';
    if (rank === 13) return 'K';
    if (rank === 12) return 'Q';
    if (rank === 11) return 'J';
    return rank.toString();
  };

  const getSuitColor = (suit: Suit, fourColorDeck: boolean): string => {
    if (!fourColorDeck) {
      return suit === 'hearts' || suit === 'diamonds'
        ? 'text-rose-600'
        : 'text-slate-900';
    }
    switch (suit) {
      case 'hearts':
        return 'text-rose-600';
      case 'spades':
        return 'text-slate-900';
      case 'diamonds':
        return 'text-sky-600';
      case 'clubs':
        return 'text-emerald-700';
    }
  };

  const suitColor = getSuitColor(card.suit, fourColor);
  const symbol = SUIT_SYMBOLS[card.suit];
  const rankLabel = getRankLabel(card.rank);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={`relative ${sizeClasses[size]} bg-white text-slate-900 border select-none font-bold transition-all duration-200 overflow-hidden flex flex-col justify-between p-1 ${
        isWinning
          ? 'border-amber-400 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-amber-500/30 shadow-lg scale-105'
          : 'border-slate-300'
      } ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`leading-none flex flex-col items-center self-start ${suitColor}`}>
        <span className="font-extrabold tracking-tight">{rankLabel}</span>
        <span className="text-[10px] -mt-0.5">{symbol}</span>
      </div>

      {/* Center Watermark Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center ${suitColor} pointer-events-none`}>
        <span className={size === 'sm' ? 'text-lg opacity-80' : size === 'lg' ? 'text-4xl opacity-90' : 'text-2xl opacity-85'}>
          {symbol}
        </span>
      </div>

      {/* Bottom Right Inverted Rank & Suit */}
      <div className={`leading-none flex flex-col items-center self-end rotate-180 ${suitColor}`}>
        <span className="font-extrabold tracking-tight">{rankLabel}</span>
        <span className="text-[10px] -mt-0.5">{symbol}</span>
      </div>
    </motion.div>
  );
};
