import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';

const ROLE_MANAGERS = new Set(['ADMIN', 'DIRECTOR']);

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private canManageRoles(currentUserRole: string) {
    return ROLE_MANAGERS.has(currentUserRole);
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto, currentUserId: string, currentUserRole: string) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new ConflictException('El email ya está registrado');

    const requestedRole = dto.role ?? 'THERAPIST';
    if (!this.canManageRoles(currentUserRole) && requestedRole !== 'THERAPIST') {
      throw new ForbiddenException('No tienes permisos para asignar ese rol');
    }

    const passwordHash = await argon2.hash(dto.password);

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: requestedRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      action: 'CREATE',
      resource: 'User',
      resourceId: created.id,
      detail: `Usuario ${created.email} creado con rol ${requestedRole}`,
      statusCode: 201,
    }).catch(() => undefined);

    return created;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string, currentUserRole: string) {
    const existing = await this.findOne(id);

    if (dto.role && dto.role !== existing.role && !this.canManageRoles(currentUserRole)) {
      throw new ForbiddenException('No tienes permisos para modificar roles');
    }

    const data: any = {};
    if (dto.email) data.email = dto.email;
    if (dto.name) data.name = dto.name;
    if (dto.role && (this.canManageRoles(currentUserRole) || dto.role === existing.role)) {
      data.role = dto.role;
    }
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      action: 'UPDATE',
      resource: 'User',
      resourceId: id,
      detail: dto.role && dto.role !== existing.role
        ? `Usuario ${id} actualizado con cambio de rol a ${dto.role}`
        : `Usuario ${id} actualizado`,
      statusCode: 200,
    }).catch(() => undefined);

    return updated;
  }

  async softDelete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ConflictException('No puedes eliminar tu propio usuario');
    }

    await this.findOne(id);

    const deleted = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: currentUserId,
      action: 'SOFT_DELETE',
      resource: 'User',
      resourceId: id,
      detail: `Usuario ${id} dado de baja lógica`,
      statusCode: 200,
    }).catch(() => undefined);

    return deleted;
  }
}