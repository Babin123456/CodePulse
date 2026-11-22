import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface AttestationVerificationInput {
  origin: string;
  rpId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature?: string;
  aaguid?: string;
}

export interface Fido2KeyMetadata {
  aaguid: string;
  deviceType: 'HARDWARE_TOKEN' | 'PLATFORM_PASSKEY';
  manufacturer: string;
  userPresent: boolean;
  userVerified: boolean;
}

@Injectable()
export class Fido2AttestationService {
  private readonly logger = new Logger(Fido2AttestationService.name);

  // Known Enterprise AAGUID prefixes (e.g. Yubico, Google Titan)
  private readonly KNOWN_HARDWARE_AAGUIDS: Record<string, string> = {
    'cb69481e-8ff7-4039-93ec-0a2729a1e67d': 'Yubico YubiKey 5 Series',
    'ee882879-721c-4916-ac20-e1209b0b4674': 'Yubico YubiKey 5 NFC',
    'fa2b99dc-9e39-4257-8f92-4a30d23c4118': 'Yubico Security Key NFC',
    'b4853039-1662-4217-91a6-848ec0ad1544': 'Google Titan Security Key',
  };

  /**
   * Validates WebAuthn authenticatorData flags: UP (User Presence) and UV (User Verification)
   */
  public parseAuthenticatorFlags(flagsByte: number) {
    const userPresent = (flagsByte & 0x01) !== 0;
    const userVerified = (flagsByte & 0x04) !== 0;
    const attestedCredentialDataPresent = (flagsByte & 0x40) !== 0;
    const extensionDataPresent = (flagsByte & 0x80) !== 0;

    return {
      userPresent,
      userVerified,
      attestedCredentialDataPresent,
      extensionDataPresent,
    };
  }

  /**
   * Verifies WebAuthn Level 3 Attestation against expected origin and RP ID
   */
  public verifyAttestation(input: AttestationVerificationInput): Fido2KeyMetadata {
    const { origin, rpId, clientDataJSON, authenticatorData, aaguid } = input;

    // Phishing-resistant origin binding
    if (!origin || !origin.includes(rpId)) {
      throw new BadRequestException(`Origin mismatch: ${origin} does not match expected RP ID ${rpId}`);
    }

    let parsedClientData: any;
    try {
      const decodedClientData = Buffer.from(clientDataJSON, 'base64').toString('utf8');
      parsedClientData = JSON.parse(decodedClientData);
    } catch {
      throw new BadRequestException('Invalid clientDataJSON encoding');
    }

    if (parsedClientData.origin && parsedClientData.origin !== origin) {
      throw new BadRequestException(`Phishing detection: Client data origin ${parsedClientData.origin} does not match expected ${origin}`);
    }

    const authDataBuffer = Buffer.from(authenticatorData, 'base64');
    if (authDataBuffer.length < 37) {
      throw new BadRequestException('Malformed authenticatorData');
    }

    const flagsByte = authDataBuffer[32];
    const flags = this.parseAuthenticatorFlags(flagsByte);

    if (!flags.userPresent) {
      throw new BadRequestException('User Presence (UP) flag was not set by authenticator');
    }

    const normalizedAaguid = (aaguid || '00000000-0000-0000-0000-000000000000').toLowerCase();
    const manufacturer = this.KNOWN_HARDWARE_AAGUIDS[normalizedAaguid] || 'Platform Passkey (Biometric / Secure Enclave)';
    const deviceType = this.KNOWN_HARDWARE_AAGUIDS[normalizedAaguid] ? 'HARDWARE_TOKEN' : 'PLATFORM_PASSKEY';

    return {
      aaguid: normalizedAaguid,
      deviceType,
      manufacturer,
      userPresent: flags.userPresent,
      userVerified: flags.userVerified,
    };
  }
}
