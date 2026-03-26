import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('bnet')
  @UseGuards(AuthGuard('bnet'))
  bnetLogin() {
    // Passport redirects to Battle.net automatically
  }

  @Get('bnet/callback')
  @UseGuards(AuthGuard('bnet'))
  bnetCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const token = this.authService.generateJwt(user);
    res.redirect(`http://localhost:5173/login/success?token=${token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user;
  }
}
