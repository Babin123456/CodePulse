import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncCronService } from './sync.cron';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [GithubModule],
  providers: [SyncService, SyncCronService],
  exports: [SyncService, SyncCronService],
})
export class SyncModule {}
