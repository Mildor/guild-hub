import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { CharactersService } from './characters.service';
import { BlizzardService } from '../blizzard/blizzard.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { ToggleRosterStatusDto } from './dto/toggle-roster-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('characters')
@ApiBearerAuth()
@Controller('characters')
export class CharactersController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly blizzardService: BlizzardService,
  ) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Synchronise les personnages depuis Blizzard' })
  @ApiResponse({
    status: 200,
    description: 'Personnages synchronisés avec succès.',
  })
  @ApiResponse({ status: 401, description: 'Token Battle.net manquant.' })
  async sync(@Req() req: { user: { userId: string } }) {
    return this.blizzardService.syncUserCharacters(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crée un personnage et le lie à un utilisateur' })
  @ApiResponse({ status: 201, description: 'Personnage créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  create(@Body() dto: CreateCharacterDto) {
    return this.charactersService.create(dto);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Retourne tous les personnages d'un joueur" })
  @ApiResponse({ status: 200, description: 'Liste des personnages du joueur.' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  findByUserId(
    @Param('userId') userId: string,
    @Req() req: { user: { userId: string } },
  ) {
    // Vérifier que l'utilisateur accède seulement ses propres personnages
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez accéder qu'à vos propres personnages",
      );
    }
    return this.charactersService.findByUserId(userId);
  }

  @Get('roster')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retourne le roster actuel de la guilde' })
  @ApiResponse({
    status: 200,
    description: 'Liste des personnages présents dans le roster.',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  getRoster() {
    return this.charactersService.getRoster();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Retourne tous les personnages de la guilde' })
  @ApiResponse({ status: 200, description: 'Liste complète des personnages.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  getAllCharacters() {
    return this.charactersService.getAllCharacters();
  }

  @Patch(':id/roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Active ou retire un personnage du roster' })
  @ApiResponse({ status: 200, description: 'Statut roster mis à jour.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  toggleRosterStatus(
    @Param('id') id: string,
    @Body() dto: ToggleRosterStatusDto,
  ) {
    return this.charactersService.toggleRosterStatus(id, dto.inRoster);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Met à jour les stats d'un personnage" })
  @ApiResponse({
    status: 200,
    description: 'Personnage mis à jour avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  update(@Param('id') id: string, @Body() dto: UpdateCharacterDto) {
    return this.charactersService.update(id, dto);
  }

  @Patch(':id/main')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Défini un personnage comme principal' })
  @ApiResponse({
    status: 200,
    description: 'Personnage défini comme principal.',
  })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  setMainCharacter(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.charactersService.setMainCharacter(req.user.userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Supprime un personnage' })
  @ApiResponse({ status: 200, description: 'Personnage supprimé avec succès.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  remove(@Param('id') id: string) {
    return this.charactersService.remove(id);
  }
}
