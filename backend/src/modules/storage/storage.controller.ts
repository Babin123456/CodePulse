import {
  Controller,
  Get,
  Param,
  Res,
  Headers,
  HttpStatus,
  Post,
  Body,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { MmapStorageService } from './mmap-storage.service';
import type { MmapEngineStats } from './mmap-storage.service';
import { MmapAssetsService } from './mmap-assets.service';
import type { MmapBenchmarkResult } from './mmap-assets.service';
import { RocksDbService } from './rocksdb.service';
import type {
  RocksDbStats,
  RocksDbBenchmarkResult,
  ParsedAstPayload,
  FileSymbolTable,
} from './rocksdb.service';
import { WorkspaceStateService } from './workspace-state.service';
import type { UnsavedDraftState } from './workspace-state.service';
import { HsmService } from './hsm.service';
import type {
  StorageTierAuditReport,
  RestorationProgress,
  RetrievedCommitArchive,
  RetrievedReplayArchive,
} from './hsm.service';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly mmapStorage: MmapStorageService,
    private readonly mmapAssets: MmapAssetsService,
    private readonly rocksDb: RocksDbService,
    private readonly workspaceState: WorkspaceStateService,
    private readonly hsmService: HsmService,
  ) {}

  @Get('rocksdb/stats')
  @ApiOperation({
    summary: 'Get embedded RocksDB LSM-Tree key-value store metrics',
  })
  getRocksDbStats(): RocksDbStats {
    return this.rocksDb.getStats();
  }

  @Get('rocksdb/benchmark')
  @ApiOperation({
    summary: 'Run high-throughput RocksDB key-value lookup benchmark (50,000+ ops/sec, sub-0.2ms latency #549)',
  })
  @ApiQuery({ name: 'iterations', required: false })
  async runRocksDbBenchmark(
    @Query('iterations') iterations?: string,
  ): Promise<RocksDbBenchmarkResult> {
    const iters = iterations ? parseInt(iterations, 10) : 50000;
    return this.rocksDb.runBenchmark(iters);
  }

  @Post('rocksdb/compact')
  @ApiOperation({
    summary: 'Trigger manual SSTable disk compaction and reclaim stale key space',
  })
  async triggerRocksDbCompaction() {
    return this.rocksDb.compact();
  }

  @Post('rocksdb/ast')
  @ApiOperation({
    summary: 'Store pre-parsed AST tree in RocksDB indexed by commit SHA and file path (#549)',
  })
  @ApiBody({ description: 'Parsed AST payload' })
  async putAst(
    @Body('commitSha') commitSha: string,
    @Body('filePath') filePath: string,
    @Body('ast') ast: ParsedAstPayload,
  ) {
    await this.rocksDb.putAst(commitSha, filePath, ast);
    return { success: true, key: this.rocksDb.buildAstKey(commitSha, filePath) };
  }

  @Get('rocksdb/ast')
  @ApiOperation({
    summary: 'Retrieve cached AST tree with sub-millisecond local latency (#549)',
  })
  @ApiQuery({ name: 'commitSha', required: true })
  @ApiQuery({ name: 'filePath', required: true })
  async getAst(
    @Query('commitSha') commitSha: string,
    @Query('filePath') filePath: string,
  ): Promise<ParsedAstPayload | null> {
    return this.rocksDb.getAst(commitSha, filePath);
  }

  @Post('rocksdb/symbols')
  @ApiOperation({
    summary: 'Store pre-parsed file symbol table in RocksDB indexed by commit SHA and file path (#549)',
  })
  async putSymbols(
    @Body('commitSha') commitSha: string,
    @Body('filePath') filePath: string,
    @Body('symbols') symbols: FileSymbolTable,
  ) {
    await this.rocksDb.putSymbols(commitSha, filePath, symbols);
    return { success: true, key: this.rocksDb.buildSymbolKey(commitSha, filePath) };
  }

  @Get('rocksdb/symbols')
  @ApiOperation({
    summary: 'Retrieve cached file symbol table with sub-millisecond local latency (#549)',
  })
  @ApiQuery({ name: 'commitSha', required: true })
  @ApiQuery({ name: 'filePath', required: true })
  async getSymbols(
    @Query('commitSha') commitSha: string,
    @Query('filePath') filePath: string,
  ): Promise<FileSymbolTable | null> {
    return this.rocksDb.getSymbols(commitSha, filePath);
  }

  @Get('rocksdb/workspace-symbols/:commitSha')
  @ApiOperation({
    summary: 'Retrieve all file symbols across the workspace for a commit SHA (#549)',
  })
  @ApiParam({ name: 'commitSha' })
  async getWorkspaceSymbols(
    @Param('commitSha') commitSha: string,
  ): Promise<FileSymbolTable[]> {
    return this.rocksDb.getWorkspaceSymbols(commitSha);
  }

  @Post('workspace/draft')
  @ApiOperation({
    summary: 'Save transient unsaved editor draft with microsecond write latency in RocksDB',
  })
  @ApiBody({ description: 'Editor draft payload' })
  async saveDraft(@Body() draft: UnsavedDraftState) {
    await this.workspaceState.saveDraft(draft);
    return { success: true, key: this.workspaceState.getWorkspaceKey(draft.userId, draft.fileId) };
  }

  @Get('workspace/draft/:userId/:fileId')
  @ApiOperation({
    summary: 'Retrieve transient unsaved editor draft from RocksDB',
  })
  @ApiParam({ name: 'userId' })
  @ApiParam({ name: 'fileId' })
  async getDraft(
    @Param('userId') userId: string,
    @Param('fileId') fileId: string,
  ) {
    const draft = await this.workspaceState.getDraft(userId, fileId);
    return { success: true, draft };
  }

  @Post('workspace/flush')
  @ApiOperation({
    summary: 'Flush finalized code drafts to persistent store and prune RocksDB state upon commit',
  })
  async flushDrafts(
    @Body('userId') userId: string,
    @Body('fileIds') fileIds: string[],
    @Body('commitSha') commitSha?: string,
  ) {
    return this.workspaceState.flushCommittedDrafts(userId, fileIds, commitSha);
  }

  @Get('tiers/audit')
  @ApiOperation({
    summary:
      'Audit multi-tier hierarchical storage distribution (Hot NVMe, Warm S3, Cold Glacier) and cost savings',
  })
  async getStorageTiersAudit(): Promise<StorageTierAuditReport> {
    return this.hsmService.getStorageTierAudit();
  }

  @Get('commit/:repositoryId/:commitSha')
  @ApiOperation({
    summary:
      'Transparently retrieve commit diff across Hot SSD, Warm S3, or Cold Glacier storage tiers',
  })
  @ApiParam({ name: 'repositoryId', description: 'Repository ID' })
  @ApiParam({ name: 'commitSha', description: 'Commit SHA hash' })
  async getCommitDiff(
    @Param('repositoryId') repositoryId: string,
    @Param('commitSha') commitSha: string,
  ): Promise<RetrievedCommitArchive> {
    return this.hsmService.getCommitDiff(repositoryId, commitSha);
  }

  @Get('replay/:battleId')
  @ApiOperation({
    summary:
      'Transparently retrieve match replay recording across Hot NVMe, Warm S3, or Cold Glacier',
  })
  @ApiParam({ name: 'battleId', description: 'Battle UUID' })
  async getMatchReplay(
    @Param('battleId') battleId: string,
  ): Promise<RetrievedReplayArchive> {
    return this.hsmService.getMatchReplay(battleId);
  }

  @Post('hsm/lifecycle')
  @ApiOperation({
    summary:
      'Trigger HSM lifecycle policy tiering migration (>30d to Warm S3, >90d to Cold Glacier)',
  })
  async triggerLifecycleMigration() {
    return this.hsmService.runLifecycleTieringMigration();
  }

  @Post('hsm/restore/:assetId')
  @ApiOperation({
    summary: 'Initiate on-demand AWS S3 Glacier restoration for an archived cold asset',
  })
  @ApiParam({ name: 'assetId', description: 'Asset Archive ID or Commit SHA' })
  @ApiQuery({ name: 'tier', required: false, enum: ['Expedited', 'Standard', 'Bulk'] })
  async initiateRestore(
    @Param('assetId') assetId: string,
    @Query('tier') tier?: 'Expedited' | 'Standard' | 'Bulk',
  ): Promise<RestorationProgress> {
    return this.hsmService.initiateGlacierRestore(assetId, tier || 'Standard');
  }

  @Get('hsm/restore/status/:assetId')
  @ApiOperation({
    summary: 'Check ongoing Glacier asset restoration progress and estimated availability',
  })
  @ApiParam({ name: 'assetId', description: 'Asset Archive ID or Commit SHA' })
  async getRestoreStatus(
    @Param('assetId') assetId: string,
  ): Promise<RestorationProgress> {
    return this.hsmService.getRestorationStatus(assetId);
  }

  @Get('mmap/benchmark')
  @ApiOperation({
    summary:
      'Benchmark memory-mapped file (mmap) zero-copy throughput vs standard fs.readFile (4x throughput, sub-ms read times)',
  })
  getMmapBenchmark(
    @Query('assetKey') assetKey?: string,
    @Query('iterations') iterations?: string,
  ): MmapBenchmarkResult {
    const iters = iterations ? parseInt(iterations, 10) : 1000;
    return this.mmapAssets.runBenchmark(assetKey || 'editor.worker.js', isNaN(iters) ? 1000 : iters);
  }

  @Get('mmap/stats')
  @Get('monaco/stats')
  @ApiOperation({
    summary: 'Get Memory-Mapped File (mmap) Storage Engine zero-copy performance metrics',
  })
  getStats(): MmapEngineStats {
    return this.mmapAssets.getStats();
  }

  @Post('mmap/reload/*assetKey')
  @Post('monaco/reload/*assetKey')
  @ApiOperation({
    summary: 'Hot-reload and remap a Monaco asset into virtual memory without restart',
  })
  @ApiParam({ name: 'assetKey', description: 'Relative path of the Monaco asset' })
  hotReload(@Param('assetKey') rawKey: string | string[]) {
    const assetKey = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;
    const remapped = this.mmapAssets.hotReloadAsset(assetKey);
    return {
      success: true,
      assetKey: remapped.metadata.assetKey,
      sizeBytes: remapped.metadata.sizeBytes,
      etag: remapped.metadata.etag,
      mappedAt: remapped.metadata.mappedAt,
    };
  }

  @Get('mmap/assets/*assetKey')
  @Get('monaco/*assetKey')
  @ApiOperation({
    summary:
      'Serve Monaco WebWorker bundles and language grammars directly from OS memory-mapped virtual memory (Zero-Copy)',
  })
  @ApiParam({ name: 'assetKey', description: 'Relative path of the Monaco asset bundle' })
  @ApiResponse({ status: 200, description: 'Direct zero-copy memory stream' })
  @ApiResponse({ status: 304, description: 'Not Modified (ETag matched in cache)' })
  serveAsset(
    @Param('assetKey') rawKey: string | string[],
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const assetKey = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;
    const { buffer, metadata } = this.mmapAssets.getMemoryMappedAsset(assetKey);

    // Fast 304 check without buffer copy
    if (ifNoneMatch && ifNoneMatch === metadata.etag) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }

    res.set({
      'Content-Type': metadata.contentType,
      'Content-Length': metadata.sizeBytes.toString(),
      'ETag': metadata.etag,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Storage-Engine': 'Memory-Mapped-File-ZeroCopy',
      'X-Virtual-Memory-Pages': metadata.pageCount.toString(),
      'X-Advisory-Flags': metadata.advisoryApplied,
    });

    // Zero-copy transfer: sends the memory-mapped buffer straight to kernel socket
    res.status(HttpStatus.OK).end(buffer);
  }
}


