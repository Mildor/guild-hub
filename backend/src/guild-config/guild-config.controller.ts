import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { GuildConfigService } from './guild-config.service';
import { SetupGuildConfigDto } from './dto/setup-guild-config.dto';
import { UpdateGuildConfigDto } from './dto/update-guild-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Guild Config')
@Controller()
export class GuildConfigController {
  constructor(private readonly guildConfigService: GuildConfigService) {}

  /**
   * Récupère la configuration publique de la guilde (branding, nom, statut de recrutement, etc.)
   * Accessible publiquement sans authentification.
   */
  @Get(['config/public', 'api/config/public'])
  @ApiOperation({ summary: 'Récupérer la configuration publique de la guilde' })
  @ApiResponse({
    status: 200,
    description: 'Configuration publique de la guilde retournée avec succès (sans fuite de secret).',
  })
  async getPublicConfig() {
    return this.guildConfigService.getPublicConfig();
  }

  /**
   * Assistant d'installation initial (Setup Wizard).
   * Disponible uniquement si l'application n'est pas encore configurée.
   */
  @Post(['config/setup', 'api/config/setup'])
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Configuration initiale (Setup Wizard)' })
  @ApiResponse({
    status: 201,
    description: 'Guilde configurée avec succès.',
  })
  @ApiResponse({
    status: 400,
    description: 'L\'application est déjà configurée.',
  })
  async setup(@Body() dto: SetupGuildConfigDto) {
    return this.guildConfigService.setup(dto);
  }

  /**
   * Récupère la configuration détaillée pour les administrateurs (secrets masqués).
   */
  @Get(['admin/config', 'api/admin/config'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Récupérer la configuration administrateur (réservé aux admins)' })
  @ApiResponse({
    status: 200,
    description: 'Configuration détaillée retournée.',
  })
  async getAdminConfig() {
    return this.guildConfigService.getAdminConfig();
  }

  /**
   * Met à jour la configuration de la guilde (réservé aux administrateurs).
   */
  @Patch(['admin/config', 'api/admin/config'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour la configuration de la guilde (réservé aux admins)' })
  @ApiResponse({
    status: 200,
    description: 'Configuration mise à jour avec succès.',
  })
  async updateConfig(@Body() dto: UpdateGuildConfigDto) {
    return this.guildConfigService.update(dto);
  }
}

