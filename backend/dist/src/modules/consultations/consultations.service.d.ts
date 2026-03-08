import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';
export declare class ConsultationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateConsultationDto, therapistId: string): Promise<{
        id: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        createdAt: Date;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
        patientId: string;
        therapistId: string;
    }>;
    findByPatient(patientId: string): Promise<({
        therapist: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        createdAt: Date;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
        patientId: string;
        therapistId: string;
    })[]>;
    findOne(id: string): Promise<{
        therapist: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        createdAt: Date;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
        patientId: string;
        therapistId: string;
    }>;
    correct(id: string, dto: CorrectConsultationDto, therapistId: string): Promise<{
        id: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        createdAt: Date;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
        patientId: string;
        therapistId: string;
    }>;
}
