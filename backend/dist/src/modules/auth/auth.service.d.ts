import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
        };
    } | {
        requiresMfa: boolean;
        userId: string;
    }>;
    verifyMfa(dto: VerifyMfaDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
        };
    }>;
    generateMfaSecret(userId: string): Promise<{
        secret: string;
        qrCode: string;
    }>;
    enableMfa(userId: string, token: string): Promise<{
        message: string;
    }>;
    disableMfa(userId: string, token: string): Promise<{
        message: string;
    }>;
    private generateToken;
}
