import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Share2,
  HelpCircle,
  History,
  Settings,
  PlusCircle,
  LogIn,
  RotateCcw,
  MessageSquare,
  Send,
  UserPlus,
  UserMinus,
  Eye,
  Play,
} from 'lucide-react';

import {
  ClientGameState,
  RoomConfig,
  AIDifficulty,
} from './poker/types';
import { PokerTable } from './components/PokerTable';
import { ActionPanel } from './components/ActionPanel';
import {
  CreateRoomModal,
  JoinRoomModal,
  HowToPlayModal,
  HandHistoryModal,
} from './components/Modals';
import { sound } from './utils/sound';

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);

  // User Profile
  const [playerId, setPlayerId] = useState<string>(() => {
    const saved = localStorage.getItem('poker_player_id');
    if (saved) return saved;
    const generated = `usr-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('poker_player_id', generated);
    return generated;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('poker_player_name') || 'PokerPlayer';
  });

  const [avatar, setAvatar] = useState<string>(() => {
    return localStorage.getItem('poker_avatar') || 'crown';
  });

  // Settings & UI state
  const [theme, setTheme] = useState<'emerald' | 'royal' | 'crimson'>('emerald');
  const [fourColorDeck, setFourColorDeck] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sound toggle
  const toggleSound = () => {
    sound.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  // Socket connection
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('room:state', (state: ClientGameState) => {
      setGameState((prev) => {
        // Trigger sounds on state events
        if (state.phase !== prev?.phase) {
          if (state.phase === 'SHOWDOWN') {
            sound.playWin();
            const winningPlayerIds = state.recentAwards?.[0]?.winnerIds || [];
            if (winningPlayerIds.includes(playerId)) {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
            }
          } else if (state.phase === 'PREFLOP') {
            sound.playCardDeal();
          }
        }
        return state;
      });
    });

    setSocket(s);

    // Check URL parameters for ?room=XXXXXX
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setInitialJoinCode(roomParam.toUpperCase());
      setShowJoinModal(true);
    }

    return () => {
      s.disconnect();
    };
  }, [playerId]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState?.chatMessages, chatOpen]);

  // Handlers
  const handleCreateRoom = (options: {
    playerName: string;
    avatar: string;
    mode: 'ai' | 'multiplayer';
    botCount: number;
    botDifficulty: AIDifficulty;
    config: Partial<RoomConfig>;
  }) => {
    if (!socket) return;
    localStorage.setItem('poker_player_name', options.playerName);
    localStorage.setItem('poker_avatar', options.avatar);
    setPlayerName(options.playerName);
    setAvatar(options.avatar);

    socket.emit(
      'room:create',
      {
        playerId,
        playerName: options.playerName,
        avatar: options.avatar,
        mode: options.mode,
        botCount: options.botCount,
        botDifficulty: options.botDifficulty,
        config: options.config,
        autoStart: options.mode === 'ai',
      },
      (res: { ok: boolean; roomCode?: string; state?: any; error?: string }) => {
        if (!res.ok) {
          showToast(res.error || 'Failed to create room.');
          return;
        }
        setShowCreateModal(false);
        showToast(`Table ${res.roomCode} created!`);
      }
    );
  };

  const handleJoinRoom = (
    code: string,
    name: string,
    av: string,
    asSpectator: boolean
  ) => {
    if (!socket) return;
    localStorage.setItem('poker_player_name', name);
    localStorage.setItem('poker_avatar', av);
    setPlayerName(name);
    setAvatar(av);

    socket.emit(
      'room:join',
      {
        roomCode: code,
        playerId,
        playerName: name,
        avatar: av,
        asSpectator,
      },
      (res: { ok: boolean; roomCode?: string; state?: any; error?: string }) => {
        if (!res.ok) {
          showToast(res.error || 'Failed to join table.');
          return;
        }
        setShowJoinModal(false);
        showToast(`Joined table ${code}!`);
      }
    );
  };

  const handleAction = (
    action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in',
    amount?: number
  ) => {
    if (!socket || !gameState) return;
    socket.emit(
      'game:action',
      {
        roomCode: gameState.roomCode,
        playerId,
        action,
        amount,
      },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) {
          showToast(res.error || 'Invalid move.');
        }
      }
    );
  };

  const handleStartHand = () => {
    if (!socket || !gameState) return;
    socket.emit(
      'game:start',
      { roomCode: gameState.roomCode, playerId },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) {
          showToast(res.error || 'Could not start hand.');
        }
      }
    );
  };

  const handleRebuy = () => {
    if (!socket || !gameState) return;
    socket.emit(
      'game:rebuy',
      { roomCode: gameState.roomCode, playerId },
      (res: { ok: boolean; error?: string }) => {
        if (res.ok) {
          showToast('Chips topped up to starting stack!');
        } else {
          showToast(res.error || 'Cannot rebuy right now.');
        }
      }
    );
  };

  const handleToggleSpectator = () => {
    if (!socket || !gameState) return;
    socket.emit(
      'room:toggle_spectator',
      {
        roomCode: gameState.roomCode,
        playerId,
        playerName,
        avatar,
      },
      (res: { ok: boolean; isSpectator?: boolean; error?: string }) => {
        if (res.ok) {
          showToast(res.isSpectator ? 'Switched to Spectator mode.' : 'Took a seat at the table!');
        } else {
          showToast(res.error || 'Failed to switch seat mode.');
        }
      }
    );
  };

  const handleAddBot = () => {
    if (!socket || !gameState) return;
    socket.emit(
      'room:add_bot',
      { roomCode: gameState.roomCode, playerId },
      (res: { ok: boolean; error?: string }) => {
        if (res.ok) {
          showToast('Added an AI bot to the table.');
        } else {
          showToast(res.error || 'Could not add bot.');
        }
      }
    );
  };

  const handleRemoveBot = () => {
    if (!socket || !gameState) return;
    socket.emit(
      'room:remove_bot',
      { roomCode: gameState.roomCode, playerId },
      (res: { ok: boolean; error?: string }) => {
        if (res.ok) {
          showToast('Removed an AI bot.');
        } else {
          showToast(res.error || 'Could not remove bot.');
        }
      }
    );
  };

  const handleCopyInvite = () => {
    if (!gameState) return;
    const inviteUrl = `${window.location.origin}/?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast(`Invite Link copied! (${gameState.roomCode})`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !gameState || !chatInput.trim()) return;
    socket.emit('chat:send', {
      roomCode: gameState.roomCode,
      playerId,
      playerName,
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  // Check if I am current actor
  const isMyTurn = gameState?.activePlayerId === playerId;
  const myPlayer = gameState?.players.find((p) => p.id === playerId);
  const activePlayerObj = gameState?.players.find((p) => p.id === gameState.activePlayerId);

  // Time remaining on turn timer
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!gameState?.turnDeadline || gameState.phase === 'WAITING' || gameState.phase === 'SHOWDOWN') {
      setSecondsRemaining(null);
      return;
    }
    const updateCountdown = () => {
      const left = Math.max(0, Math.ceil((gameState.turnDeadline! - Date.now()) / 1000));
      setSecondsRemaining(left);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [gameState?.turnDeadline, gameState?.phase]);

  return (
    <div className="min-h-screen bg-[#070B0E] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-5 py-2 rounded-full font-bold shadow-2xl text-sm border-2 border-amber-300 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between z-20">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠️</span>
          <div>
            <h1 className="font-serif font-black text-lg sm:text-xl text-amber-300 tracking-wider">
              POKERVERSE
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              <span>{connected ? 'Connected' : 'Connecting...'}</span>
              {gameState && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-mono">Room: {gameState.roomCode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* If In Room: Copy Invite */}
          {gameState && (
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Invite Link</span>
            </button>
          )}

          {/* If Not In Room: Create or Join Buttons */}
          {!gameState ? (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg"
              >
                <PlusCircle size={14} />
                <span>Create Table</span>
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700"
              >
                <LogIn size={14} />
                <span>Join Table</span>
              </button>
            </>
          ) : (
            <>
              {/* Host Controls: Add / Remove Bots */}
              {gameState.hostId === playerId && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={handleAddBot}
                    title="Add AI Bot"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <UserPlus size={16} />
                  </button>
                  <button
                    onClick={handleRemoveBot}
                    title="Remove AI Bot"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              )}

              {/* Next Hand Button */}
              {(gameState.phase === 'SHOWDOWN' || gameState.phase === 'WAITING') && (
                <button
                  onClick={handleStartHand}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg animate-pulse"
                >
                  <Play size={14} />
                  <span>Next Hand</span>
                </button>
              )}

              {/* Rebuy if low */}
              {myPlayer && myPlayer.chips < gameState.config.startingChips && (
                <button
                  onClick={handleRebuy}
                  title="Rebuy Chips"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs transition"
                >
                  <RotateCcw size={14} />
                  <span>Rebuy</span>
                </button>
              )}
            </>
          )}

          {/* Theme Selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="hidden md:block bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-300 outline-none"
          >
            <option value="emerald">Emerald Felt</option>
            <option value="royal">Monte Carlo</option>
            <option value="crimson">High-Roller</option>
          </select>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Hand Rankings / Rules */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Hand Rankings"
          >
            <HelpCircle size={16} />
          </button>

          {/* History */}
          {gameState && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Hand History"
            >
              <History size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-7xl mx-auto w-full relative">
        {gameState ? (
          <div className="w-full flex flex-col items-center gap-3">
            {/* The Poker Table */}
            <PokerTable
              gameState={gameState}
              myPlayerId={playerId}
              theme={theme}
              fourColorDeck={fourColorDeck}
            />

            {/* Betting Controls & HUD */}
            <ActionPanel
              isTurn={isMyTurn}
              legalActions={gameState.legalActions}
              currentPot={gameState.currentPot}
              bigBlind={gameState.config.bigBlind}
              onAction={handleAction}
              waitingForName={activePlayerObj?.name}
              turnSecondsLeft={secondsRemaining}
            />
          </div>
        ) : (
          /* Lobby Welcome Screen */
          <div className="flex flex-col items-center text-center max-w-xl py-12 px-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-md shadow-2xl">
            <div className="text-6xl mb-4">♠️ ♥️ ♦️ ♣️</div>
            <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-300 mb-3 tracking-wide">
              Welcome to PokerVerse
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
              Play Texas Hold'em against intelligent AI bots or create a private room with a shareable link to play with friends in real time.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-xl transition active:scale-95 text-base"
              >
                Create Private Table
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition active:scale-95 text-base"
              >
                Join with Room Code
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Chat Drawer Button */}
      {gameState && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl transition"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      )}

      {/* Slide-out Chat Panel */}
      {gameState && chatOpen && (
        <div className="fixed bottom-18 right-4 w-80 sm:w-96 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl z-40 flex flex-col h-96 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <span className="font-bold text-xs text-amber-400 uppercase tracking-wider">
              Table Chat & Feed
            </span>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {gameState.chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.isSystem
                    ? 'text-amber-400/80 italic text-center py-1 bg-amber-950/20 rounded'
                    : 'flex flex-col'
                }
              >
                {!msg.isSystem && (
                  <span className="font-bold text-slate-400 text-[10px]">
                    {msg.senderName}:
                  </span>
                )}
                <span className={msg.isSystem ? 'text-[11px]' : 'text-slate-200'}>
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <form
            onSubmit={handleSendChat}
            className="p-2 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat or send emote..."
              maxLength={150}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 outline-none"
            />
            <button
              type="submit"
              className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
        defaultName={playerName}
        defaultAvatar={avatar}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinRoom}
        initialCode={initialJoinCode}
        defaultName={playerName}
        defaultAvatar={avatar}
      />

      <HowToPlayModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      <HandHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={gameState?.handHistory || []}
      />
    </div>
  );
};
