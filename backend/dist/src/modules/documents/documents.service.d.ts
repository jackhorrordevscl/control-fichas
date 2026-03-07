import { PrismaService } from '../../prisma/prisma.service';
export declare class DocumentsService {
    private prisma;
    constructor(prisma: PrismaService);
    uploadDocument(patientId: string, userId: string, file: Express.Multer.File, type: string): Promise<{
        id: string;
        patientId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        fileName: string;
        storagePath: string;
        uploadedAt: Date;
        uploadedBy: string;
    }>;
    findByPatient(patientId: string): Promise<{
        id: string;
        patientId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        fileName: string;
        storagePath: string;
        uploadedAt: Date;
        uploadedBy: string;
    }[]>;
    getDocument(id: string): Promise<{
        id: string;
        patientId: string;
        type: import("@prisma/client").$Enums.DocumentType;
        fileName: string;
        storagePath: string;
        uploadedAt: Date;
        uploadedBy: string;
    }>;
}
