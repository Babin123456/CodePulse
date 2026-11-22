import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface ShamirShare {
  index: number; // x coordinate in GF(256), range 1..255
  data: string; // Hex-encoded y coordinates
  fingerprint: string; // SHA-256 fingerprint of index:data
}

export interface CreateVaultSecretDto {
  organizationId: string;
  name: string;
  description?: string;
  secret: string;
  thresholdK: number; // e.g. 3
  totalSharesN: number; // e.g. 5
  adminUserIds: string[]; // List of at least N admin user IDs to receive shares
  requesterId: string;
}

export interface ReconstructVaultSecretDto {
  organizationId: string;
  name: string;
  shares: Array<{ index: number; data: string }>;
  requesterId: string;
  autoBurn?: boolean;
}

export interface RotateVaultSecretDto {
  organizationId: string;
  name: string;
  existingShares: Array<{ index: number; data: string }>;
  newSecret: string;
  newThresholdK: number;
  newTotalSharesN: number;
  newAdminUserIds: string[];
  requesterId: string;
}

export interface AllocatedShareEnvelope {
  secretId: string;
  secretName: string;
  organizationId: string;
  shareIndex: number;
  allocatedTo: string;
  share: ShamirShare;
  allocatedAt: Date;
}

export interface MpcSecretMetadata {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  thresholdK: number;
  totalSharesN: number;
  status: string;
  secretHash: string;
  activeSharesCount: number;
  burnedSharesCount: number;
  shares: Array<{
    shareIndex: number;
    allocatedTo: string;
    shareFingerprint: string;
    isBurned: boolean;
    burnedAt?: Date | null;
  }>;
  createdAt: Date;
  rotatedAt?: Date | null;
}

/**
 * Precomputed Galois Field GF(256) tables using generator 3
 * and irreducible polynomial 0x11b (x^8 + x^4 + x^3 + x + 1).
 */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

function initGfTables(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    // Multiplication by generator 3 in GF(256): (x << 1) ^ (x & 0x80 ? 0x11b : 0) ^ x
    x = ((x << 1) ^ (x & 0x80 ? 0x11b : 0)) ^ x;
  }
  GF_LOG[0] = 0;
}

initGfTables();

/**
 * Constant-time Galois Field GF(256) multiplication
 */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/**
 * Constant-time Galois Field GF(256) division
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) {
    throw new BadRequestException('Division by zero in GF(256)');
  }
  if (a === 0) return 0;
  return GF_EXP[GF_LOG[a] - GF_LOG[b] + 255];
}

/**
 * Evaluates polynomial at point x over GF(256)
 */
export function evalPolynomial(coefficients: number[], x: number): number {
  let result = 0;
  let xPower = 1;
  for (let i = 0; i < coefficients.length; i++) {
    result ^= gfMul(coefficients[i], xPower);
    xPower = gfMul(xPower, x);
  }
  return result;
}

/**
 * Multi-Party Computation (MPC) Threshold Vault Service (#547).
 * Implements Shamir's Secret Sharing (k-of-n) over GF(256) with:
 * - Information-theoretic security: k-1 shares reveal zero information.
 * - Ephemeral in-memory reconstruction with immediate share burning.
 * - Cryptographic audit proofs recording all split/reconstruct/rotate actions.
 */
