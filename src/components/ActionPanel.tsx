import React, { useState, useEffect } from 'react';
import { LegalActions } from '../poker/types';
import { sound } from '../utils/sound';

interface ActionPanelProps {
  isTurn: boolean;
  legalActions: LegalActions | null;
  currentPot: number;
  bigBlind: number;
  onAction: (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => void;
  waitingForName?: string;
  turnSecondsLeft?: number | null;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  isTurn,
  legalActions,
  currentPot,
  bigBlind,
  onAction,
  waitingForName,
  turnSecondsLeft,
}) => {
  const [betAmount, setBetAmount] = useState<number>(0);

  const minVal = legalActions?.canRaise
    ? legalActions.minRaise
    : legalActions?.canBet
    ? legalActions.minBet
    : 0;

  const maxVal = legalActions?.canRaise
    ? legalActions.maxRaise
    : legalActions?.canBet
    ? legalActions.maxBet
    : 0;

  useEffect(() => {
    if (minVal > 0) {
      setBetAmount(minVal);
    }
  }, [minVal, isTurn]);

  if (!isTurn || !legalActions) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-3 text-slate-400 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>
            {waitingForName ? `Waiting for ${waitingForName} to act...` : 'Waiting for hand to progress...'}
          </span>
          {turnSecondsLeft !== null && turnSecondsLeft !== undefined && turnSecondsLeft > 0 && (
            <span className="font-mono text-amber-400 font-bold ml-2">
              ({turnSecondsLeft}s)
            </span>
          )}
        </div>
      </div>
    );
  }

  const handleFold = () => {
    sound.playFold();
    onAction('fold');
  };

  const handleCheck = () => {
    sound.playCheck();
    onAction('check');
  };

  const handleCall = () => {
    sound.playChip();
    onAction('call');
  };

  const handleBetRaise = () => {
    sound.playChip();
    if (betAmount >= maxVal) {
      onAction('all-in');
    } else if (legalActions.canRaise) {
      onAction('raise', betAmount);
    } else {
      onAction('bet', betAmount);
    }
  };

  const handleAllIn = () => {
    sound.playChip();
    onAction('all-in');
  };

  // Preset calculation
  const setPresetHalfPot = () => {
    const val = Math.max(minVal, Math.min(maxVal, Math.floor(currentPot * 0.5)));
    setBetAmount(val);
  };

  const setPresetPot = () => {
    const val = Math.max(minVal, Math.min(maxVal, currentPot));
    setBetAmount(val);
  };

  const setPresetBigBlinds = (multiplier: number) => {
    const val = Math.max(minVal, Math.min(maxVal, bigBlind * multiplier));
    setBetAmount(val);
  };

  const canRaiseOrBet = legalActions.canRaise || legalActions.canBet;

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
      {/* Top Slider & Presets Bar */}
      {canRaiseOrBet && maxVal > minVal && (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setBetAmount(minVal)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Min (${minVal})
            </button>
            <button
              onClick={() => setPresetBigBlinds(3)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              3x BB
            </button>
            {currentPot > 0 && (
              <>
                <button
                  onClick={setPresetHalfPot}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  1/2 Pot
                </button>
                <button
                  onClick={setPresetPot}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Pot (${currentPot})
                </button>
              </>
            )}
            <button
              onClick={() => setBetAmount(maxVal)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition"
            >
              Max (${maxVal})
            </button>
          </div>

          {/* Slider */}
          <div className="flex-1 flex items-center gap-3 w-full">
            <input
              type="range"
              min={minVal}
              max={maxVal}
              step={bigBlind}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center gap-1 font-mono text-sm bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 font-bold text-amber-400">
              <span>$</span>
              <input
                type="number"
                min={minVal}
                max={maxVal}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-16 bg-transparent text-right outline-none text-amber-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* FOLD */}
        <button
          onClick={handleFold}
          disabled={!legalActions.canFold}
          className="py-3 px-4 rounded-xl font-bold bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 text-rose-200 transition shadow-lg active:scale-95 disabled:opacity-40"
        >
          Fold
        </button>

        {/* CHECK or CALL */}
        {legalActions.canCheck ? (
          <button
            onClick={handleCheck}
            className="py-3 px-4 rounded-xl font-bold bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-600/50 text-emerald-200 transition shadow-lg active:scale-95"
          >
            Check
          </button>
        ) : (
          <button
            onClick={handleCall}
            disabled={!legalActions.canCall}
            className="py-3 px-4 rounded-xl font-bold bg-blue-900/40 hover:bg-blue-800/60 border border-blue-600/50 text-blue-200 transition shadow-lg active:scale-95 disabled:opacity-40"
          >
            Call ${legalActions.callAmount}
          </button>
        )}

        {/* BET / RAISE */}
        {canRaiseOrBet ? (
          <button
            onClick={handleBetRaise}
            className="py-3 px-4 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition shadow-lg shadow-amber-600/20 active:scale-95"
          >
            {legalActions.canRaise ? `Raise to $${betAmount}` : `Bet $${betAmount}`}
          </button>
        ) : (
          <div />
        )}

        {/* ALL IN */}
        <button
          onClick={handleAllIn}
          className="py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white transition shadow-lg shadow-rose-600/20 active:scale-95"
        >
          All-In (${maxVal})
        </button>
      </div>
    </div>
  );
};
