import { Module } from '@nestjs/common';
import { ZkpVerifierService } from './zkp-verifier.service';
import { ZkSnarkVerifierService } from './zk-snark-verifier.service';
import { CryptoController } from './crypto.controller';

@Module({
  controllers: [CryptoController],
  providers: [ZkpVerifierService, ZkSnarkVerifierService],
  exports: [ZkpVerifierService, ZkSnarkVerifierService],
})
export class CryptoModule {}