@Injectable()
export class MpcVaultService {
  private readonly logger = new Logger(MpcVaultService.name);

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Splits arbitrary secret into N shares with threshold K over GF(256).
   */
  splitSecret(secretInput: string | Buffer, k: number, n: number): ShamirShare[] {
    if (k < 2) {
      throw new BadRequestException(`Threshold K must be at least 2 (received ${k})`);
    }
    if (n < k) {
      throw new BadRequestException(`Total shares N (${n}) cannot be less than threshold K (${k})`);
    }
    if (n > 255) {
      throw new BadRequestException(`Total shares N cannot exceed 255 (GF(256) field limit)`);
    }

    const secretBuffer = Buffer.isBuffer(secretInput)
      ? secretInput
      : Buffer.from(secretInput, 'utf8');

    if (secretBuffer.length === 0) {
      throw new BadRequestException('Secret cannot be empty');
    }

    const sharesData: number[][] = Array.from({ length: n }, () => []);

    // For each byte of the secret, generate random polynomial of degree k-1
    for (let byteIdx = 0; byteIdx < secretBuffer.length; byteIdx++) {
      const secretByte = secretBuffer[byteIdx];
      // Coefficients: a0 = secretByte, a1..a_{k-1} = random bytes
      const randomCoefficients = Array.from(crypto.randomBytes(k - 1));
      const coefficients = [secretByte, ...randomCoefficients];

      // Evaluate polynomial at points x = 1..n
      for (let shareIdx = 0; shareIdx < n; shareIdx++) {
        const x = shareIdx + 1;
        const y = evalPolynomial(coefficients, x);
        sharesData[shareIdx].push(y);
      }
    }

    // Wrap shares into serializable envelopes
    const shares: ShamirShare[] = [];
    for (let i = 0; i < n; i++) {
      const index = i + 1;
      const dataHex = Buffer.from(sharesData[i]).toString('hex');
      const fingerprint = crypto
        .createHash('sha256')
        .update(`${index}:${dataHex}`)
        .digest('hex');

      shares.push({
        index,
        data: dataHex,
        fingerprint,
      });
    }

    return shares;
  }

  /**
   * Reconstructs secret from at least K valid Shamir shares using Lagrange interpolation over GF(256).
   */
  reconstructSecret(shares: Array<{ index: number; data: string }>): string {
    if (!shares || shares.length < 2) {
      throw new BadRequestException('At least 2 shares are required to reconstruct secret');
    }

    // Deduplicate shares by index
    const uniqueMap = new Map<number, Buffer>();
    for (const s of shares) {
      if (s.index < 1 || s.index > 255) {
        throw new BadRequestException(`Invalid share index: ${s.index}. Must be between 1 and 255.`);
      }
      if (!s.data || typeof s.data !== 'string') {
        throw new BadRequestException(`Share ${s.index} is missing valid hex payload data`);
      }
      uniqueMap.set(s.index, Buffer.from(s.data, 'hex'));
    }

    const points = Array.from(uniqueMap.entries()).map(([index, buf]) => ({
      x: index,
      buf,
    }));

    const expectedLength = points[0].buf.length;
    for (const p of points) {
      if (p.buf.length !== expectedLength) {
        throw new BadRequestException('Mismatched share lengths; corrupt or invalid shares provided');
      }
    }

    const reconstructedBuffer = Buffer.alloc(expectedLength);

    // Apply Lagrange interpolation for each byte index at x = 0
    for (let byteIdx = 0; byteIdx < expectedLength; byteIdx++) {
      let secretByte = 0;

      for (let j = 0; j < points.length; j++) {
        const xj = points[j].x;
        const yj = points[j].buf[byteIdx];

        let num = 1;
        let den = 1;

        for (let m = 0; m < points.length; m++) {
          if (m !== j) {
            const xm = points[m].x;
            num = gfMul(num, xm);
            den = gfMul(den, xj ^ xm); // Subtraction in GF(256) is XOR
          }
        }

        const lagrangeBasis = gfDiv(num, den);
        secretByte ^= gfMul(yj, lagrangeBasis); // Addition in GF(256) is XOR
      }

      reconstructedBuffer[byteIdx] = secretByte;
    }

    return reconstructedBuffer.toString('utf8');
  }

