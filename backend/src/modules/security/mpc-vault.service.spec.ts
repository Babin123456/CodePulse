import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MpcVaultService, gfMul, gfDiv } from './mpc-vault.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MpcVaultService (Threshold Cryptography & Shamir MPC #547)', () => {
  let service: MpcVaultService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      mpcVaultSecret: {
        upsert: jest.fn(async ({ create }: any) => ({
          id: 'vault-uuid-1',
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(async ({ data }: any) => ({
          id: 'vault-uuid-1',
          ...data,
        })),
      },
      mpcShareAllocation: {
        create: jest.fn(async ({ data }: any) => ({
          id: `alloc-uuid-${data.shareIndex}`,
          ...data,
        })),
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        update: jest.fn(async ({ data }: any) => ({
          id: 'alloc-uuid-1',
          ...data,
        })),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      mpcAuditProof: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'proof-uuid-1',
          ...data,
          createdAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new MpcVaultService(mockPrisma as unknown as PrismaService);
  });

  describe('Galois Field GF(256) Arithmetic', () => {
    it('satisfies finite field multiplication and division identities', () => {
      // Identity: a * 1 = a
      expect(gfMul(42, 1)).toBe(42);
      expect(gfMul(137, 1)).toBe(137);

      // Annihilation: a * 0 = 0
      expect(gfMul(200, 0)).toBe(0);

      // Inversion: a / a = 1
      for (let a = 1; a < 255; a += 17) {
        expect(gfDiv(a, a)).toBe(1);
      }

      // Distributivity / reciprocity: (a * b) / b = a
      for (let a = 1; a < 255; a += 23) {
        for (let b = 1; b < 255; b += 31) {
          const product = gfMul(a, b);
          expect(gfDiv(product, b)).toBe(a);
        }
      }
    });

    it('throws BadRequestException on division by zero in GF(256)', () => {
      expect(() => gfDiv(50, 0)).toThrow(BadRequestException);
    });
  });

  describe('Shamir Secret Sharing (k-of-n Polynomial Threshold)', () => {
    it('splits and reconstructs secret with arbitrary (k, n) = (3, 5)', () => {
      const secret = 'DEPLOYMENT_MASTER_PRIVATE_KEY_PROD_2026';
      const shares = service.splitSecret(secret, 3, 5);

      expect(shares).toHaveLength(5);
      expect(shares[0].index).toBe(1);
      expect(shares[4].index).toBe(5);

      // Any 3 shares out of 5 must reconstruct original secret
      const subset1 = [shares[0], shares[1], shares[2]]; // shares 1, 2, 3
      expect(service.reconstructSecret(subset1)).toBe(secret);

      const subset2 = [shares[1], shares[3], shares[4]]; // shares 2, 4, 5
      expect(service.reconstructSecret(subset2)).toBe(secret);

      const subset3 = [shares[0], shares[2], shares[4]]; // shares 1, 3, 5
      expect(service.reconstructSecret(subset3)).toBe(secret);
    });

    it('supports arbitrary (k, n) = (2, 3) and (4, 7) configurations', () => {
      const secret23 = 'TOKEN_SECRET_2_OF_3';
      const shares23 = service.splitSecret(secret23, 2, 3);
      expect(service.reconstructSecret([shares23[0], shares23[2]])).toBe(secret23);

      const secret47 = 'HIGH_SECURITY_CORE_ROOT_CERT';
      const shares47 = service.splitSecret(secret47, 4, 7);
      const sub47 = [shares47[1], shares47[2], shares47[5], shares47[6]];
      expect(service.reconstructSecret(sub47)).toBe(secret47);
    });

    it('rejects invalid threshold parameters (k < 2, n < k, n > 255)', () => {
      expect(() => service.splitSecret('test', 1, 5)).toThrow(BadRequestException);
      expect(() => service.splitSecret('test', 4, 3)).toThrow(BadRequestException);
      expect(() => service.splitSecret('test', 3, 300)).toThrow(BadRequestException);
    });

    it('rejects tampered or corrupt share payloads', () => {
      const secret = 'ORIGINAL_IMMUTABLE_SECRET';
      const shares = service.splitSecret(secret, 2, 3);

      // Tamper with share 1 payload
      const tamperedShare = {
        index: shares[0].index,
        data: 'ff' + shares[0].data.slice(2),
      };

      const result = service.reconstructSecret([tamperedShare, shares[1]]);
      // Must not match original secret
      expect(result).not.toBe(secret);
    });
  });

  describe('Organization MPC Vault Management', () => {
    it('creates vault secret, distributes shares to admins, and logs SPLIT audit proof', async () => {
      const adminUsers = ['admin-alice', 'admin-bob', 'admin-carol', 'admin-david', 'admin-eve'];

      const result = await service.createOrgVaultSecret({
        organizationId: 'org-nexus',
        name: 'PROD_KUBE_SECRET',
        secret: 'CLUSTER_ADMIN_TOKEN_999',
        thresholdK: 3,
        totalSharesN: 5,
        adminUserIds: adminUsers,
        requesterId: 'admin-alice',
      });

      expect(result.secretId).toBeDefined();
      expect(result.thresholdK).toBe(3);
      expect(result.totalSharesN).toBe(5);
      expect(result.shares).toHaveLength(5);
      expect(result.shares[0].allocatedTo).toBe('admin-alice');
      expect(result.shares[4].allocatedTo).toBe('admin-eve');

      // Verify Prisma allocations and audit proof
      expect(mockPrisma.mpcVaultSecret.upsert).toHaveBeenCalled();
      expect(mockPrisma.mpcShareAllocation.create).toHaveBeenCalledTimes(5);
      expect(mockPrisma.mpcAuditProof.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SPLIT',
            thresholdMet: true,
          }),
        }),
      );
    });

    it('reconstructs secret in ephemeral memory with auto-burn of single-use shares', async () => {
      const secret = 'DATABASE_ENCRYPTION_MASTER_KEY';
      const rawShares = service.splitSecret(secret, 3, 5);
      const secretHash = require('crypto').createHash('sha256').update(secret).digest('hex');

      mockPrisma.mpcVaultSecret.findUnique.mockResolvedValueOnce({
        id: 'vault-uuid-1',
        organizationId: 'org-corp',
        name: 'DB_KEY',
        thresholdK: 3,
        totalSharesN: 5,
        status: 'ACTIVE',
        secretHash,
        shares: [
          { shareIndex: 1, allocatedTo: 'u1', isBurned: false },
          { shareIndex: 2, allocatedTo: 'u2', isBurned: false },
          { shareIndex: 3, allocatedTo: 'u3', isBurned: false },
          { shareIndex: 4, allocatedTo: 'u4', isBurned: false },
          { shareIndex: 5, allocatedTo: 'u5', isBurned: false },
        ],
      });

      const submittedShares = [rawShares[0], rawShares[2], rawShares[4]];

      const reconstructResult = await service.reconstructOrgSecret({
        organizationId: 'org-corp',
        name: 'DB_KEY',
        shares: submittedShares,
        requesterId: 'u1',
        autoBurn: true,
      });

      expect(reconstructResult.secret).toBe(secret);
      expect(reconstructResult.thresholdMet).toBe(true);
      expect(reconstructResult.sharesBurned).toBe(true);

      // Verify participating shares are marked burned
      expect(mockPrisma.mpcShareAllocation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shareIndex: { in: [1, 3, 5] },
          }),
          data: expect.objectContaining({
            isBurned: true,
          }),
        }),
      );

      // Verify RECONSTRUCT audit proof recorded
      expect(mockPrisma.mpcAuditProof.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RECONSTRUCT',
            participatingShares: [1, 3, 5],
          }),
        }),
      );
    });

    it('rejects reconstruction when any submitted share has already been burned', async () => {
      mockPrisma.mpcVaultSecret.findUnique.mockResolvedValueOnce({
        id: 'vault-uuid-1',
        organizationId: 'org-corp',
        name: 'DB_KEY',
        thresholdK: 3,
        totalSharesN: 5,
        status: 'ACTIVE',
        secretHash: 'hash',
        shares: [
          { shareIndex: 1, allocatedTo: 'u1', isBurned: true, burnedAt: new Date() }, // BURNED
          { shareIndex: 2, allocatedTo: 'u2', isBurned: false },
          { shareIndex: 3, allocatedTo: 'u3', isBurned: false },
        ],
      });

      await expect(
        service.reconstructOrgSecret({
          organizationId: 'org-corp',
          name: 'DB_KEY',
          shares: [
            { index: 1, data: 'aabb' },
            { index: 2, data: 'ccdd' },
            { index: 3, data: 'eeff' },
          ],
          requesterId: 'u2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects reconstruction when fewer than threshold K shares are provided', async () => {
      mockPrisma.mpcVaultSecret.findUnique.mockResolvedValueOnce({
        id: 'vault-uuid-1',
        organizationId: 'org-corp',
        name: 'DB_KEY',
        thresholdK: 3,
        totalSharesN: 5,
        status: 'ACTIVE',
        secretHash: 'hash',
        shares: [],
      });

      await expect(
        service.reconstructOrgSecret({
          organizationId: 'org-corp',
          name: 'DB_KEY',
          shares: [
            { index: 1, data: 'aabb' },
            { index: 2, data: 'ccdd' },
          ], // Only 2 shares provided for K=3
          requesterId: 'u1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rotates vault secret using existing threshold shares to authorize rotation', async () => {
      const oldSecret = 'OLD_SECRET_KEY';
      const oldShares = service.splitSecret(oldSecret, 2, 3);
      const oldHash = require('crypto').createHash('sha256').update(oldSecret).digest('hex');

      mockPrisma.mpcVaultSecret.findUnique.mockResolvedValueOnce({
        id: 'vault-uuid-1',
        organizationId: 'org-rotate',
        name: 'API_ROOT_KEY',
        thresholdK: 2,
        totalSharesN: 3,
        status: 'ACTIVE',
        secretHash: oldHash,
        shares: [
          { shareIndex: 1, allocatedTo: 'u1', isBurned: false },
          { shareIndex: 2, allocatedTo: 'u2', isBurned: false },
          { shareIndex: 3, allocatedTo: 'u3', isBurned: false },
        ],
      });

      const newAdmins = ['new-lead-1', 'new-lead-2', 'new-lead-3', 'new-lead-4'];

      const rotation = await service.rotateOrgSecret({
        organizationId: 'org-rotate',
        name: 'API_ROOT_KEY',
        existingShares: [oldShares[0], oldShares[1]],
        newSecret: 'NEW_ROTATED_SECRET_2026',
        newThresholdK: 3,
        newTotalSharesN: 4,
        newAdminUserIds: newAdmins,
        requesterId: 'new-lead-1',
      });

      expect(rotation.newThresholdK).toBe(3);
      expect(rotation.newTotalSharesN).toBe(4);
      expect(rotation.newShares).toHaveLength(4);

      // Verify ROTATE audit proof recorded
      expect(mockPrisma.mpcAuditProof.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ROTATE',
          }),
        }),
      );
    });

    it('manually burns a compromised share', async () => {
      mockPrisma.mpcVaultSecret.findUnique.mockResolvedValueOnce({
        id: 'vault-uuid-1',
        organizationId: 'org-corp',
        name: 'SECRET',
      });

      mockPrisma.mpcShareAllocation.findUnique.mockResolvedValueOnce({
        id: 'alloc-1',
        secretId: 'vault-uuid-1',
        shareIndex: 3,
        isBurned: false,
      });

      const burnResult = await service.burnShare('org-corp', 'SECRET', 3, 'admin-1', 'Stolen laptop');

      expect(burnResult.success).toBe(true);
      expect(burnResult.shareIndex).toBe(3);
      expect(mockPrisma.mpcShareAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBurned: true }),
        }),
      );
    });
  });
});

