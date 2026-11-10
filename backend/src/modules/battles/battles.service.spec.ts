import { describe, it, expect, beforeEach } from 'vitest';
import { BattlesService } from './battles.service';

describe('BattlesService - ELO Rating Engine (#87)', () => {
  let battlesService: BattlesService;
  const mockPrisma: any = {};

  beforeEach(() => {
    battlesService = new BattlesService(mockPrisma);
  });

  it('1. Standard Victory: calculates expected ELO point exchange between equally rated players', () => {
    const winnerRating = 1200;
    const loserRating = 1200;

    const outcome = battlesService.calculateElo(winnerRating, loserRating, 32);

    expect(outcome.winnerDelta).toBe(16);
    expect(outcome.loserDelta).toBe(-16);
    expect(outcome.winnerRating).toBe(1216);
    expect(outcome.loserRating).toBe(1184);
    expect(outcome.winnerXpGain).toBe(150);
    expect(outcome.loserXpGain).toBe(25);
  });

  it('2. Underdog Victory: awards higher ELO gain when lower-rated player defeats titan', () => {
    const underdogWinnerRating = 1000;
    const titanLoserRating = 1400;

    const outcome = battlesService.calculateElo(underdogWinnerRating, titanLoserRating, 32);

    // Winner was predicted to lose heavily (~9% chance), so delta should be significantly higher (> 25 pts)
    expect(outcome.winnerDelta).toBeGreaterThanOrEqual(28);
    expect(outcome.loserDelta).toBeLessThanOrEqual(-28);
    expect(outcome.winnerRating).toBe(1000 + outcome.winnerDelta);
    expect(outcome.loserRating).toBe(1400 + outcome.loserDelta);
  });

  it('3. Expected Favorite Victory: yields smaller ELO gain when higher-rated player wins', () => {
    const favoriteWinnerRating = 1500;
    const underdogLoserRating = 1100;

    const outcome = battlesService.calculateElo(favoriteWinnerRating, underdogLoserRating, 32);

    // Guaranteed minimum winner gain of at least 8 pts
    expect(outcome.winnerDelta).toBeGreaterThanOrEqual(8);
    expect(outcome.winnerRating).toBeGreaterThan(1500);
    expect(outcome.loserRating).toBeLessThan(1100);
  });

  it('4. Floors rating at 100 to prevent negative developer scores', () => {
    const winnerRating = 1200;
    const beginnerLoserRating = 105;

    const outcome = battlesService.calculateElo(winnerRating, beginnerLoserRating, 32);
    expect(outcome.loserRating).toBeGreaterThanOrEqual(100);
  });
});
