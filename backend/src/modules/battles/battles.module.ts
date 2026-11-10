import { Module } from '@nestjs/common';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { BattlesGateway } from './battles.gateway';

@Module({
  controllers: [BattlesController],
  providers: [BattlesService, BattlesGateway],
  exports: [BattlesService, BattlesGateway],
})
export class BattlesModule {}
