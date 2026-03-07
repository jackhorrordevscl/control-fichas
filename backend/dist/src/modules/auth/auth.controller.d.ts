import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    generateMfaSecret(user: any): Promise<{
        secret: string;
        qrCode: string;
    }>;
    enableMfa(user: any, token: string): Promise<{
        message: string;
    }>;
    disableMfa(user: any, token: string): Promise<{
        message: string;
    }>;
}
