import { Role } from '@prisma/client';

export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: Role;
    name: string | null;

    ip?: string;
    userAgent?: string;
    correlationId?: string;
}