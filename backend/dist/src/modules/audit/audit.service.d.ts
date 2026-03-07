import { PrismaService } from '../../prisma/prisma.service';
interface CreateAuditLogDto {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    detail?: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(data: CreateAuditLogDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        action: import("@prisma/client").$Enums.AuditAction;
        resource: string;
        resourceId: string;
        detail: string | null;
        ipAddress: string | null;
        userAgent: string | null;
    }>;
}
export {};
