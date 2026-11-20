import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  createCard,
  createDeck,
  evaluateHand,
  compareHands,
} from './evaluator';
import { HandRankCategory } from './types';
import { PokerEngine } from './engine';

describe('PokerEvaluator', () => {
  test('correctly identifies Royal Flush', () => {
    const hand = [
      createCard(14, 'spades'),
      createCard(13, 'spades'),
      createCard(12, 'spades'),
      createCard(11, 'spades'),
      createCard(10, 'spades'),
      createCard(2, 'hearts'),
      createCard(5, 'diamonds'),
    ];
    const res = evaluateHand(hand);
    assert.strictEqual(res.category, HandRankCategory.RoyalFlush);
  });

  test('correctly identifies Straight Flush', () => {
    const hand = [
      createCard(9, 'hearts'),
      createCard(8, 'hearts'),
      createCard(7, 'hearts'),
      createCard(6, 'hearts'),
      createCard(5, 'hearts'),
      createCard(14, 'clubs'),
      createCard(2, 'spades'),
    ];
    const res = evaluateHand(hand);
    assert.strictEqual(res.category, HandRankCategory.StraightFlush);
    assert.strictEqual(res.tiebreakers[0], 9);
  });

  test('correctly identifies Ace-low Straight (Wheel)', () => {
    const hand = [
      createCard(14, 'hearts'),
      createCard(2, 'spades'),
      createCard(3, 'diamonds'),
      createCard(4, 'clubs'),
      createCard(5, 'hearts'),
      createCard(9, 'diamonds'),
      createCard(11, 'spades'),
    ];
    const res = evaluateHand(hand);
    assert.strictEqual(res.category, HandRankCategory.Straight);
    assert.strictEqual(res.tiebreakers[0], 5);
  });

  test('correctly identifies Four of a Kind', () => {
    const hand = [
      createCard(10, 'hearts'),
      createCard(10, 'spades'),
      createCard(10, 'diamonds'),
      createCard(10, 'clubs'),
      createCard(14, 'hearts'),
      createCard(3, 'spades'),
    ];
    const res = evaluateHand(hand);
    assert.strictEqual(res.category, HandRankCategory.FourOfAKind);
    assert.strictEqual(res.tiebreakers[0], 10);
    assert.strictEqual(res.tiebreakers[1], 14);
  });

  test('correctly identifies Full House and breaks ties', () => {
    const handA = [
      createCard(13, 'hearts'),
      createCard(13, 'spades'),
      createCard(13, 'diamonds'),
      createCard(10, 'clubs'),
      createCard(10, 'hearts'),
      createCard(2, 'spades'),
    ];
    const handB = [
      createCard(12, 'hearts'),
      createCard(12, 'spades'),
      createCard(12, 'diamonds'),
      createCard(14, 'clubs'),
      createCard(14, 'hearts'),
      createCard(3, 'spades'),
    ];
    const resA = evaluateHand(handA);
    const resB = evaluateHand(handB);
    assert.strictEqual(resA.category, HandRankCategory.FullHouse);
    assert.strictEqual(resB.category, HandRankCategory.FullHouse);
    // Kings full of 10s beats Queens full of Aces
    assert.ok(compareHands(resA, resB) > 0);
  });
});

describe('PokerEngine', () => {
  test('initializes and starts hand with blinds correctly', () => {
    const engine = new PokerEngine('test-room-1', 'TEST01', 'p1', {
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
    });

    engine.addPlayer({ id: 'p1', name: 'Alice', avatar: 'crown' });
    engine.addPlayer({ id: 'p2', name: 'Bob', avatar: 'shield' });

    const startRes = engine.startHand();
    assert.strictEqual(startRes.ok, true);
    assert.strictEqual(engine.phase, 'PREFLOP');
    assert.strictEqual(engine.players[0].holeCards.length, 2);
    assert.strictEqual(engine.players[1].holeCards.length, 2);

    // One player posted SB (10), other BB (20)
    const chipsSum = engine.players[0].chips + engine.players[1].chips;
    assert.strictEqual(chipsSum, 2000 - 30);
  });

  test('sanitizes client state so players cannot see opponent hole cards', () => {
    const engine = new PokerEngine('test-room-2', 'TEST02', 'p1');
    engine.addPlayer({ id: 'p1', name: 'Alice', avatar: 'crown' });
    engine.addPlayer({ id: 'p2', name: 'Bob', avatar: 'shield' });
    engine.startHand();

    const aliceView = engine.getClientState('p1');
    const p1InView = aliceView.players.find((p) => p.id === 'p1');
    const p2InView = aliceView.players.find((p) => p.id === 'p2');

    assert.ok(p1InView?.holeCards && p1InView.holeCards.length === 2);
    assert.strictEqual(p2InView?.holeCards, undefined);
    assert.strictEqual(p2InView?.cardCount, 2);
  });
});
