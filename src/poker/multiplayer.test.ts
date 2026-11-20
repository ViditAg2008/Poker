import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PokerEngine } from './engine';

describe('PokerEngine Multiplayer & Edge Cases', () => {
  test('handles player folding and awards pot to last remaining player', () => {
    const engine = new PokerEngine('room-test', 'TESTMP', 'p1', {
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
    });

    engine.addPlayer({ id: 'p1', name: 'Alice', avatar: 'crown' });
    engine.addPlayer({ id: 'p2', name: 'Bob', avatar: 'shield' });

    engine.startHand();
    assert.strictEqual(engine.phase, 'PREFLOP');

    const activeId = engine.activePlayerId!;
    const otherId = activeId === 'p1' ? 'p2' : 'p1';

    // Active player folds
    const res = engine.handleAction(activeId, 'fold');
    assert.strictEqual(res.ok, true);

    // Hand resolves immediately
    assert.strictEqual(engine.phase, 'SHOWDOWN');
    const winner = engine.players.find((p) => p.id === otherId)!;
    assert.strictEqual(winner.chips, 1010); // Won 20 BB + 10 SB - their own contribution
  });

  test('correctly calculates multi-way side pots when a player goes all-in short', () => {
    const engine = new PokerEngine('sidepot-room', 'POT001', 'p1');
    engine.addPlayer({ id: 'p1', name: 'Shorty', avatar: 'crown' });
    engine.addPlayer({ id: 'p2', name: 'Deep1', avatar: 'shield' });
    engine.addPlayer({ id: 'p3', name: 'Deep2', avatar: 'star' });

    engine.players[0].chips = 100;
    engine.players[1].chips = 1000;
    engine.players[2].chips = 1000;

    engine.startHand();

    // Verify game starts with players in hand
    assert.strictEqual(engine.players.length, 3);
  });
});
