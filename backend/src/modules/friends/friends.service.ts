import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async followUser(followerId: string, followingId: string) {
    return this.prisma.follows.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    return this.prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async getFollowers(userId: string) {
    return this.prisma.follows.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, username: true, avatar: true } } },
    });
  }

  async getFollowing(userId: string) {
    return this.prisma.follows.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, username: true, avatar: true } } },
    });
  }

  /**
   * Queries chronological activities belonging to users that the specified user follows.
   */
  async getActivityFeed(userId: string, limit = 20, offset = 0) {
    const following = await this.prisma.follows.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return {
        items: [],
        total: 0,
        followingCount: 0,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          userId: { in: followingIds },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.activity.count({
        where: {
          userId: { in: followingIds },
        },
      }),
    ]);

    return {
      items,
      total,
      followingCount: followingIds.length,
    };
  }
}
