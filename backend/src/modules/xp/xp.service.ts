import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddXpDto } from './dto/xp.dto';
import { LevelsService } from '../levels/levels.service';

@Injectable()
export class XpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly levels: LevelsService,
  ) {}

  async addXp(dto: AddXpDto) {
    if (
      !Number.isInteger(dto.amount) ||
      dto.amount <= 0 ||
      dto.amount > 2147483647 ||
      typeof dto.reason !== 'string' ||
      !dto.reason.trim() ||
      dto.reason.length > 500 ||
      (dto.source !== undefined &&
        (typeof dto.source !== 'string' ||
          !dto.source.trim() ||
          dto.source.length > 64))
    ) {
      throw new BadRequestException(
        'XP requires a positive integer amount, a reason and a valid source',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // All award and standalone level-check paths acquire this same row lock.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${dto.userId} FOR UPDATE`;
      const rating = await tx.developerRating.findUnique({
        where: { userId: dto.userId },
      });
      if (!rating)
        throw new NotFoundException(
          `Developer rating not found for user ${dto.userId}`,
        );
      if (
        !Number.isSafeInteger(rating.xp + dto.amount) ||
        rating.xp + dto.amount > 2147483647
      ) {
        throw new BadRequestException('XP total exceeds the supported range');
      }
      await tx.developerRating.update({
        where: { userId: dto.userId },
        data: { xp: { increment: dto.amount } },
      });
      // Append only: this service never updates/deletes existing audit rows.
      await tx.xpTransaction.create({
        data: {
          userId: dto.userId,
          amount: dto.amount,
          source: dto.source?.trim() || 'MANUAL',
          description: dto.reason.trim(),
        },
      });
      return this.levels.checkAndLevelUp(dto.userId, tx);
    });
  }
}
