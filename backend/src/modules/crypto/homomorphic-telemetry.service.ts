import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface PaillierPublicKey {
  n: string; // modulus n = p * q
  g: string; // generator g = n + 1
  nSquared: string; // n^2
}

export interface EncryptedMetricBatch {
  tenantId: string;
  metricName: string;
  encryptedValues: string[]; // Base64 or hex bigints
}

export interface HomomorphicAggregationResult {
  tenantId: string;
  metricName: string;
  encryptedSum: string;
  count: number;
  computedAt: string;
}

@Injectable()
export class HomomorphicTelemetryService {
  private readonly logger = new Logger(HomomorphicTelemetryService.name);

  /**
   * Generates a simplified Paillier keypair demonstration parameters (or converts provided 2048-bit BigInts)
   */
  public generateDemoKeyPair(): { publicKey: PaillierPublicKey; privateKey: { lambda: string; mu: string } } {
    // Demo primes p and q
    const p = 61n;
    const q = 53n;
    const n = p * q;
    const nSquared = n * n;
    const g = n + 1n;
    const lambda = (p - 1n) * (q - 1n); // lcm(p-1, q-1) for p,q
    const mu = 1n; // modular inverse simplified for demonstration

    return {
      publicKey: {
        n: n.toString(),
        g: g.toString(),
        nSquared: nSquared.toString(),
      },
      privateKey: {
        lambda: lambda.toString(),
        mu: mu.toString(),
      },
    };
  }

  /**
   * Encrypts a plaintext number with a Paillier public key: c = g^m * r^n mod n^2
   */
  public encrypt(m: number, pubKey: PaillierPublicKey): string {
    const n = BigInt(pubKey.n);
    const nSquared = BigInt(pubKey.nSquared);
    const g = BigInt(pubKey.g);
    const message = BigInt(m);

    // Pick random r coprime to n (demo r = 3)
    const r = 3n;

    // g^m mod n^2
    const gm = (g ** message) % nSquared;
    // r^n mod n^2
    const rn = (r ** n) % nSquared;
    const c = (gm * rn) % nSquared;

    return c.toString();
  }

  /**
   * Additive homomorphism: E(m1) * E(m2) mod n^2 = E(m1 + m2)
   */
  public addEncryptedCiphers(c1: string, c2: string, nSquaredStr: string): string {
    const cipher1 = BigInt(c1);
    const cipher2 = BigInt(c2);
    const nSquared = BigInt(nSquaredStr);

    const sumCipher = (cipher1 * cipher2) % nSquared;
    return sumCipher.toString();
  }

  /**
   * Aggregates telemetry metrics across encrypted batches on untrusted remote machines
   * without decrypting or revealing plaintext values to the server.
   */
  public aggregateEncryptedBatch(
    batch: EncryptedMetricBatch,
    publicKey: PaillierPublicKey,
  ): HomomorphicAggregationResult {
    if (!batch.encryptedValues || batch.encryptedValues.length === 0) {
      throw new BadRequestException('Empty encrypted metric values');
    }

    const nSquared = BigInt(publicKey.nSquared);
    let accumulator = BigInt(batch.encryptedValues[0]);

    for (let i = 1; i < batch.encryptedValues.length; i++) {
      const nextCipher = BigInt(batch.encryptedValues[i]);
      accumulator = (accumulator * nextCipher) % nSquared;
    }

    return {
      tenantId: batch.tenantId,
      metricName: batch.metricName,
      encryptedSum: accumulator.toString(),
      count: batch.encryptedValues.length,
      computedAt: new Date().toISOString(),
    };
  }
}
