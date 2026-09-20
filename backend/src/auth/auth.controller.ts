import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const { rawToken, expiresAt, user } = await this.authService.login(dto, {
      userAgent,
      ipAddress,
    });

    // Écriture du cookie sécurisé
    res.cookie('budgetizerr_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Passe à true automatiquement en prod HTTPS
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return { user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    const { id, email, fullName, monthlySalary } = req.user;
    return { id, email, fullName, monthlySalary };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.['budgetizerr_session'];
    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    res.clearCookie('budgetizerr_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Déconnexion réussie.' };
  }
}