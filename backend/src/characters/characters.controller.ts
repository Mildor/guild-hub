import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { BlizzardService } from '../blizzard/blizzard.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('characters')
@Controller('characters')
export class CharactersController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly blizzardService: BlizzardService,
  ) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Synchronise les personnages depuis Blizzard' })
  @ApiResponse({ status: 200, description: 'Personnages synchronisés avec succès.' })
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
  findByUserId(@Param('userId') userId: string, @Req() req: { user: { userId: string } }) {
    // Vérifier que l'utilisateur accède seulement ses propres personnages
    if (req.user.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez accéder qu\'à vos propres personnages');
    }
    return this.charactersService.findByUserId(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Met à jour les stats d'un personnage" })
  @ApiResponse({ status: 200, description: 'Personnage mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  update(@Param('id') id: string, @Body() dto: UpdateCharacterDto) {
    return this.charactersService.update(id, dto);
  }

  @Patch(':id/main')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Défini un personnage comme principal' })
  @ApiResponse({ status: 200, description: 'Personnage défini comme principal.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  setMainCharacter(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.charactersService.setMainCharacter(req.user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprime un personnage' })
  @ApiResponse({ status: 200, description: 'Personnage supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  remove(@Param('id') id: string) {
    return this.charactersService.remove(id);
  }
}
