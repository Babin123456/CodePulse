import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SyncService } from '../sync/sync.service';
import { randomBytes, scryptSync } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const configMock = {
    get: jest.fn(),
  };
  const jwtMock = {
    sign: jest.fn().mockReturnValue('signed-jwt'),
  };
  const syncMock = {
    syncUserData: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: configMock,
        },
        {
          provide: JwtService,
          useValue: jwtMock,
        },
        {
          provide: SyncService,
          useValue: syncMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers email accounts and returns a JWT', async () => {
    const user = {
      id: 'user-id',
      githubId: null,
      username: 'developer-123abc',
      name: 'Developer',
      email: 'dev@example.com',
      passwordHash: null,
    };
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(user);

    const response = await service.register({
      name: 'Developer',
      email: 'DEV@example.com',
      password: 'secure-password',
      interests: ['Backend'],
    });

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(response.accessToken).toBe('signed-jwt');
    expect(jwtMock.sign).toHaveBeenCalled();

    const salt = randomBytes(16).toString('hex');
    prismaMock.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: `${salt}:${scryptSync('secure-password', salt, 64).toString('hex')}`,
    });
    await expect(
      service.authenticateWithPassword('dev@example.com', 'secure-password'),
    ).resolves.toMatchObject({ accessToken: 'signed-jwt' });
    await expect(
      service.authenticateWithPassword('dev@example.com', 'wrong-password'),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('does not disclose or issue a reset for an unregistered email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset('unknown@example.com'),
    ).resolves.toBeUndefined();
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { authEmail: 'unknown@example.com' },
    });
  });
});
