import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AppRole, User } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BlizzardService } from '../blizzard/blizzard.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from './decorators/roles.decorator';
import { BnetCallbackGuard } from './guards/bnet-callback.guard';
import { ConfirmOnboardingDto } from './dto/confirm-onboarding.dto';

interface VerifyGuildDto {
  characterName: string;
  realm?: string;
}

interface OnboardingCharacterResponse {
  name: string;
  realm: string;
  class: string;
  level: number;
  avatar: string | null;
}

@ApiTags('auth')
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
  @UseGuards(BnetCallbackGuard)
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

  @Get('onboarding/check')
  @UseGuards(JwtAuthGuard)
  async checkOnboardingCharacters(@Req() req: Request) {
    const user = req.user as any;
    const userId = user.userId || user.id;
    const guildName = (process.env.GUILD_NAME || 'The Good Place').trim();

    const allCharacters =
      await this.blizzardService.getCharactersFromApi(userId);

    const guildCharacters: OnboardingCharacterResponse[] = allCharacters
      .filter(
        (character) =>
          character.guildName &&
          this.isSameNormalizedName(character.guildName, guildName),
      )
      .map((character) => ({
        name: character.name,
        realm: character.realm,
        class: character.className,
        level: character.level,
        avatar: character.avatarUrl,
      }));

    return guildCharacters;
  }

  @Post('onboarding/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmOnboarding(
    @Req() req: Request,
    @Body() body: ConfirmOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as any;
    const userId = user.userId || user.id;
    const guildName = (process.env.GUILD_NAME || 'The Good Place').trim();

    const syncedCharacters = await this.blizzardService.syncSelectedCharacters(
      userId,
      body.characters,
      guildName,
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

    const token = this.authService.generateJwt(effectiveUser);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Onboarding termine avec succes.',
      token,
      characters: syncedCharacters,
    };
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

  @Get('failed-login-attempts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retourne les tentatives de connexion echouees' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  getFailedLoginAttempts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 50;

    return this.authService.getFailedLoginAttempts(parsedPage, parsedLimit);
  }

  private isSameNormalizedName(left: string, right: string): boolean {
    return (
      this.normalizeComparableName(left) === this.normalizeComparableName(right)
    );
  }

  private normalizeComparableName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
