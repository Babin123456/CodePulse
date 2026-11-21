import { Module } from '@nestjs/common';
import { BattlesController } from './battles.controller';
import { TournamentsController } from './tournaments.controller';
import { BattlesService } from './battles.service';
import { BattlesGateway } from './battles.gateway';
import { SeasonResetService } from './season-reset.service';
import { BullModule } from '@nestjs/bullmq';
import { RatingDecayService } from './rating-decay.service';
import { RatingDecayWorker } from './rating-decay.worker';
import { RatingDecayScheduler } from './rating-decay.scheduler';
import { BattlesLifecycleScheduler } from './battles-lifecycle.scheduler';
import { BattlesLifecycleWorker } from './battles-lifecycle.worker';
import { MetricsModule } from '../metrics/metrics.module';
import { XpModule } from '../xp/xp.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ReplayStreamService } from './replay-stream.service';
import { CryptoModule } from '../crypto/crypto.module';
import { WatermarkService } from './watermark.service';

import { HypeMeterService } from './hype-meter.service';
import { TournamentEngineService } from './tournament-engine.service';
import { EsportsModule } from '../esports/esports.module';
import { RaidBossService } from './raid-boss.service';
import { AntiSmurfService } from './anti-smurf.service';
import { AntiCheatBiometricsService } from './anti-cheat-biometrics.service';


@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'rating-decay' },
      { name: 'battles-lifecycle' },
      { name: 'tournament-engine' },
    ),
    MetricsModule,
    XpModule,
    AnalyticsModule,
    CryptoModule,
    EsportsModule,
  ],
  controllers: [BattlesController, TournamentsController],
  providers: [
    BattlesService,
    BattlesGateway,
    SeasonResetService,
    RatingDecayService,
    RatingDecayWorker,
    RatingDecayScheduler,
    BattlesLifecycleScheduler,
    BattlesLifecycleWorker,
    ReplayStreamService,
    WatermarkService,
    HypeMeterService,
    TournamentEngineService,
    RaidBossService,
    AntiSmurfService,
    AntiCheatBiometricsService,
  ],
  exports: [
    BattlesService,
    BattlesGateway,
    ReplayStreamService,
    WatermarkService,
    HypeMeterService,
    TournamentEngineService,
    RaidBossService,
    AntiSmurfService,
    AntiCheatBiometricsService,
  ],
})
export class BattlesModule {}
