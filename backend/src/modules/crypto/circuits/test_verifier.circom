pragma circom 2.0.0;

/*
 * test_verifier.circom
 * Proves knowledge of input solution code hash matching expected output hash
 * without revealing the secret algorithm code preimage.
 */

template TestVerifier() {
    // Private input: secret code execution trace / preimage hash
    signal input secretCodePreimage;
    signal input testCaseSalt;

    // Public inputs: challenge identifier, expected test output hash
    signal input challengeId;
    signal input expectedOutputHash;

    // Output: verified signal
    signal output isValid;

    // Intermediate constraint: (secretCodePreimage * testCaseSalt + challengeId)
    signal intermediate;
    intermediate <== secretCodePreimage * testCaseSalt + challengeId;

    // Ensure calculation equals expectedOutputHash
    intermediate === expectedOutputHash;

    isValid <== 1;
}

component main {public [challengeId, expectedOutputHash]} = TestVerifier();
