import { Injectable, Logger } from '@nestjs/common';

export type SabotageType = 'SYNTAX_SCRAMBLE' | 'SCREEN_FOG' | 'VARIABLE_INVERT' | 'KEY_DELAY';

export interface ActiveDebuff {
  type: SabotageType;
  targetUserId: string;
  castByUserId: string;
  durationSeconds: number;
  expiresAt: number;
}

@Injectable()
export class SabotageEngineService {
  private readonly logger = new Logger(SabotageEngineService.name);
  private activeDebuffs: Map<string, ActiveDebuff[]> = new Map(); // battleId -> debuffs
  private cooldowns: Map<string, number> = new Map(); // userId:type -> cooldownExpiresAt

  public canCast(userId: string, type: SabotageType): boolean {
    const key = `${userId}:${type}`;
    const expiresAt = this.cooldowns.get(key) || 0;
    return Date.now() >= expiresAt;
  }

  public castSabotage(
    battleId: string,
    casterId: string,
    targetUserId: string,
    type: SabotageType,
    durationSeconds: number = 7,
  ): ActiveDebuff | null {
    if (!this.canCast(casterId, type)) {
      return null;
    }

    const debuff: ActiveDebuff = {
      type,
      targetUserId,
      castByUserId: casterId,
      durationSeconds,
      expiresAt: Date.now() + durationSeconds * 1000,
    };

    const list = this.activeDebuffs.get(battleId) || [];
    list.push(debuff);
    this.activeDebuffs.set(battleId, list);

    // Apply 30s cooldown
    this.cooldowns.set(`${casterId}:${type}`, Date.now() + 30_000);

    this.logger.log(`[SABOTAGE] ${casterId} cast ${type} on ${targetUserId} for ${durationSeconds}s`);
    return debuff;
  }

  public getActiveDebuffs(battleId: string, userId: string): ActiveDebuff[] {
    const list = this.activeDebuffs.get(battleId) || [];
    const now = Date.now();
    return list.filter((d) => d.targetUserId === userId && d.expiresAt > now);
  }
}
