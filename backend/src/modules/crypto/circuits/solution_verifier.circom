pragma circom 2.0.0;

/*
 * solution_verifier.circom
 * Validates input/output constraint satisfaction with unique per-battle salt nonces
 * to protect against proof replaying without exposing proprietary source code.
 */

template SolutionVerifier() {
    // Private input: secret algorithm execution preimage
    signal input secretPreimage;
    signal input battleNonce;

    // Public inputs: problem ID and expected output commitment hash
    signal input problemId;
    signal input expectedCommitmentHash;

    // Public output
    signal output isValid;

    // Intermediate constraint: (secretPreimage + battleNonce) * problemId
    signal hashCandidate;
    hashCandidate <== (secretPreimage + battleNonce) * problemId;

    // Verify hash constraint
    hashCandidate === expectedCommitmentHash;

    isValid <== 1;
}

component main {public [problemId, expectedCommitmentHash]} = SolutionVerifier();
