import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GithubService } from './github.service';
import {
  SyncGitHubProfileDto,
  GitHubQueryDto,
  GitHubDeveloperQueryDto,
} from './dto/github.dto';
import { GITHUB_RATE_LIMITS } from './constants/cache.constants';
import { CustomThrottlerGuard } from '../../common/guards/custom-throttler.guard';

@ApiTags('github')
@Controller('github')
@UseGuards(CustomThrottlerGuard)
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('developer')
  @ApiOperation({
    summary: 'Proxy GitHub developer analytics (query format)',
    description:
      'Fetches developer stats, coding habit, score, persona, and rankings. Results are cached for 5 minutes. Pass force=true to invalidate cache. Rate-limited to 30 requests/minute.',
  })
  @ApiQuery({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Developer analytics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Username is required' })
  @ApiResponse({ status: 404, description: 'GitHub user not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.PROXY_LIMIT, ttl: GITHUB_RATE_LIMITS.PROXY_TTL } })
  async getDeveloperByQuery(
    @Query() query: GitHubDeveloperQueryDto,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (!query.username) {
      throw new BadRequestException('Query parameter "username" is required');
    }
    const token = this.extractToken(authHeader);
    const force = Boolean(query.force || query.refresh);
    return this.withCacheHeader(res, await this.githubService.getDeveloperAnalyticsCached(query.username, token, force));
  }

  @Get('developer/:username')
  @ApiOperation({
    summary: 'Proxy GitHub developer analytics by username',
    description:
      'Fetches developer stats, coding habit, score, persona, and rankings. Results are cached for 5 minutes. Pass force=true to invalidate cache. Rate-limited to 30 requests/minute.',
  })
  @ApiParam({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Developer analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'GitHub user not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.PROXY_LIMIT, ttl: GITHUB_RATE_LIMITS.PROXY_TTL } })
  async getDeveloper(
    @Param('username') username: string,
    @Query() query: GitHubQueryDto,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = this.extractToken(authHeader);
    const force = Boolean(query.force || query.refresh);
    return this.withCacheHeader(res, await this.githubService.getDeveloperAnalyticsCached(username, token, force));
  }

  @Get('profile/:username')
  @ApiOperation({
    summary: 'Proxy public GitHub user profile data',
    description:
      'Fetches public profile stats for a GitHub user. Results are cached for 10 minutes. Rate-limited to 30 requests/minute.',
  })
  @ApiParam({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'GitHub user not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.PROXY_LIMIT, ttl: GITHUB_RATE_LIMITS.PROXY_TTL } })
  async getProfile(
    @Param('username') username: string,
    @Query() query: GitHubQueryDto,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = this.extractToken(authHeader);
    const force = Boolean(query.force || query.refresh);
    return this.withCacheHeader(res, await this.githubService.getUserProfileCached(username, token, force));
  }

  @Get('repos/:username')
  @ApiOperation({
    summary: 'Proxy public GitHub repository metadata',
    description:
      'Fetches public repository metadata for a user. Results are cached for 5 minutes. Rate-limited to 30 requests/minute.',
  })
  @ApiParam({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiResponse({ status: 200, description: 'User repositories retrieved successfully' })
  @ApiResponse({ status: 404, description: 'GitHub user not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.PROXY_LIMIT, ttl: GITHUB_RATE_LIMITS.PROXY_TTL } })
  async getRepos(
    @Param('username') username: string,
    @Query() query: GitHubQueryDto,
    @Query('limit') limitStr?: string,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = this.extractToken(authHeader);
    const force = Boolean(query.force || query.refresh);
    const limit = limitStr ? parseInt(limitStr, 10) : 30;
    return this.withCacheHeader(res, await this.githubService.getUserReposCached(username, token, force, limit));
  }

  @Get('events/:username')
  @ApiOperation({
    summary: 'Proxy public GitHub activity events',
    description:
      'Fetches recent public events for a user. Results are cached for 3 minutes. Rate-limited to 30 requests/minute.',
  })
  @ApiParam({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiResponse({ status: 200, description: 'User events retrieved successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.PROXY_LIMIT, ttl: GITHUB_RATE_LIMITS.PROXY_TTL } })
  async getEvents(
    @Param('username') username: string,
    @Query() query: GitHubQueryDto,
    @Query('limit') limitStr?: string,
    @Headers('authorization') authHeader?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const token = this.extractToken(authHeader);
    const force = Boolean(query.force || query.refresh);
    const limit = limitStr ? parseInt(limitStr, 10) : 30;
    return this.withCacheHeader(res, await this.githubService.getUserEventsCached(username, token, force, limit));
  }

  @Delete('cache/:username')
  @ApiOperation({
    summary: 'Invalidate cached GitHub data for a user',
    description:
      'Evicts developer stats, profile, repos, and events caches for the specified username.',
  })
  @ApiParam({ name: 'username', required: true, type: String, example: 'torvalds' })
  @ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.STRICT_LIMIT, ttl: GITHUB_RATE_LIMITS.STRICT_TTL } })
  async invalidateCache(@Param('username') username: string) {
    return this.githubService.invalidateUserCache(username);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync GitHub profile data and bust cache',
    description:
      'Invalidates cache and pulls fresh developer analytics for the given username. Rate-limited to 10 requests/minute.',
  })
  @ApiResponse({ status: 200, description: 'User synced successfully' })
  @Throttle({ default: { limit: GITHUB_RATE_LIMITS.STRICT_LIMIT, ttl: GITHUB_RATE_LIMITS.STRICT_TTL } })
  async syncUser(
    @Body() syncDto: SyncGitHubProfileDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const token = this.extractToken(authHeader);
    return this.githubService.syncUser(syncDto.username, token);
  }

  /** x-cache: HIT (fresh cache), STALE-FALLBACK (stale copy or fallback data), MISS (fetched from GitHub). */
  private withCacheHeader<T extends { cached?: boolean; stale?: boolean }>(
    res: Response | undefined,
    result: T,
  ): T {
    res?.setHeader(
      'x-cache',
      result.stale ? 'STALE-FALLBACK' : result.cached ? 'HIT' : 'MISS',
    );
    return result;
  }

  private extractToken(authHeader?: string): string | undefined {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return undefined;
  }
}
