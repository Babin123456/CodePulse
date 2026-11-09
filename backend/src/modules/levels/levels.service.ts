import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tier, type DeveloperRating } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export function tierForLevel(level: number): Tier {
  if (level >= 50) return Tier.GRANDMASTER;
  if (level >= 40) return Tier.MASTER;
  if (level >= 30) return Tier.DIAMOND;
  if (level >= 20) return Tier.PLATINUM;
  if (level >= 10) return Tier.GOLD;
  if (level >= 5) return Tier.SILVER;
  return Tier.BRONZE;
}

@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndLevelUp(
    userId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<DeveloperRating> {
    if (!transaction) {
      return this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        return this.checkAndLevelUp(userId, tx);
      });
    }
    const rating = await transaction.developerRating.findUnique({
      where: { userId },
    });
    if (!rating)
      throw new NotFoundException(
        `Developer rating not found for user ${userId}`,
      );
    const { xp } = rating;
    if (
      !Number.isInteger(xp) ||
      xp < 0 ||
      !Number.isInteger(rating.level) ||
      rating.level < 1
    ) {
      throw new BadRequestException('Invalid stored level progression');
    }
    // Match SyncService's cumulative-XP rule instead of consuming lifetime XP.
    // Retain already-earned levels if historical data used residual XP.
    const level = Math.max(rating.level, Math.floor(Math.sqrt(xp / 100)) + 1);
    const xpToNextLevel = level * level * 100;
    if (!Number.isSafeInteger(xpToNextLevel) || xpToNextLevel > 2147483647) {
      throw new BadRequestException('Level threshold exceeds supported range');
    }
    const tier = tierForLevel(level);
    if (
      level === rating.level &&
      tier === rating.tier &&
      xpToNextLevel === rating.xpToNextLevel
    )
      return rating;
    const updated = await transaction.developerRating.update({
      where: { userId },
      data: { level, xp, xpToNextLevel, tier },
    });
    if (level > rating.level) {
      const title = `Level ${level} reached`;
      const message = `Advanced from level ${rating.level} to ${level} (${tier}).`;
      await transaction.notification.create({
        data: { userId, type: 'LEVEL_UP', title, message },
      });
      await transaction.activity.create({
        data: {
          userId,
          type: 'LEVEL_UP',
          title,
          description: message,
          metadata: { levelBefore: rating.level, levelAfter: level, tier },
        },
      });
    }
    return updated;
  }
}
