import { Controller, Get, Post, Req, Res, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BlizzardService } from '../blizzard/blizzard.service';
import { PrismaService } from '../prisma/prisma.service';

interface VerifyGuildDto {
  characterName: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blizzardService: BlizzardService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Post('verify-guild')
  @UseGuards(JwtAuthGuard)
  async verifyGuild(@Req() req: Request, @Body() body: VerifyGuildDto) {
    const user = req.user as any;
    const { characterName } = body;
    const userId = user.userId || user.id;

    try {
      // Vérifier que le personnage appartient au compte et à la guilde
      await this.blizzardService.verifyGuildMembership(
        userId,
        characterName,
        'The Good Place',
      );

      // Mettre à jour le rôle de l'utilisateur en MEMBER
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { appRole: 'MEMBER' },
      });

      // Générer un nouveau token avec le nouveau rôle
      const newToken = this.authService.generateJwt(updatedUser);

      return {
        token: newToken,
        message: 'Bienvenue dans la guilde !',
      };
    } catch (error: any) {
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user;
  }
}
