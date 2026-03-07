import type { Response } from 'express';
import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private documentsService;
    constructor(documentsService: DocumentsService);
    upload(file: Express.Multer.File, patientId: string, type: string, user: any): Promise<{
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
    download(id: string, res: Response): Promise<void>;
}
