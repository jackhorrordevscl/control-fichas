import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // T4.2 (issue #20): rate limiting en login y en mfa/verify. El límite/ventana
  // real vienen del throttler nombrado 'login' registrado en AuthModule
  // (buildLoginThrottlerOptions) — no se hardcodea acá para no duplicar la
  // fuente de verdad ni pelear con el default más alto que se usa en test.
  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // mfa/verify no puede llevar JwtAuthGuard: es el segundo paso del login
  // (login devuelve requiresMfa + userId antes de emitir ningún JWT), así que
  // por diseño se llama sin sesión. Sin throttling acá, un userId conocido +
  // fuerza bruta sobre el TOTP de 6 dígitos (window:1, ~3 códigos válidos)
  // emitía un JWT real sin ningún límite de intentos.
  @UseGuards(ThrottlerGuard)
  @Post('mfa/verify')
  verifyMfa(@Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/generate')
  generateMfaSecret(@CurrentUser() user: any) {
    return this.authService.generateMfaSecret(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  enableMfa(@CurrentUser() user: any, @Body('token') token: string) {
    return this.authService.enableMfa(user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  disableMfa(@CurrentUser() user: any, @Body('token') token: string) {
    return this.authService.disableMfa(user.id, token);
  }
}
