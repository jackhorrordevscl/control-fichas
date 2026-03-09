import type { Response } from 'express';
import { SharedFilesService } from './shared-files.service';
import { FileCategory } from '@prisma/client';
export declare class SharedFilesController {
    private readonly sharedFilesService;
    constructor(sharedFilesService: SharedFilesService);
    findAll(category?: FileCategory): Promise<({
        uploadedBy: {
            email: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        originalName: string;
        filename: string;
        path: string;
        mimetype: string;
        size: number;
        category: import("@prisma/client").$Enums.FileCategory;
        description: string | null;
        uploadedById: string;
    })[]>;
    findOne(id: string): Promise<{
        uploadedBy: {
            name: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        originalName: string;
        filename: string;
        path: string;
        mimetype: string;
        size: number;
        category: import("@prisma/client").$Enums.FileCategory;
        description: string | null;
        uploadedById: string;
    }>;
    download(id: string, res: Response): Promise<void>;
    uploadFile(file: Express.Multer.File, dto: {
        name: string;
        description?: string;
        category?: FileCategory;
    }, req: any): Promise<{
        uploadedBy: {
            email: string;
            name: string;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        originalName: string;
        filename: string;
        path: string;
        mimetype: string;
        size: number;
        category: import("@prisma/client").$Enums.FileCategory;
        description: string | null;
        uploadedById: string;
    }>;
    updateFile(id: string, dto: {
        name?: string;
        description?: string;
        category?: FileCategory;
    }, req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        originalName: string;
        filename: string;
        path: string;
        mimetype: string;
        size: number;
        category: import("@prisma/client").$Enums.FileCategory;
        description: string | null;
        uploadedById: string;
    }>;
    deleteFile(id: string, req: any): Promise<{
        message: string;
    }>;
}
