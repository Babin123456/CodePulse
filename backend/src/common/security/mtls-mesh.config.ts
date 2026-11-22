import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { Logger } from '@nestjs/common';

export interface MtlsConfigOptions {
  caCertPath?: string;
  serverCertPath?: string;
  serverKeyPath?: string;
  enforceMtls?: boolean;
}

export class MtlsMeshConfig {
  private static readonly logger = new Logger(MtlsMeshConfig.name);

  public static getHttpsServerOptions(options: MtlsConfigOptions = {}): https.ServerOptions | null {
    const isMtlsEnabled = options.enforceMtls ?? (process.env.MTLS_ENABLED === 'true');
    if (!isMtlsEnabled) {
      return null;
    }

    const caPath = options.caCertPath || process.env.MTLS_CA_CERT_PATH || path.resolve('deploy/certs/ca-cert.pem');
    const certPath = options.serverCertPath || process.env.MTLS_SERVER_CERT_PATH || path.resolve('deploy/certs/server-cert.pem');
    const keyPath = options.serverKeyPath || process.env.MTLS_SERVER_KEY_PATH || path.resolve('deploy/certs/server-key.pem');

    try {
      if (!fs.existsSync(caPath) || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        this.logger.warn('mTLS certificates not found on disk; falling back to standard TLS');
        return null;
      }

      const ca = fs.readFileSync(caPath);
      const cert = fs.readFileSync(certPath);
      const key = fs.readFileSync(keyPath);

      return {
        ca,
        cert,
        key,
        requestCert: true,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.3',
      };
    } catch (err: any) {
      this.logger.error(`Failed to configure mTLS mesh: ${err?.message}`);
      return null;
    }
  }

  public static validatePeerCertificate(cert: any, allowedCnPattern: RegExp = /^runner-worker-.*\.codepulse\.internal$/): boolean {
    if (!cert || !cert.subject) return false;
    const cn = cert.subject.CN;
    return allowedCnPattern.test(cn);
  }
}