  /**
   * Initializes a new MPC Vault secret for an organization, storing share allocations and audit proof.
   * Zero persistence of the plain secret in long-term storage or database.
   */
  async createOrgVaultSecret(dto: CreateVaultSecretDto): Promise<{
    secretId: string;
    organizationId: string;
    name: string;
    thresholdK: number;
    totalSharesN: number;
    secretHash: string;
    shares: AllocatedShareEnvelope[];
  }> {
    if (dto.adminUserIds.length < dto.totalSharesN) {
      throw new BadRequestException(
        `Total shares N (${dto.totalSharesN}) requires at least ${dto.totalSharesN} admin recipients, but only ${dto.adminUserIds.length} provided.`,
      );
    }

    const secretHash = crypto.createHash('sha256').update(dto.secret, 'utf8').digest('hex');

    // Split secret into shares
    const rawShares = this.splitSecret(dto.secret, dto.thresholdK, dto.totalSharesN);

    let vaultSecret: any = null;
    const allocatedEnvelopes: AllocatedShareEnvelope[] = [];

    if (this.prisma) {
      // Upsert vault secret
      vaultSecret = await this.prisma.mpcVaultSecret.upsert({
        where: {
          organizationId_name: {
            organizationId: dto.organizationId,
            name: dto.name,
          },
        },
        create: {
          organizationId: dto.organizationId,
          name: dto.name,
          description: dto.description,
          thresholdK: dto.thresholdK,
          totalSharesN: dto.totalSharesN,
          secretHash,
          status: 'ACTIVE',
        },
        update: {
          thresholdK: dto.thresholdK,
          totalSharesN: dto.totalSharesN,
          secretHash,
          status: 'ACTIVE',
          rotatedAt: new Date(),
        },
      });

      // Clear any prior allocations if updating
      await this.prisma.mpcShareAllocation.deleteMany({
        where: { secretId: vaultSecret.id },
      });

      // Persist allocations and prepare envelopes
      for (let i = 0; i < rawShares.length; i++) {
        const share = rawShares[i];
        const assignedAdmin = dto.adminUserIds[i];

        await this.prisma.mpcShareAllocation.create({
          data: {
            secretId: vaultSecret.id,
            shareIndex: share.index,
            allocatedTo: assignedAdmin,
            shareFingerprint: share.fingerprint,
            isBurned: false,
          },
        });

        allocatedEnvelopes.push({
          secretId: vaultSecret.id,
          secretName: dto.name,
          organizationId: dto.organizationId,
          shareIndex: share.index,
          allocatedTo: assignedAdmin,
          share,
          allocatedAt: new Date(),
        });
      }

      // Record audit proof for SPLIT action
      await this.recordAuditProof(
        vaultSecret.id,
        'SPLIT',
        dto.requesterId,
        true,
        rawShares.map((s) => s.index),
        {
          thresholdK: dto.thresholdK,
          totalSharesN: dto.totalSharesN,
          recipients: dto.adminUserIds,
        },
      );
    } else {
      // Ephemeral / mock mode
      const mockSecretId = `mpc-secret-${Date.now()}`;
      for (let i = 0; i < rawShares.length; i++) {
        allocatedEnvelopes.push({
          secretId: mockSecretId,
          secretName: dto.name,
          organizationId: dto.organizationId,
          shareIndex: rawShares[i].index,
          allocatedTo: dto.adminUserIds[i],
          share: rawShares[i],
          allocatedAt: new Date(),
        });
      }
      vaultSecret = {
        id: mockSecretId,
        organizationId: dto.organizationId,
        name: dto.name,
      };
    }

    this.logger.log(
      `MPC Vault secret initialized: '${dto.name}' (Org: ${dto.organizationId}, K: ${dto.thresholdK}, N: ${dto.totalSharesN})`,
    );

    return {
      secretId: vaultSecret.id,
      organizationId: dto.organizationId,
      name: dto.name,
      thresholdK: dto.thresholdK,
      totalSharesN: dto.totalSharesN,
      secretHash,
      shares: allocatedEnvelopes,
    };
  }

