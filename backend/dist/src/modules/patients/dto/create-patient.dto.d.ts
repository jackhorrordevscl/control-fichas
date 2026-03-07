export declare class CreatePatientDto {
    fullName: string;
    rut: string;
    birthDate: string;
    occupation?: string;
    address?: string;
    phone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    treatingPsychiatrist?: string;
    treatingDoctor?: string;
    consentSigned?: boolean;
    telemedConsentSigned?: boolean;
}
