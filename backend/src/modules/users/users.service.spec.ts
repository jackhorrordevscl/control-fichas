import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('permite a un coordinador crear usuarios terapeuta pero no asignar roles elevados', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-2',
      email: 'new@umbral.cl',
      name: 'Nuevo Usuario',
      role: 'THERAPIST',
      createdAt: new Date(),
    });

    await expect(
      service.create(
        {
          email: 'new@umbral.cl',
          password: 'password123',
          name: 'Nuevo Usuario',
          role: 'THERAPIST',
        },
        'creator-1',
        'COORDINATOR',
      ),
    ).resolves.toMatchObject({
      email: 'new@umbral.cl',
      role: 'THERAPIST',
    });

    await expect(
      service.create(
        {
          email: 'admin@umbral.cl',
          password: 'password123',
          name: 'Admin',
          role: 'ADMIN',
        },
        'creator-1',
        'COORDINATOR',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('evita que un coordinador cambie el rol de un usuario existente', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      name: 'Usuario',
      role: 'THERAPIST',
      mfaEnabled: false,
      createdAt: new Date(),
    });

    await expect(
      service.update(
        'user-1',
        { role: 'ADMIN' },
        'editor-1',
        'COORDINATOR',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite a admin cambiar roles y audita la actualización', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      name: 'Usuario',
      role: 'THERAPIST',
      mfaEnabled: false,
      createdAt: new Date(),
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      name: 'Usuario',
      role: 'ADMIN',
      updatedAt: new Date(),
    });

    await expect(
      service.update(
        'user-1',
        { role: 'ADMIN' },
        'editor-1',
        'ADMIN',
      ),
    ).resolves.toMatchObject({
      role: 'ADMIN',
    });

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        resource: 'User',
        resourceId: 'user-1',
        statusCode: 200,
      }),
    );
  });

  it('rechaza borrar el propio usuario', async () => {
    await expect(
      service.softDelete('user-1', 'user-1'),
    ).rejects.toThrow(ConflictException);
  });
});