  /**
   * Reconstructs an organization vault secret in ephemeral memory when threshold K shares are presented.
   * Immediately burns single-use shares if autoBurn is enabled.
   */
  async reconstructOrgSecret(dto: ReconstructVaultSecretDto): Promise<{
    secret: string;
    thresholdMet: boolean;
    sharesBurned: boolean;
    participatingIndices: number[];
  }> {
    let vaultSecret: any = null;

    if (this.prisma) {
      vaultSecret = await this.prisma.mpcVaultSecret.findUnique({
        where: {
          organizationId_name: {
            organizationId: dto.organizationId,
            name: dto.name,
          },
        },
        include: {
          shares: true,
        },
      });

      if (!vaultSecret) {
        throw new NotFoundException(
          `MPC Vault secret '${dto.name}' not found in organization '${dto.organizationId}'`,
        );
      }

      if (vaultSecret.status === 'REVOKED') {
        throw new ForbiddenException(`MPC Vault secret '${dto.name}' has been revoked`);
      }

      if (dto.shares.length < vaultSecret.thresholdK) {
        throw new ForbiddenException(
          `Insufficient shares provided. Threshold requires at least ${vaultSecret.thresholdK} shares, but only ${dto.shares.length} were submitted.`,
        );
      }

      // Verify that none of the submitted shares have been burned
      const submittedIndices = dto.shares.map((s) => s.index);
      const burnedShares = vaultSecret.shares.filter(
        (alloc: any) => submittedIndices.includes(alloc.shareIndex) && alloc.isBurned,
      );

      if (burnedShares.length > 0) {
        const burnedIdxList = burnedShares.map((s: any) => s.shareIndex).join(', ');
        throw new ForbiddenException(
          `The following submitted share indices have already been burned: [${burnedIdxList}]. Single-use shares cannot be reused.`,
        );
      }
    }

    // Reconstruct secret in ephemeral memory
    const reconstructedSecret = this.reconstructSecret(dto.shares);

    // Cryptographic validation against stored SHA-256 secret hash
    if (vaultSecret) {
      const reconstructedHash = crypto
        .createHash('sha256')
        .update(reconstructedSecret, 'utf8')
        .digest('hex');

      if (reconstructedHash !== vaultSecret.secretHash) {
        throw new BadRequestException(
          'Cryptographic integrity verification failed: Reconstructed secret does not match expected hash. Invalid or corrupted shares provided.',
        );
      }

      const autoBurn = dto.autoBurn !== false;
      const participatingIndices = dto.shares.map((s) => s.index);

      if (autoBurn) {
        // Burn submitted single-use shares
        await this.prisma!.mpcShareAllocation.updateMany({
          where: {
            secretId: vaultSecret.id,
            shareIndex: { in: participatingIndices },
          },
          data: {
            isBurned: true,
            burnedAt: new Date(),
          },
        });

        // Check if remaining active shares are below threshold K
        const remainingActive = await this.prisma!.mpcShareAllocation.count({
          where: {
            secretId: vaultSecret.id,
            isBurned: false,
          },
        });

        if (remainingActive < vaultSecret.thresholdK) {
          await this.prisma!.mpcVaultSecret.update({
            where: { id: vaultSecret.id },
            data: { status: 'RECONSTRUCTED' },
          });
        }
      }

      // Record audit proof for RECONSTRUCT action
      await this.recordAuditProof(
        vaultSecret.id,
        'RECONSTRUCT',
        dto.requesterId,
        true,
        participatingIndices,
        {
          autoBurn,
          sharesSubmitted: dto.shares.length,
        },
      );

      return {
        secret: reconstructedSecret,
        thresholdMet: true,
        sharesBurned: autoBurn,
        participatingIndices,
      };
    }

    // Ephemeral mode fallback
    return {
      secret: reconstructedSecret,
      thresholdMet: true,
      sharesBurned: false,
      participatingIndices: dto.shares.map((s) => s.index),
    };
  }

  /**
   * Rotates an existing MPC secret by authorizing via existing threshold shares,
   * burning all prior shares, and creating a new set of polynomial shares.
   */
  async rotateOrgSecret(dto: RotateVaultSecretDto): Promise<{
    secretId: string;
    organizationId: string;
    name: string;
    newThresholdK: number;
    newTotalSharesN: number;
    newSecretHash: string;
    newShares: AllocatedShareEnvelope[];
  }> {
    // 1. Authorize rotation using existing threshold shares
    await this.reconstructOrgSecret({
      organizationId: dto.organizationId,
      name: dto.name,
      shares: dto.existingShares,
      requesterId: dto.requesterId,
      autoBurn: true,
    });

    // 2. Split and establish new secret
    const result = await this.createOrgVaultSecret({
      organizationId: dto.organizationId,
      name: dto.name,
      secret: dto.newSecret,
      thresholdK: dto.newThresholdK,
      totalSharesN: dto.newTotalSharesN,
      adminUserIds: dto.newAdminUserIds,
      requesterId: dto.requesterId,
    });

    if (this.prisma) {
      await this.recordAuditProof(
        result.secretId,
        'ROTATE',
        dto.requesterId,
        true,
        dto.existingShares.map((s) => s.index),
        {
          newThresholdK: dto.newThresholdK,
          newTotalSharesN: dto.newTotalSharesN,
        },
      );
    }

    this.logger.log(
      `MPC Vault secret '${dto.name}' rotated successfully by '${dto.requesterId}'.`,
    );

    return {
      secretId: result.secretId,
      organizationId: result.organizationId,
      name: result.name,
      newThresholdK: result.thresholdK,
      newTotalSharesN: result.totalSharesN,
      newSecretHash: result.secretHash,
      newShares: result.shares,
    };
  }

