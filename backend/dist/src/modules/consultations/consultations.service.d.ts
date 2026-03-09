import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';
export declare class ConsultationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateConsultationDto, therapistId: string): Promise<{
        id: string;
        createdAt: Date;
        therapistId: string;
        nextSessionDate: Date | null;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
    }>;
    findByPatient(patientId: string): Promise<({
        therapist: {
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        therapistId: string;
        nextSessionDate: Date | null;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
    })[]>;
    findOne(id: string): Promise<{
        therapist: {
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        therapistId: string;
        nextSessionDate: Date | null;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
    }>;
    correct(id: string, dto: CorrectConsultationDto, therapistId: string): Promise<{
        id: string;
        createdAt: Date;
        therapistId: string;
        nextSessionDate: Date | null;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        scheduledAt: Date;
        reminderSent: boolean;
        patientRut: string;
    }>;
}
