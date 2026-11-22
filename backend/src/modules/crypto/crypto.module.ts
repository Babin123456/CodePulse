import { Module } from '@nestjs/common';
import { ZkpVerifierService } from './zkp-verifier.service';
import { HomomorphicTelemetryService } from './homomorphic-telemetry.service';
import { ZkSnarkVerifierService } from './zk-snark-verifier.service';
import { CryptoController } from './crypto.controller';

@Module({
  controllers: [CryptoController],
  providers: [ZkpVerifierService, HomomorphicTelemetryService, ZkSnarkVerifierService],
  exports: [ZkpVerifierService, HomomorphicTelemetryService, ZkSnarkVerifierService],
})
export class CryptoModule {}
