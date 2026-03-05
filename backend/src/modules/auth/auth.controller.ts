import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

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