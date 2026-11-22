import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ClientMpcVaultManager,
  reconstructShamirSecret,
  clientGfMul,
  clientGfDiv,
} from './mpc-vault';

describe('ClientMpcVaultManager & Shamir GF(256) (#547)', () => {
  let client: ClientMpcVaultManager;

  beforeEach(() => {
    client = new ClientMpcVaultManager('/api/security/mpc');
    vi.restoreAllMocks();
  });

  describe('Client-side GF(256) Finite Field Arithmetic', () => {
    it('verifies multiplication and division identities', () => {
      expect(clientGfMul(5, 1)).toBe(5);
      expect(clientGfMul(99, 0)).toBe(0);
      expect(clientGfDiv(123, 123)).toBe(1);

      // (a * b) / b = a
      const a = 77;
      const b = 189;
      expect(clientGfDiv(clientGfMul(a, b), b)).toBe(a);
    });

    it('reconstructs secret from valid hex-encoded Shamir shares', () => {
      // Secret: "HI" -> bytes [72, 73]
      // Polynomial 1: f(x) = 72 ^ (3 * x)
      // Polynomial 2: g(x) = 73 ^ (5 * x)
      // x=1: f(1) = 72 ^ 3 = 75 (0x4b), g(1) = 73 ^ 5 = 76 (0x4c) -> "4b4c"
      // x=2: f(2) = 72 ^ 6 = 78 (0x4e), g(2) = 73 ^ 10 = 67 (0x43) -> "4e43"
      // x=3: f(3) = 72 ^ 5 = 77 (0x4d), g(3) = 73 ^ 15 = 70 (0x46) -> "4d46"
      const share1 = { index: 1, data: '4b4c' };
      const share2 = { index: 2, data: '4e43' };
      const share3 = { index: 3, data: '4d46' };

      expect(reconstructShamirSecret([share1, share2])).toBe('HI');
      expect(reconstructShamirSecret([share2, share3])).toBe('HI');
      expect(reconstructShamirSecret([share1, share3])).toBe('HI');
    });

    it('fails to reconstruct when shares are tampered or corrupted', () => {
      const share1 = { index: 1, data: '4b4c' };
      const shareCorrupted = { index: 2, data: 'ffff' };

      const recovered = reconstructShamirSecret([share1, shareCorrupted]);
      expect(recovered).not.toBe('HI');
    });
  });

  describe('ClientMpcVaultManager REST Client', () => {
    it('initializes MPC vault secret with k-of-n threshold parameters', async () => {
      const mockInitResponse = {
        secretId: 'sec-123',
        organizationId: 'org-1',
        name: 'PROD_ROOT_KEY',
        thresholdK: 3,
        totalSharesN: 5,
        secretHash: 'sha256-hash',
        shares: [
          { shareIndex: 1, allocatedTo: 'admin-1', share: { index: 1, data: 'aabb', fingerprint: 'fp1' } },
          { shareIndex: 2, allocatedTo: 'admin-2', share: { index: 2, data: 'ccdd', fingerprint: 'fp2' } },
          { shareIndex: 3, allocatedTo: 'admin-3', share: { index: 3, data: 'eeff', fingerprint: 'fp3' } },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockInitResponse,
      } as any);

      const res = await client.initMpcSecret({
        organizationId: 'org-1',
        name: 'PROD_ROOT_KEY',
        secret: 'SUPER_SECRET',
        thresholdK: 3,
        totalSharesN: 5,
        adminUserIds: ['admin-1', 'admin-2', 'admin-3', 'admin-4', 'admin-5'],
        requesterId: 'admin-1',
      });

      expect(res.secretId).toBe('sec-123');
      expect(res.thresholdK).toBe(3);
      expect(res.totalSharesN).toBe(5);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/security/mpc/init',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('reconstructs secret via threshold shares and burns single-use shares', async () => {
      const mockReconstructResponse = {
        secret: 'RECONSTRUCTED_MASTER_KEY',
        thresholdMet: true,
        sharesBurned: true,
        participatingIndices: [1, 2, 3],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockReconstructResponse,
      } as any);

      const res = await client.reconstructMpcSecret({
        organizationId: 'org-1',
        name: 'PROD_ROOT_KEY',
        shares: [
          { index: 1, data: 'aabb' },
          { index: 2, data: 'ccdd' },
          { index: 3, data: 'eeff' },
        ],
        requesterId: 'admin-1',
        autoBurn: true,
      });

      expect(res.secret).toBe('RECONSTRUCTED_MASTER_KEY');
      expect(res.sharesBurned).toBe(true);
      expect(res.participatingIndices).toEqual([1, 2, 3]);
    });

    it('rotates vault secret using threshold authorization', async () => {
      const mockRotateResponse = {
        secretId: 'sec-123',
        organizationId: 'org-1',
        name: 'PROD_ROOT_KEY',
        newThresholdK: 2,
        newTotalSharesN: 3,
        newSecretHash: 'new-hash',
        newShares: [],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRotateResponse,
      } as any);

      const res = await client.rotateMpcSecret({
        organizationId: 'org-1',
        name: 'PROD_ROOT_KEY',
        existingShares: [{ index: 1, data: 'aabb' }, { index: 2, data: 'ccdd' }, { index: 3, data: 'eeff' }],
        newSecret: 'BRAND_NEW_SECRET',
        newThresholdK: 2,
        newTotalSharesN: 3,
        newAdminUserIds: ['lead-1', 'lead-2', 'lead-3'],
        requesterId: 'lead-1',
      });

      expect(res.newThresholdK).toBe(2);
      expect(res.newTotalSharesN).toBe(3);
    });

    it('fetches secret metadata and audit proofs', async () => {
      const mockMeta = {
        id: 'sec-123',
        organizationId: 'org-1',
        name: 'PROD_KEY',
        thresholdK: 3,
        totalSharesN: 5,
        status: 'ACTIVE',
        secretHash: 'hash-abc',
        activeSharesCount: 5,
        burnedSharesCount: 0,
        shares: [],
        createdAt: new Date().toISOString(),
      };

      const mockProofs = [
        {
          id: 'proof-1',
          secretId: 'sec-123',
          action: 'SPLIT',
          performedBy: 'admin-1',
          thresholdMet: true,
          participatingShares: [1, 2, 3, 4, 5],
          proofSignature: 'sig-abc',
          createdAt: new Date().toISOString(),
        },
      ];

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockMeta } as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockProofs } as any);

      const meta = await client.getSecretMetadata('org-1', 'PROD_KEY');
      expect(meta.name).toBe('PROD_KEY');
      expect(meta.status).toBe('ACTIVE');

      const proofs = await client.getAuditProofs('sec-123');
      expect(proofs).toHaveLength(1);
      expect(proofs[0].action).toBe('SPLIT');
    });
  });
});

