import { Global, Module } from '@nestjs/common';
import { AcmeCertService } from './acme-cert.service';
import { TlsReloaderService } from '../../common/services/tls-reloader.service';
import { VaultService } from './vault.service';
import { VaultRotationService } from './vault-rotation.service';
import { MpcVaultService } from './mpc-vault.service';
import { PowService } from './pow.service';
import { PowController } from './pow.controller';
import { SecurityController } from './security.controller';
import { TyposquatScannerService } from './typosquat-scanner.service';
import { PowChallengeGuard } from '../../common/guards/pow-challenge.guard';
import { ThreatDetectorService } from './threat-detector.service';
import { ThreatMonitorInterceptor } from '../../common/interceptors/threat-monitor.interceptor';
import {
  MtlsMeshService,
  MtlsVerificationMiddleware,
} from '../../common/security/mtls.config';

@Global()
@Module({
  controllers: [PowController, SecurityController],
  providers: [
    AcmeCertService,
    TlsReloaderService,
    VaultService,
    VaultRotationService,
    MpcVaultService,
    PowService,
    PowChallengeGuard,
    ThreatDetectorService,
    ThreatMonitorInterceptor,
    MtlsMeshService,
    MtlsVerificationMiddleware,
    TyposquatScannerService,
  ],
  exports: [
    AcmeCertService,
    TlsReloaderService,
    VaultService,
    VaultRotationService,
    MpcVaultService,
    PowService,
    PowChallengeGuard,
    ThreatDetectorService,
    ThreatMonitorInterceptor,
    MtlsMeshService,
    MtlsVerificationMiddleware,
    TyposquatScannerService,
  ],
})
export class SecurityModule {}

