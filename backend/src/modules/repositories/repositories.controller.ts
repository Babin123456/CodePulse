import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Response as Res,
  Headers,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader, ApiQuery, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { RepositoriesService } from './repositories.service';
import { ArchiveStreamService } from './archive-stream.service';
import { ZeroCopyStreamService } from './zero-copy-stream.service';
import { QueryRepositoriesDto } from './dto/repositories.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('repositories')
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly archiveStreamService: ArchiveStreamService,
    private readonly zeroCopyStreamService: ZeroCopyStreamService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get paginated repositories for the authenticated user with filtering and sorting',
  })
  async getRepositories(
    @Request() req: any,
    @Query() query: QueryRepositoriesDto,
  ) {
    return this.repositoriesService.getRepositories(req.user.id, query);
  }

  @Get('languages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get distinct programming languages for the authenticated user',
  })
  async getUserLanguages(@Request() req: any) {
    return this.repositoriesService.getUserLanguages(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repository details by ID' })
  async getRepositoryById(@Request() req: any, @Param('id') id: string) {
    return this.repositoriesService.getRepositoryById(req.user.id, id);
  }

  @Get(':id/download.zip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Download repository archive as a zero-copy streaming ZIP with HTTP Range Request support',
  })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'HTTP Range request header (e.g. bytes=0-1048575)',
  })
  async downloadRepositoryZip(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('range') rangeHeader?: string,
    @Headers('accept-encoding') acceptEncoding?: string,
  ) {
    const userId = req.user?.id || req.user?.sub || 'anonymous';
    return this.archiveStreamService.streamRepositoryArchive(
      userId,
      id,
      res,
      {
        rangeHeader,
        acceptEncoding,
      },
    );
  }

  @Get(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Download repository archive as a zero-copy stream (tar.gz or zip) with HTTP Range support',
  })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  async streamRepositoryArchive(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('format') format?: 'tar.gz' | 'zip' | 'tar',
    @Headers('range') rangeHeader?: string,
    @Headers('accept-encoding') acceptEncoding?: string,
  ) {
    const userId = req.user?.id || req.user?.sub || 'anonymous';
    return this.zeroCopyStreamService.streamArchive(userId, id, res, {
      format,
      rangeHeader,
      acceptEncoding,
    });
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger on-demand synchronization for a specific repository',
  })
  async syncRepository(@Request() req: any, @Param('id') id: string) {
    return this.repositoriesService.syncRepository(req.user.id, id);
  }

  @Get(':id/ast')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve pre-parsed AST tree with sub-millisecond RocksDB lookup (#549)',
  })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiQuery({ name: 'commitSha', required: true })
  @ApiQuery({ name: 'filePath', required: true })
  async getFileAst(
    @Request() req: any,
    @Param('id') id: string,
    @Query('commitSha') commitSha: string,
    @Query('filePath') filePath: string,
  ) {
    return this.repositoriesService.getFileAst(req.user.id, id, commitSha, filePath);
  }

  @Get(':id/symbols')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve pre-parsed symbol table with sub-millisecond RocksDB lookup (#549)',
  })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiQuery({ name: 'commitSha', required: true })
  @ApiQuery({ name: 'filePath', required: true })
  async getFileSymbols(
    @Request() req: any,
    @Param('id') id: string,
    @Query('commitSha') commitSha: string,
    @Query('filePath') filePath: string,
  ) {
    return this.repositoriesService.getFileSymbols(req.user.id, id, commitSha, filePath);
  }

  @Get(':id/workspace-symbols')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve all file symbols across workspace for a given commit SHA (#549)',
  })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiQuery({ name: 'commitSha', required: true })
  async getWorkspaceSymbols(
    @Request() req: any,
    @Param('id') id: string,
    @Query('commitSha') commitSha: string,
  ) {
    return this.repositoriesService.getWorkspaceSymbols(req.user.id, id, commitSha);
  }
}
