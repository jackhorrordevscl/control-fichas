export declare enum SessionType {
    IN_PERSON = "IN_PERSON",
    TELEMED = "TELEMED"
}
export declare class CreateConsultationDto {
    patientId: string;
    sessionDate: string;
    consultReason: string;
    intervention: string;
    agreements?: string;
    nextSessionDate?: string;
    sessionType?: SessionType;
    scheduledAt?: string;
    patientRut?: string;
}
