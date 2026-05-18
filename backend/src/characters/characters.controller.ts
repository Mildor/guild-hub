import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { RaiderioService } from '../raiderio/raiderio.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { ToggleRosterStatusDto } from './dto/toggle-roster-status.dto';
import { UpdateSharedProfilesDto } from './dto/update-shared-profiles.dto';
import { ImportSelectedCharactersDto } from './dto/import-selected-characters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface DetectNewCharacterResponse {
  name: string;
  realm: string;
  class: string;
  ilvl: number;
  avatar: string | null;
}

@ApiTags('characters')
@ApiBearerAuth()
@Controller('characters')
export class CharactersController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly blizzardService: BlizzardService,
    private readonly raiderioService: RaiderioService,
  ) {}

  @Get(':id/vault-progress')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Retourne la progression Great Vault (Raid Blizzard + M+ Raider.IO)',
  })
  @ApiResponse({
    status: 200,
    description: 'Progression Great Vault recuperee.',
  })
  @ApiResponse({ status: 403, description: 'Acces non autorise.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  async getVaultProgress(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    const character = await this.charactersService.findOneById(id);

    if (character.userId !== req.user.userId) {
      throw new ForbiddenException(
        "Vous ne pouvez acceder qu'a vos propres personnages",
      );
    }

    const [rioProfile, raidProgress] = await Promise.all([
      this.raiderioService.getCharacterProfile(character.realm, character.name),
      this.blizzardService.getWeeklyRaidProgress(
        req.user.userId,
        character.realm,
        character.name,
      ),
    ]);

    return {
      resetAt: raidProgress.resetAt,
      raid: {
        lfr: raidProgress.lfr,
        normal: raidProgress.normal,
        heroic: raidProgress.heroic,
        mythic: raidProgress.mythic,
        totalKilledBosses: raidProgress.totalKilledBosses,
        raidName: raidProgress.raidName,
      },
      mythicPlusWeeklyRuns:
        rioProfile?.mythic_plus_weekly_highest_level_runs ?? [],
      world: {
        delvesTier8Completed: 0,
      },
    };
  }

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

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Synchronise un personnage depuis Blizzard' })
  @ApiResponse({
    status: 200,
    description: 'Personnage synchronise avec succes.',
  })
  @ApiResponse({ status: 401, description: 'Token Battle.net manquant.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  syncSingleCharacter(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.blizzardService.syncSingleCharacter(req.user.userId, id);
  }

  @Post(':id/admin-sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Synchronise un personnage (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Personnage synchronise avec succes.',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  syncSingleCharacterAsAdmin(@Param('id') id: string) {
    return this.blizzardService.syncSingleCharacterByAdmin(id);
  }

  @Get('detect-new')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Detecte les personnages Blizzard de la guilde non encore enregistres localement',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des personnages detectes et non encore synchronises.',
  })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  async detectNewCharacters(
    @Req() req: { user: { userId?: string; id?: string } },
  ) {
    const userId = req.user.userId ?? req.user.id;

    if (!userId) {
      throw new ForbiddenException('Utilisateur introuvable dans le token.');
    }

    const guildName = (process.env.GUILD_NAME || 'The Good Place').trim();

    const [allCharactersFromApi, existingCharacters] = await Promise.all([
      this.blizzardService.getCharactersFromApi(userId),
      this.charactersService.findByUserIdForSharedConfig(userId),
    ]);

    const existingCharacterKeys = new Set(
      existingCharacters.map((character) =>
        this.toCharacterKey(character.name, character.realm),
      ),
    );

    const newCharacters: DetectNewCharacterResponse[] = allCharactersFromApi
      .filter(
        (character) =>
          character.guildName &&
          this.isSameNormalizedName(character.guildName, guildName),
      )
      .filter(
        (character) =>
          !existingCharacterKeys.has(
            this.toCharacterKey(character.name, character.realm),
          ),
      )
      .map((character) => ({
        name: character.name,
        realm: character.realm,
        class: character.className,
        ilvl: character.ilvl,
        avatar: character.avatarUrl,
      }));

    return newCharacters;
  }

  @Post('import-selected')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Importe une selection de personnages sans supprimer les personnages deja synchronises',
  })
  @ApiResponse({
    status: 200,
    description: 'Personnages importes avec succes.',
  })
  @ApiResponse({ status: 401, description: 'Non authentifie.' })
  async importSelectedCharacters(
    @Req() req: { user: { userId?: string; id?: string } },
    @Body() dto: ImportSelectedCharactersDto,
  ) {
    const userId = req.user.userId ?? req.user.id;

    if (!userId) {
      throw new ForbiddenException('Utilisateur introuvable dans le token.');
    }

    const guildName = (process.env.GUILD_NAME || 'The Good Place').trim();

    return this.blizzardService.syncSelectedCharacters(
      userId,
      dto.characters,
      guildName,
      {
        resetMainCharacter: false,
        pruneMissingCharacters: false,
      },
    );
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @ApiOperation({
    summary:
      'Synchronise les métiers de tous les personnages de tous les comptes',
  })
  @ApiResponse({
    status: 200,
    description: 'Synchronisation globale terminée.',
  })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  syncAll() {
    return this.blizzardService.syncAllUsersCharacters();
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
    @Headers('x-shared-profile') sharedProfile: string | undefined,
  ) {
    // Vérifier que l'utilisateur accède seulement ses propres personnages
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez accéder qu'à vos propres personnages",
      );
    }
    return this.charactersService.findByUserId(userId, sharedProfile);
  }

  @Get('user/:userId/all-for-shared-config')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Retourne tous les personnages du joueur pour config partagee',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste complete des personnages du joueur.',
  })
  @ApiResponse({ status: 403, description: 'Acces non autorise.' })
  getAllByUserIdForSharedConfig(
    @Param('userId') userId: string,
    @Req() req: { user: { userId: string } },
  ) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez accéder qu'à vos propres personnages",
      );
    }

    return this.charactersService.findByUserIdForSharedConfig(userId);
  }

  @Patch('shared-profiles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Affecte les personnages aux profils partages du compte',
  })
  @ApiResponse({ status: 200, description: 'Affectations mises a jour.' })
  assignSharedProfiles(
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateSharedProfilesDto,
  ) {
    return this.charactersService.assignSharedProfiles(
      req.user.userId,
      dto.assignments,
    );
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
  @ApiOperation({
    summary: 'Definit ce personnage comme personnage roster personnel',
  })
  @ApiResponse({ status: 200, description: 'Personnage roster mis a jour.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  setRosterCharacter(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Headers('x-shared-profile') sharedProfile: string | undefined,
  ) {
    return this.charactersService.setRosterCharacter(
      req.user.userId,
      id,
      sharedProfile,
    );
  }

  @Patch(':id/guild-roster')
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
    @Headers('x-shared-profile') sharedProfile: string | undefined,
  ) {
    return this.charactersService.setMainCharacter(
      req.user.userId,
      id,
      sharedProfile,
    );
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

  private toCharacterKey(name: string, realm: string): string {
    return `${this.normalizeComparableName(name)}::${this.normalizeComparableName(realm)}`;
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
