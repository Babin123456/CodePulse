/**
 * Multi-Party Computation (MPC) Threshold Cryptography Client & Shamir Vault Engine (#547)
 * Implements client-side Shamir's Secret Sharing (k-of-n) over Galois Field GF(256),
 * threshold secret reconstruction in ephemeral RAM, share allocation, and rotation.
 */

export interface ShamirShare {
  index: number; // 1..255 (x coordinate)
  data: string; // Hex-encoded y coordinates
  fingerprint: string; // SHA-256 fingerprint
}

export interface AllocatedShareEnvelope {
  secretId: string;
  secretName: string;
  organizationId: string;
  shareIndex: number;
  allocatedTo: string;
  share: ShamirShare;
  allocatedAt: string | Date;
}

export interface MpcSecretMetadata {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  thresholdK: number;
  totalSharesN: number;
  status: 'ACTIVE' | 'RECONSTRUCTED' | 'ROTATED' | 'REVOKED';
  secretHash: string;
  activeSharesCount: number;
  burnedSharesCount: number;
  shares: Array<{
    shareIndex: number;
    allocatedTo: string;
    shareFingerprint: string;
    isBurned: boolean;
    burnedAt?: string | Date | null;
  }>;
  createdAt: string | Date;
  rotatedAt?: string | Date | null;
}

export interface MpcAuditProof {
  id: string;
  secretId: string;
  action: 'SPLIT' | 'RECONSTRUCT' | 'BURN' | 'ROTATE';
  performedBy: string;
  thresholdMet: boolean;
  participatingShares: number[];
  proofSignature: string;
  metadata?: any;
  createdAt: string | Date;
}

// Precomputed GF(256) tables using generator 3 and polynomial 0x11b
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

let gfInitialized = false;
function ensureGfTables(): void {
  if (gfInitialized) return;
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x = ((x << 1) ^ (x & 0x80 ? 0x11b : 0)) ^ x;
  }
  GF_LOG[0] = 0;
  gfInitialized = true;
}

export function clientGfMul(a: number, b: number): number {
  ensureGfTables();
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

export function clientGfDiv(a: number, b: number): number {
  ensureGfTables();
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return GF_EXP[GF_LOG[a] - GF_LOG[b] + 255];
}

/**
 * Reconstructs secret from K shares over GF(256) via Lagrange interpolation
 */
export function reconstructShamirSecret(shares: Array<{ index: number; data: string }>): string {
  if (!shares || shares.length < 2) {
    throw new Error('At least 2 shares are required to reconstruct secret');
  }

  ensureGfTables();

  const points = shares.map((s) => {
    const rawBytes: number[] = [];
    for (let i = 0; i < s.data.length; i += 2) {
      rawBytes.push(parseInt(s.data.substr(i, 2), 16));
    }
    return { x: s.index, bytes: rawBytes };
  });

  const len = points[0].bytes.length;
  for (const p of points) {
    if (p.bytes.length !== len) {
      throw new Error('Mismatched share lengths');
    }
  }

  const resultBytes: number[] = [];

  for (let i = 0; i < len; i++) {
    let secretByte = 0;

    for (let j = 0; j < points.length; j++) {
      const xj = points[j].x;
      const yj = points[j].bytes[i];

      let num = 1;
      let den = 1;

      for (let m = 0; m < points.length; m++) {
        if (m !== j) {
          const xm = points[m].x;
          num = clientGfMul(num, xm);
          den = clientGfMul(den, xj ^ xm);
        }
      }

      const lagrange = clientGfDiv(num, den);
      secretByte ^= clientGfMul(yj, lagrange);
    }

    resultBytes.push(secretByte);
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(resultBytes));
}

export class ClientMpcVaultManager {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api/security/mpc') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Initializes a new MPC Vault secret, splitting it into N shares with threshold K.
   */
  async initMpcSecret(dto: {
    organizationId: string;
    name: string;
    secret: string;
    thresholdK: number;
    totalSharesN: number;
    adminUserIds: string[];
    requesterId: string;
    description?: string;
  }): Promise<{
    secretId: string;
    organizationId: string;
    name: string;
    thresholdK: number;
    totalSharesN: number;
    secretHash: string;
    shares: AllocatedShareEnvelope[];
  }> {
    const res = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to initialize MPC secret (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Submits threshold K shares to reconstruct the secret in ephemeral memory.
   */
  async reconstructMpcSecret(dto: {
    organizationId: string;
    name: string;
    shares: Array<{ index: number; data: string }>;
    requesterId: string;
    autoBurn?: boolean;
  }): Promise<{
    secret: string;
    thresholdMet: boolean;
    sharesBurned: boolean;
    participatingIndices: number[];
  }> {
    const res = await fetch(`${this.baseUrl}/reconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to reconstruct MPC secret (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Rotates an existing secret authorized by valid threshold shares.
   */
  async rotateMpcSecret(dto: {
    organizationId: string;
    name: string;
    existingShares: Array<{ index: number; data: string }>;
    newSecret: string;
    newThresholdK: number;
    newTotalSharesN: number;
    newAdminUserIds: string[];
    requesterId: string;
  }): Promise<{
    secretId: string;
    organizationId: string;
    name: string;
    newThresholdK: number;
    newTotalSharesN: number;
    newSecretHash: string;
    newShares: AllocatedShareEnvelope[];
  }> {
    const res = await fetch(`${this.baseUrl}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to rotate MPC secret (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Manually burns a compromised share.
   */
  async burnShare(dto: {
    organizationId: string;
    secretName: string;
    shareIndex: number;
    requesterId: string;
    reason?: string;
  }): Promise<{ success: boolean; shareIndex: number; burnedAt: string }> {
    const res = await fetch(`${this.baseUrl}/burn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to burn share (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Fetches MPC secret metadata without exposing raw secret.
   */
  async getSecretMetadata(organizationId: string, name: string): Promise<MpcSecretMetadata> {
    const res = await fetch(
      `${this.baseUrl}/secrets/${encodeURIComponent(organizationId)}/${encodeURIComponent(name)}`,
    );

    if (!res.ok) {
      throw new Error(`Failed to retrieve MPC secret metadata (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Lists all vault secrets in an organization.
   */
  async listOrgSecrets(organizationId: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/secrets/${encodeURIComponent(organizationId)}`);
    if (!res.ok) {
      throw new Error(`Failed to list MPC secrets (HTTP ${res.status})`);
    }
    return res.json();
  }

  /**
   * Fetches cryptographic audit proofs for a secret.
   */
  async getAuditProofs(secretId: string): Promise<MpcAuditProof[]> {
    const res = await fetch(`${this.baseUrl}/audit/${encodeURIComponent(secretId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch audit proofs (HTTP ${res.status})`);
    }
    return res.json();
  }
}

