import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
export declare class PatientsController {
    private patientsService;
    constructor(patientsService: PatientsService);
    consultarProximaSesion(rut: string): Promise<{
        found: boolean;
        message: string;
        patientName?: undefined;
        therapistName?: undefined;
        nextSession?: undefined;
    } | {
        found: boolean;
        patientName: string;
        therapistName: string;
        nextSession: null;
        message: string;
    } | {
        found: boolean;
        patientName: string;
        therapistName: string;
        nextSession: Date;
        message: string;
    }> | {
        found: boolean;
        message: string;
    };
    create(dto: CreatePatientDto, user: any): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        rut: string;
        birthDate: Date;
        occupation: string | null;
        address: string | null;
        phone: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        treatingPsychiatrist: string | null;
        treatingDoctor: string | null;
        consentSigned: boolean;
        telemedConsentSigned: boolean;
        isActive: boolean;
        notificationsConsent: boolean;
        therapistId: string;
    }>;
    findAll(user: any): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        rut: string;
        birthDate: Date;
        occupation: string | null;
        address: string | null;
        phone: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        treatingPsychiatrist: string | null;
        treatingDoctor: string | null;
        consentSigned: boolean;
        telemedConsentSigned: boolean;
        isActive: boolean;
        notificationsConsent: boolean;
        therapistId: string;
    }[]>;
    getHistory(id: string, user: any): Promise<({
        changedBy: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        reason: string;
        patientId: string;
        snapshot: import("@prisma/client/runtime/library").JsonValue;
        changedById: string;
        changedAt: Date;
        diff: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    findOne(id: string, user: any): Promise<{
        consultations: {
            id: string;
            createdAt: Date;
            therapistId: string;
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
            scheduledAt: Date;
            reminderSent: boolean;
            patientRut: string;
        }[];
        therapist: {
            id: string;
            name: string;
        };
        documents: {
            id: string;
            patientId: string;
            type: import("@prisma/client").$Enums.DocumentType;
            fileName: string;
            storagePath: string;
            uploadedAt: Date;
            uploadedBy: string;
        }[];
    } & {
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        rut: string;
        birthDate: Date;
        occupation: string | null;
        address: string | null;
        phone: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        treatingPsychiatrist: string | null;
        treatingDoctor: string | null;
        consentSigned: boolean;
        telemedConsentSigned: boolean;
        isActive: boolean;
        notificationsConsent: boolean;
        therapistId: string;
    }>;
    update(id: string, dto: UpdatePatientDto, user: any): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        rut: string;
        birthDate: Date;
        occupation: string | null;
        address: string | null;
        phone: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        treatingPsychiatrist: string | null;
        treatingDoctor: string | null;
        consentSigned: boolean;
        telemedConsentSigned: boolean;
        isActive: boolean;
        notificationsConsent: boolean;
        therapistId: string;
    }>;
    softDelete(id: string, user: any): Promise<{
        id: string;
        email: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        fullName: string;
        rut: string;
        birthDate: Date;
        occupation: string | null;
        address: string | null;
        phone: string | null;
        emergencyContactName: string | null;
        emergencyContactPhone: string | null;
        treatingPsychiatrist: string | null;
        treatingDoctor: string | null;
        consentSigned: boolean;
        telemedConsentSigned: boolean;
        isActive: boolean;
        notificationsConsent: boolean;
        therapistId: string;
    }>;
}
