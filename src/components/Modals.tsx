import React, { useState } from 'react';
import {
  AIDifficulty,
  HandHistorySummary,
  PlayerStats,
  RoomConfig,
} from '../poker/types';
import { AVATAR_LIST, AvatarIcon } from './AvatarIcon';
import { PlayingCard } from './PlayingCard';

interface ModalWrapperProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  title,
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="font-serif font-black text-lg text-amber-300 tracking-wide">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
};

// ==========================================
// 1. Create Room Modal
// ==========================================
interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: {
    playerName: string;
    avatar: string;
    mode: 'ai' | 'multiplayer';
    botCount: number;
    botDifficulty: AIDifficulty;
    config: Partial<RoomConfig>;
  }) => void;
  defaultName?: string;
  defaultAvatar?: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  defaultName = 'Player',
  defaultAvatar = 'crown',
}) => {
  const [playerName, setPlayerName] = useState(defaultName);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [mode, setMode] = useState<'ai' | 'multiplayer'>('ai');
  const [botCount, setBotCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<AIDifficulty>('intermediate');
  const [startingChips, setStartingChips] = useState(2000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(25);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      playerName: playerName.trim() || 'Player',
      avatar,
      mode,
      botCount: mode === 'ai' ? botCount : 0,
      botDifficulty,
      config: {
        startingChips,
        smallBlind,
        bigBlind: smallBlind * 2,
        turnTimerSeconds,
        allowSpectators: true,
      },
    });
  };

  return (
    <ModalWrapper title="Create Poker Room" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Player Name */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 outline-none"
          />
        </div>

        {/* Avatar Select */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Choose Emblem
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {AVATAR_LIST.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatar(av)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                  avatar === av
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <AvatarIcon name={av} size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`py-2.5 px-3 rounded-xl font-bold text-sm border transition ${
                mode === 'ai'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              🤖 Play vs AI Bots
            </button>
            <button
              type="button"
              onClick={() => setMode('multiplayer')}
              className={`py-2.5 px-3 rounded-xl font-bold text-sm border transition ${
                mode === 'multiplayer'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              🌐 Friends Multiplayer
            </button>
          </div>
        </div>

        {/* AI Options if AI mode */}
        {mode === 'ai' && (
          <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Number of Bots
              </label>
              <select
                value={botCount}
                onChange={(e) => setBotCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    {num} Opponent{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                AI Difficulty
              </label>
              <select
                value={botDifficulty}
                onChange={(e) => setBotDifficulty(e.target.value as AIDifficulty)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        )}

        {/* Room Parameters */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Starting Chips
            </label>
            <select
              value={startingChips}
              onChange={(e) => setStartingChips(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
            >
              <option value={1000}>$1,000</option>
              <option value={2000}>$2,000</option>
              <option value={5000}>$5,000</option>
              <option value={10000}>$10,000</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Blinds (SB/BB)
            </label>
            <select
              value={smallBlind}
              onChange={(e) => setSmallBlind(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
            >
              <option value={5}>$5 / $10</option>
              <option value={10}>$10 / $20</option>
              <option value={25}>$25 / $50</option>
              <option value={50}>$50 / $100</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Turn Timer
            </label>
            <select
              value={turnTimerSeconds}
              onChange={(e) => setTurnTimerSeconds(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
            >
              <option value={15}>15s</option>
              <option value={25}>25s</option>
              <option value={45}>45s</option>
              <option value={0}>No Timer</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg transition"
        >
          Create & Start Table
        </button>
      </form>
    </ModalWrapper>
  );
};

// ==========================================
// 2. Join Room Modal
// ==========================================
interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string, name: string, avatar: string, asSpectator: boolean) => void;
  initialCode?: string;
  defaultName?: string;
  defaultAvatar?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  initialCode = '',
  defaultName = 'Guest',
  defaultAvatar = 'shield',
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(defaultName);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [asSpectator, setAsSpectator] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoin(code.trim().toUpperCase(), name.trim() || 'Guest', avatar, asSpectator);
  };

  return (
    <ModalWrapper title="Join Private Table" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Room Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="e.g. ABCDEF"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-amber-300 focus:border-amber-500 outline-none uppercase"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
            Choose Emblem
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {AVATAR_LIST.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatar(av)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  avatar === av
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <AvatarIcon name={av} size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="spectatorCheck"
            checked={asSpectator}
            onChange={(e) => setAsSpectator(e.target.checked)}
            className="rounded accent-amber-500"
          />
          <label htmlFor="spectatorCheck" className="text-xs text-slate-300 font-medium">
            Join as a Spectator (watch without taking a seat)
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition"
        >
          Join Game
        </button>
      </form>
    </ModalWrapper>
  );
};

// ==========================================
// 3. How To Play & Poker Hand Rankings Modal
// ==========================================
export const HowToPlayModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const handRanks = [
    { rank: 1, name: 'Royal Flush', desc: 'A, K, Q, J, 10 of the exact same suit.', example: 'A♠ K♠ Q♠ J♠ 10♠' },
    { rank: 2, name: 'Straight Flush', desc: 'Five consecutive cards of the same suit.', example: '9♥ 8♥ 7♥ 6♥ 5♥' },
    { rank: 3, name: 'Four of a Kind', desc: 'Four cards of identical numerical rank.', example: '10♦ 10♣ 10♥ 10♠ 4♠' },
    { rank: 4, name: 'Full House', desc: 'Three of a kind combined with a pair.', example: 'K♠ K♥ K♦ 9♣ 9♠' },
    { rank: 5, name: 'Flush', desc: 'Any five cards of the same suit, non-consecutive.', example: 'A♦ J♦ 8♦ 6♦ 2♦' },
    { rank: 6, name: 'Straight', desc: 'Five consecutive cards of mixed suits.', example: '8♠ 7♥ 6♦ 5♣ 4♠' },
    { rank: 7, name: 'Three of a Kind', desc: 'Three cards of the same rank.', example: 'Q♥ Q♦ Q♠ 8♣ 4♦' },
    { rank: 8, name: 'Two Pair', desc: 'Two distinct pairs of matching ranks.', example: 'J♠ J♥ 7♦ 7♣ A♠' },
    { rank: 9, name: 'One Pair', desc: 'Two cards of the same rank.', example: '10♥ 10♦ K♠ 8♣ 3♦' },
    { rank: 10, name: 'High Card', desc: 'No combination; evaluated by highest card.', example: 'A♠ Q♦ 9♣ 7♥ 2♠' },
  ];

  return (
    <ModalWrapper title="Poker Rules & Hand Rankings" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <p className="font-bold text-amber-300 mb-1">Standard Texas Hold'em Rules:</p>
          Each player receives 2 private hole cards. Five community cards are dealt face-up in the center: Flop (3), Turn (1), and River (1). Form the best possible 5-card poker hand using any combination of your 2 hole cards and the 5 community cards.
        </div>

        <div className="space-y-2">
          {handRanks.map((h) => (
            <div
              key={h.rank}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                  #{h.rank}
                </span>
                <div>
                  <div className="font-bold text-sm text-slate-100">{h.name}</div>
                  <div className="text-[11px] text-slate-400">{h.desc}</div>
                </div>
              </div>
              <div className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-1 rounded">
                {h.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalWrapper>
  );
};

// ==========================================
// 4. Hand History Modal
// ==========================================
export const HandHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  history: HandHistorySummary[];
}> = ({ isOpen, onClose, history }) => {
  return (
    <ModalWrapper title="Hand History" isOpen={isOpen} onClose={onClose}>
      {history.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No hands have completed in this room yet.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((hand) => (
            <div
              key={hand.handId}
              className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-300">
                    Hand #{hand.handNumber}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(hand.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-400">
                  Total Pot: ${hand.totalPot}
                </div>
              </div>

              {/* Board Cards */}
              <div className="flex items-center gap-1.5 py-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Board:</span>
                {hand.communityCards.map((c) => (
                  <span
                    key={c.id}
                    className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                  >
                    {c.id}
                  </span>
                ))}
              </div>

              {/* Winners */}
              {hand.awards.map((a, aIdx) => (
                <div key={aIdx} className="text-xs text-amber-200/90 bg-amber-950/30 p-2 rounded-lg border border-amber-800/30">
                  🏆 <span className="font-bold text-amber-300">{a.winnerNames.join(', ')}</span> won ${a.amount} with <span className="italic">{a.winningHandName}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </ModalWrapper>
  );
};
