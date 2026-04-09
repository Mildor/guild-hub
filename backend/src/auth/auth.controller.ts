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
  bnetCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const token = this.authService.generateJwt(user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect(`${frontendUrl}/login/success`);
  }

  @Post('verify-guild')
  @UseGuards(JwtAuthGuard)
  async verifyGuild(
    @Req() req: Request,
    @Body() body: VerifyGuildDto,
    @Res({ passthrough: true }) res: Response,
  ) {
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

      res.cookie('jwt', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return {
        message: 'Bienvenue dans la guilde !',
      };
    } catch (error: any) {
      throw error;
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { message: 'Déconnecté avec succès' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user;
  }
}
