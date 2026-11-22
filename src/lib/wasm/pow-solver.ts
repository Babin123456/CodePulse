/**
 * WebAssembly / Client-side Proof-of-Work puzzle solver
 * Computes SHA-256 nonces satisfying prefix zero bit/hex requirements.
 */

export interface PowPuzzle {
  challenge: string;
  difficulty: number;
  expiresAt: number;
}

export interface PowSolution {
  challenge: string;
  nonce: string;
  computedHash: string;
  durationMs: number;
}

async function sha256(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node / fallback environment
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Solves the issued Proof-of-Work challenge in background thread/event loop
 */
export async function solvePowChallenge(
  puzzle: PowPuzzle,
  maxIterations: number = 2_000_000,
): Promise<PowSolution> {
  const startTime = performance.now();
  const prefix = '0'.repeat(puzzle.difficulty);
  let nonce = 0;

  while (nonce < maxIterations) {
    const candidate = `${puzzle.challenge}:${nonce}`;
    const hash = await sha256(candidate);

    if (hash.startsWith(prefix)) {
      const durationMs = Number((performance.now() - startTime).toFixed(2));
      return {
        challenge: puzzle.challenge,
        nonce: String(nonce),
        computedHash: hash,
        durationMs,
      };
    }
    nonce++;
  }

  throw new Error(`PoW puzzle exceeded maximum iterations (${maxIterations})`);
}
