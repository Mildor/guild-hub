import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RaiderioService } from './raiderio.service';

@ApiTags('raiderio')
@ApiBearerAuth()
@Controller('raiderio')
@UseGuards(JwtAuthGuard)
export class RaiderioGuildController {
  private readonly defaultGuildRealm = process.env.GUILD_REALM || 'archimonde';
  private readonly defaultGuildName =
    process.env.GUILD_NAME || 'The Good Place';

  constructor(private readonly raiderioService: RaiderioService) {}

  @Get('guild/profile')
  @ApiOperation({ summary: 'Retourne le profil Raider.IO de la guilde' })
  @ApiQuery({ name: 'realm', required: false, example: 'archimonde' })
  @ApiQuery({ name: 'name', required: false, example: 'The Good Place' })
  @ApiResponse({ status: 200, description: 'Profil de guilde recupere.' })
  async getGuildProfile(
    @Query('realm') realm?: string,
    @Query('name') name?: string,
  ) {
    const guildRealm = (realm || this.defaultGuildRealm).trim();
    const guildName = (name || this.defaultGuildName).trim();

    return this.raiderioService.getGuildProfile(guildRealm, guildName);
  }

  @Get('guild/leaderboard')
  @ApiOperation({
    summary: 'Retourne le classement Mythique+ des personnages de la guilde',
  })
  @ApiQuery({ name: 'realm', required: false, example: 'archimonde' })
  @ApiQuery({ name: 'name', required: false, example: 'The Good Place' })
  @ApiResponse({ status: 200, description: 'Classement de guilde recupere.' })
  async getGuildLeaderboard(
    @Query('realm') realm?: string,
    @Query('name') name?: string,
  ) {
    const guildRealm = (realm || this.defaultGuildRealm).trim();
    const guildName = (name || this.defaultGuildName).trim();

    return this.raiderioService.getGuildLeaderboard(guildRealm, guildName);
  }

  @Get('guild/unlinked-members')
  @UseGuards(RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({
    summary:
      'Retourne les personnages de guilde non relies a un personnage de la base',
  })
  @ApiQuery({ name: 'realm', required: false, example: 'archimonde' })
  @ApiQuery({ name: 'name', required: false, example: 'The Good Place' })
  @ApiResponse({
    status: 200,
    description: 'Liste des personnages de guilde sans lien de compte.',
  })
  @ApiResponse({ status: 403, description: 'Acces interdit.' })
  async getGuildUnlinkedMembers(
    @Query('realm') realm?: string,
    @Query('name') name?: string,
  ) {
    const guildRealm = (realm || this.defaultGuildRealm).trim();
    const guildName = (name || this.defaultGuildName).trim();

    return this.raiderioService.getGuildUnlinkedMembers(guildRealm, guildName);
  }
}
