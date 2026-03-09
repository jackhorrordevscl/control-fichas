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
exports.ConsultationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
function parseDate(dateStr) {
    if (dateStr.includes('T') || dateStr.includes(' ')) {
        return new Date(dateStr);
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
}
let ConsultationsService = class ConsultationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, therapistId) {
        let patientRut = dto.patientRut ?? '';
        if (!patientRut && dto.patientId) {
            const patient = await this.prisma.patient.findUnique({
                where: { id: dto.patientId },
                select: { rut: true },
            });
            patientRut = patient?.rut ?? '';
        }
        return this.prisma.consultation.create({
            data: {
                patientId: dto.patientId,
                therapistId,
                sessionDate: parseDate(dto.sessionDate),
                consultReason: dto.consultReason,
                intervention: dto.intervention,
                agreements: dto.agreements,
                nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : null,
                sessionType: dto.sessionType ?? 'IN_PERSON',
                version: 1,
                scheduledAt: dto.scheduledAt ? parseDate(dto.scheduledAt) : parseDate(dto.sessionDate),
                patientRut,
            },
        });
    }
    async findByPatient(patientId) {
        return this.prisma.consultation.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: {
                therapist: { select: { name: true, email: true } },
            },
        });
    }
    async findOne(id) {
        const consultation = await this.prisma.consultation.findUnique({
            where: { id },
            include: {
                therapist: { select: { name: true, email: true } },
            },
        });
        if (!consultation)
            throw new common_1.NotFoundException('Consulta no encontrada');
        return consultation;
    }
    async correct(id, dto, therapistId) {
        const original = await this.findOne(id);
        await this.prisma.consultation.update({
            where: { id },
            data: { isCorrected: true },
        });
        return this.prisma.consultation.create({
            data: {
                patientId: original.patientId,
                therapistId,
                sessionDate: dto.sessionDate ? parseDate(dto.sessionDate) : original.sessionDate,
                consultReason: dto.consultReason ?? original.consultReason,
                intervention: dto.intervention ?? original.intervention,
                agreements: dto.agreements ?? original.agreements,
                nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : original.nextSessionDate,
                sessionType: dto.sessionType ?? original.sessionType,
                version: original.version + 1,
                previousVersionId: original.id,
                isCorrected: false,
                scheduledAt: original.scheduledAt,
                patientRut: original.patientRut,
            },
        });
    }
};
exports.ConsultationsService = ConsultationsService;
exports.ConsultationsService = ConsultationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConsultationsService);
//# sourceMappingURL=consultations.service.js.map