import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AppRole, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BlizzardService } from '../blizzard/blizzard.service';
import { PrismaService } from '../prisma/prisma.service';

interface VerifyGuildDto {
  characterName: string;
  realm?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blizzardService: BlizzardService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/login/success?token=${token}`);
  }

  @Post('verify-guild')
  @UseGuards(JwtAuthGuard)
  async verifyGuild(@Req() req: Request, @Body() body: VerifyGuildDto) {
    const user = req.user as any;
    const { characterName, realm } = body;
    const userId = user.userId || user.id;

    try {
      // Vérifier que le personnage appartient au compte et à la guilde
      await this.blizzardService.verifyGuildMembership(
        userId,
        characterName,
        realm,
        'The Good Place',
      );

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!currentUser) {
        throw new Error('Utilisateur introuvable');
      }

      const effectiveUser =
        currentUser.appRole === AppRole.GUEST
          ? await this.prisma.user.update({
              where: { id: userId },
              data: { appRole: AppRole.MEMBER },
            })
          : currentUser;

      // Générer un nouveau token avec le rôle effectif
      const newToken = this.authService.generateJwt(effectiveUser);

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
