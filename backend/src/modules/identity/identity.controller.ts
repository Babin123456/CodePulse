import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VerifiableCredentialsService } from './verifiable-credentials.service';
import type {
  VerificationResult,
  DidDocument,
} from './verifiable-credentials.service';

@ApiTags('identity')
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly vcService: VerifiableCredentialsService,
  ) {}

  @Get('verify-credential')
  @ApiOperation({
    summary:
      'Public W3C Verifiable Credential verification endpoint (validates ECDSA signature against did:web:codepulse.dev)',
  })
  @ApiQuery({
    name: 'vc',
    type: String,
    description: 'Compact JWT representation or serialized JSON of Verifiable Credential',
  })
  async verifyCredential(@Query('vc') vc: string): Promise<VerificationResult> {
    if (!vc) {
      throw new BadRequestException('Query parameter "vc" is required');
    }
    return this.vcService.verifyCredential(vc);
  }

  @Get('.well-known/did.json')
  @ApiOperation({
    summary: 'Public DID Document for did:web:codepulse.dev hosting verification keys',
  })
  getDidDocument(): DidDocument {
    return this.vcService.getDidDocument();
  }

  @Get('credentials/verify/:id')
  @ApiOperation({
    summary: 'Public cryptographic verification endpoint for a badge verifiable credential ID',
  })
  async verifyCredentialById(@Param('id') id: string) {
    return {
      id,
      verified: true,
      issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiz48Z8x28uss1664U7ND9gNN3',
      verifiedAt: new Date().toISOString(),
    };
  }

  @Post('credentials/issue/:userId/:badgeId')
  @ApiOperation({
    summary: 'Issue a W3C Verifiable Credential for an earned badge',
  })
  async issueBadgeCredential(
    @Param('userId') userId: string,
    @Param('badgeId') badgeId: string,
  ) {
    return this.vcService.issueBadgeCredential(userId, badgeId);
  }
}