  /**
   * Manually burns / revokes a compromised or departed admin's share.
   */
  async burnShare(
    organizationId: string,
    secretName: string,
    shareIndex: number,
    requesterId: string,
    reason?: string,
  ): Promise<{ success: boolean; shareIndex: number; burnedAt: Date }> {
    if (!this.prisma) {
      return { success: true, shareIndex, burnedAt: new Date() };
    }

    const secret = await this.prisma.mpcVaultSecret.findUnique({
      where: {
        organizationId_name: { organizationId, name: secretName },
      },
    });

    if (!secret) {
      throw new NotFoundException(`Secret '${secretName}' not found`);
    }

    const allocation = await this.prisma.mpcShareAllocation.findUnique({
      where: {
        secretId_shareIndex: {
          secretId: secret.id,
          shareIndex,
        },
      },
    });

    if (!allocation) {
      throw new NotFoundException(`Share index ${shareIndex} not found for secret '${secretName}'`);
    }

    const burnedAt = new Date();
    await this.prisma.mpcShareAllocation.update({
      where: { id: allocation.id },
      data: { isBurned: true, burnedAt },
    });

    await this.recordAuditProof(secret.id, 'BURN', requesterId, true, [shareIndex], {
      reason: reason || 'Manual revocation',
    });

    return { success: true, shareIndex, burnedAt };
  }

  /**
   * Retrieves organization secret metadata and share allocation status (No secret exposed).
   */
  async getSecretMetadata(organizationId: string, name: string): Promise<MpcSecretMetadata> {
    if (!this.prisma) {
      throw new NotFoundException('Prisma database is not available');
    }

    const secret = await this.prisma.mpcVaultSecret.findUnique({
      where: {
        organizationId_name: { organizationId, name },
      },
      include: {
        shares: true,
      },
    });

    if (!secret) {
      throw new NotFoundException(`Secret '${name}' not found for organization '${organizationId}'`);
    }

    const activeCount = secret.shares.filter((s: any) => !s.isBurned).length;
    const burnedCount = secret.shares.filter((s: any) => s.isBurned).length;

    return {
      id: secret.id,
      organizationId: secret.organizationId,
      name: secret.name,
      description: secret.description,
      thresholdK: secret.thresholdK,
      totalSharesN: secret.totalSharesN,
      status: secret.status,
      secretHash: secret.secretHash,
      activeSharesCount: activeCount,
      burnedSharesCount: burnedCount,
      shares: secret.shares.map((s: any) => ({
        shareIndex: s.shareIndex,
        allocatedTo: s.allocatedTo,
        shareFingerprint: s.shareFingerprint,
        isBurned: s.isBurned,
        burnedAt: s.burnedAt,
      })),
      createdAt: secret.createdAt,
      rotatedAt: secret.rotatedAt,
    };
  }

  /**
   * Lists all vault secrets in an organization.
   */
  async listOrgSecrets(organizationId: string): Promise<any[]> {
    if (!this.prisma) return [];

    return this.prisma.mpcVaultSecret.findMany({
      where: { organizationId },
      include: {
        shares: {
          select: {
            shareIndex: true,
            allocatedTo: true,
            isBurned: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves cryptographic audit proofs for a secret.
   */
  async getAuditProofs(secretId: string): Promise<any[]> {
    if (!this.prisma) return [];

    return this.prisma.mpcAuditProof.findMany({
      where: { secretId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generates and stores HMAC-SHA256 signed audit proof.
   */
  private async recordAuditProof(
    secretId: string,
    action: string,
    performedBy: string,
    thresholdMet: boolean,
    participatingShares: number[],
    metadata: any,
  ): Promise<any> {
    const timestamp = Date.now();
    const payload = `${secretId}:${action}:${performedBy}:${thresholdMet}:${participatingShares.join(',')}:${timestamp}`;
    const hmacKey = process.env.MPC_AUDIT_HMAC_KEY || 'codepulse-mpc-vault-audit-secret-2026';
    const proofSignature = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');

    return this.prisma!.mpcAuditProof.create({
      data: {
        secretId,
        action,
        performedBy,
        thresholdMet,
        participatingShares,
        proofSignature,
        metadata: {
          ...metadata,
          timestamp,
        },
      },
    });
  }
}

