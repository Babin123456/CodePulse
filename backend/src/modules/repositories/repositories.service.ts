import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryRepositoriesDto, RepositorySortBy, SortOrder } from './dto/repositories.dto';
import { RocksDbService } from '../storage/rocksdb.service';
import type { ParsedAstPayload, FileSymbolTable } from '../storage/rocksdb.service';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly rocksDb?: RocksDbService,
  ) {}

  /**
   * Retrieves paginated repositories for the user with server-side filtering, searching, and sorting.
   */
  async getRepositories(userId: string, query: QueryRepositoriesDto = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RepositoryWhereInput = {
      userId,
      archivedAt: null,
    };

    if (query.isPrivate !== undefined) {
      where.isPrivate = query.isPrivate;
    }

    if (query.language && query.language.trim()) {
      where.language = {
        equals: query.language.trim(),
        mode: 'insensitive',
      };
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const sortOrder = query.sortOrder === SortOrder.ASC ? 'asc' : 'desc';
    const sortBy = query.sortBy || RepositorySortBy.UPDATED_AT;

    const orderBy: Prisma.RepositoryOrderByWithRelationInput = {};
    if (sortBy === RepositorySortBy.STARS) {
      orderBy.stars = sortOrder;
    } else if (sortBy === RepositorySortBy.FORKS) {
      orderBy.forks = sortOrder;
    } else if (sortBy === RepositorySortBy.COMMITS) {
      orderBy.commits = sortOrder;
    } else if (sortBy === RepositorySortBy.NAME) {
      orderBy.name = sortOrder;
    } else {
      orderBy.repoUpdatedAt = sortOrder;
    }

    const [data, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.repository.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single repository by ID with access control enforcement.
   */
  async getRepositoryById(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException(`Repository ${repositoryId} not found`);
    }

    if (repository.userId !== userId && repository.isPrivate) {
      throw new ForbiddenException(
        'You do not have permission to view this private repository',
      );
    }

    return repository;
  }

  /**
   * Triggers an on-demand re-synchronization of a single repository.
   */
  async syncRepository(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });

    if (!repository) {
      throw new NotFoundException(
        `Repository ${repositoryId} not found or does not belong to user`,
      );
    }

    const updated = await this.prisma.repository.update({
      where: { id: repositoryId },
      data: {
        updatedAt: new Date(),
        repoUpdatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Repository ${repository.name} synced successfully`,
      repository: updated,
    };
  }

  /**
   * Retrieves aggregated distinct programming languages and repository counts for the user.
   */
  async getUserLanguages(userId: string) {
    const repos = await this.prisma.repository.findMany({
      where: {
        userId,
        archivedAt: null,
        language: { not: null },
      },
      select: {
        language: true,
        languageColor: true,
      },
    });

    const languageCounts: Record<
      string,
      { count: number; color: string | null }
    > = {};

    for (const r of repos) {
      if (!r.language) continue;
      if (!languageCounts[r.language]) {
        languageCounts[r.language] = {
          count: 0,
          color: r.languageColor,
        };
      }
      languageCounts[r.language].count++;
    }

    return Object.entries(languageCounts).map(([name, stat]) => ({
      name,
      count: stat.count,
      color: stat.color,
    }));
  }

  /**
   * Retrieves or parses and caches AST for a repository file using RocksDB (#549).
   */
  async getFileAst(
    userId: string,
    repositoryId: string,
    commitSha: string,
    filePath: string,
    fallbackContent?: string,
  ): Promise<ParsedAstPayload | null> {
    await this.getRepositoryById(userId, repositoryId);

    if (this.rocksDb) {
      const cached = await this.rocksDb.getAst(commitSha, filePath);
      if (cached) return cached;

      if (fallbackContent) {
        return this.rocksDb.parseAndCacheAst(commitSha, filePath, fallbackContent);
      }
    }

    return null;
  }

  /**
   * Retrieves or extracts and caches symbol definitions for a repository file using RocksDB (#549).
   */
  async getFileSymbols(
    userId: string,
    repositoryId: string,
    commitSha: string,
    filePath: string,
    fallbackContent?: string,
  ): Promise<FileSymbolTable | null> {
    await this.getRepositoryById(userId, repositoryId);

    if (this.rocksDb) {
      const cached = await this.rocksDb.getSymbols(commitSha, filePath);
      if (cached) return cached;

      if (fallbackContent) {
        return this.rocksDb.parseAndCacheSymbols(commitSha, filePath, fallbackContent);
      }
    }

    return null;
  }

  /**
   * Retrieves all file symbols across the workspace for a commit SHA (#549).
   */
  async getWorkspaceSymbols(
    userId: string,
    repositoryId: string,
    commitSha: string,
  ): Promise<FileSymbolTable[]> {
    await this.getRepositoryById(userId, repositoryId);

    if (this.rocksDb) {
      return this.rocksDb.getWorkspaceSymbols(commitSha);
    }

    return [];
  }
}
