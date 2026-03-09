"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PatientsService = class PatientsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, therapistId) {
        return this.prisma.patient.create({
            data: {
                ...dto,
                birthDate: new Date(dto.birthDate),
                therapistId,
            },
        });
    }
    async findAll(userId, userRole) {
        if (userRole === 'DIRECTOR' || userRole === 'ADMIN') {
            return this.prisma.patient.findMany({
                where: { deletedAt: null },
                include: {
                    therapist: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        if (userRole === 'COORDINATOR') {
            return this.prisma.patient.findMany({
                where: { deletedAt: null },
                include: {
                    therapist: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        return this.prisma.patient.findMany({
            where: { therapistId: userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId, userRole) {
        const patient = await this.prisma.patient.findFirst({
            where: { id, deletedAt: null },
            include: {
                therapist: { select: { id: true, name: true } },
                consultations: { orderBy: { createdAt: 'desc' } },
                documents: true,
            },
        });
        if (!patient)
            throw new common_1.NotFoundException('Paciente no encontrado');
        if (userRole === 'DIRECTOR' || userRole === 'ADMIN') {
            return patient;
        }
        if (userRole === 'COORDINATOR') {
            if (patient.therapistId !== userId) {
                throw new common_1.ForbiddenException('Como Coordinador solo puedes ver la ficha clínica de tus propios pacientes');
            }
            return patient;
        }
        if (patient.therapistId !== userId) {
            throw new common_1.ForbiddenException('Acceso denegado a este paciente');
        }
        return patient;
    }
    async update(id, dto, userId, userRole) {
        await this.findOne(id, userId, userRole ?? 'THERAPIST');
        return this.prisma.patient.update({
            where: { id },
            data: {
                ...dto,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
        });
    }
    async softDelete(id, userId, userRole) {
        await this.findOne(id, userId, userRole ?? 'THERAPIST');
        return this.prisma.patient.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async consultarSesionPorRut(rut) {
        const rutNormalizado = rut.replace(/\./g, '').trim().toUpperCase();
        const patient = await this.prisma.patient.findFirst({
            where: { rut: rutNormalizado, deletedAt: null },
            include: {
                therapist: { select: { name: true } },
                consultations: {
                    where: { scheduledAt: { gte: new Date() } },
                    orderBy: { scheduledAt: 'asc' },
                    take: 1,
                },
            },
        });
        if (!patient) {
            return { found: false, message: 'No se encontró ningún paciente con ese RUT' };
        }
        const proximaSesion = patient.consultations[0];
        if (!proximaSesion?.scheduledAt) {
            return {
                found: true,
                patientName: patient.fullName,
                therapistName: patient.therapist?.name ?? 'No asignado',
                nextSession: null,
                message: 'No tienes sesiones programadas próximamente',
            };
        }
        return {
            found: true,
            patientName: patient.fullName,
            therapistName: patient.therapist?.name ?? 'No asignado',
            nextSession: proximaSesion.scheduledAt,
            message: 'Sesión encontrada',
        };
    }
};
exports.PatientsService = PatientsService;
exports.PatientsService = PatientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PatientsService);
//# sourceMappingURL=patients.service.js.map