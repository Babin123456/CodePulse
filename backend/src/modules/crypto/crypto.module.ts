import { Module } from '@nestjs/common';
import { ZkpVerifierService } from './zkp-verifier.service';
import { HomomorphicTelemetryService } from './homomorphic-telemetry.service';
import { CryptoController } from './crypto.controller';

@Module({
  controllers: [CryptoController],
  providers: [ZkpVerifierService, HomomorphicTelemetryService],
  exports: [ZkpVerifierService, HomomorphicTelemetryService],
})
export class CryptoModule {}

