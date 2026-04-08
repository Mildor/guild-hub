import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ProfessionSearchResult,
  ProfessionsService,
} from './professions.service';

@ApiTags('professions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('professions')
export class ProfessionsController {
  constructor(private readonly professionsService: ProfessionsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Recherche les personnages pouvant craft une recette',
  })
  @ApiQuery({
    name: 'recipe',
    required: true,
    description: 'Nom (ou partie du nom) de la recette a rechercher',
  })
  @ApiResponse({
    status: 200,
    description:
      'Liste des personnages trouves (nom, serveur, classe, metier, niveau).',
  })
  @ApiResponse({
    status: 400,
    description: 'Le parametre recipe est manquant.',
  })
  search(@Query('recipe') recipe: string): Promise<ProfessionSearchResult[]> {
    return this.professionsService.searchByRecipe(recipe ?? '');
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Récupère un résumé des métiers de la guilde',
  })
  @ApiResponse({
    status: 200,
    description:
      'Résumé incluant le nombre total de crafters, recettes, et top métiers.',
  })
  summary() {
    return this.professionsService.getGuildProfessionsSummary();
  }
}
