import { PrismaService } from '../prisma/prisma.service';
import { FileCategory, Role } from '@prisma/client';
export interface UploadFileDto {
    name: string;
    description?: string;
    category?: FileCategory;
}
export declare class SharedFilesService {
    private prisma;
    constructor(prisma: PrismaService);
    uploadFile(file: Express.Multer.File, dto: UploadFileDto, userId: string): Promise<{
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
    getFilePath(id: string): Promise<string>;
    deleteFile(id: string, userId: string, userRole: Role): Promise<{
        message: string;
    }>;
    updateFile(id: string, dto: Partial<UploadFileDto>, userId: string, userRole: Role): Promise<{
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
}
