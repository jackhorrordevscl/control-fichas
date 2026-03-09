import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';
export declare class ConsultationsController {
    private consultationsService;
    constructor(consultationsService: ConsultationsService);
    create(dto: CreateConsultationDto, user: any): Promise<{
        id: string;
        createdAt: Date;
        therapistId: string;
        scheduledAt: Date;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
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
        scheduledAt: Date;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
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
        scheduledAt: Date;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        reminderSent: boolean;
        patientRut: string;
    }>;
    correct(id: string, dto: CorrectConsultationDto, user: any): Promise<{
        id: string;
        createdAt: Date;
        therapistId: string;
        scheduledAt: Date;
        patientId: string;
        sessionDate: Date;
        consultReason: string;
        intervention: string;
        agreements: string | null;
        nextSessionDate: Date | null;
        sessionType: import("@prisma/client").$Enums.SessionType;
        version: number;
        previousVersionId: string | null;
        isCorrected: boolean;
        reminderSent: boolean;
        patientRut: string;
    }>;
}
