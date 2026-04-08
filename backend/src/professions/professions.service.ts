import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ProfessionSearchResult {
  name: string;
  realm: string;
  class: string;
  profession: string;
  skillLevel: number;
}

export interface ProfessionSummary {
  totalCrafters: number;
  totalRecipes: number;
  topProfessions: Array<{
    profession: string;
    crafterCount: number;
  }>;
}

@Injectable()
export class ProfessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchByRecipe(recipe: string): Promise<ProfessionSearchResult[]> {
    const query = recipe.trim();
    if (!query) {
      throw new BadRequestException('Le parametre recipe est requis.');
    }

    const likeQuery = `%${query}%`;

    const rows = await this.prisma.$queryRaw<
      ProfessionSearchResult[]
    >(Prisma.sql`
      SELECT
        c.name,
        c.realm,
        c.class,
        cp.profession,
        cp."skillLevel"
      FROM "CharacterProfession" cp
      INNER JOIN "Character" c ON c.id = cp."characterId"
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(cp.recipes::jsonb) AS recipe
        WHERE (
          jsonb_typeof(recipe) = 'object'
          AND (
            COALESCE(recipe ->> 'nameFr', '') ILIKE ${likeQuery}
            OR COALESCE(recipe ->> 'nameEn', '') ILIKE ${likeQuery}
          )
        )
        OR (
          jsonb_typeof(recipe) = 'string'
          AND trim(BOTH '"' FROM recipe::text) ILIKE ${likeQuery}
        )
      )
      ORDER BY cp."skillLevel" DESC, c.name ASC
    `);

    return rows;
  }

  async getGuildProfessionsSummary(): Promise<ProfessionSummary> {
    // Nombre total d'artisans (personnages avec au moins 1 métier)
    const craftersResult = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(DISTINCT cp."characterId") as count
      FROM "CharacterProfession" cp
    `);

    const totalCrafters = Number(craftersResult[0]?.count ?? 0);

    // Nombre total de recettes (somme des recettes de tous les métiers)
    const recipesResult = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COALESCE(SUM(jsonb_array_length(cp.recipes::jsonb)), 0) as count
      FROM "CharacterProfession" cp
    `);

    const totalRecipes = Number(recipesResult[0]?.count ?? 0);

    // Top professions par nombre de persos
    const topProfessionsResult = await this.prisma.$queryRaw<
      Array<{ profession: string; crafterCount: bigint }>
    >(Prisma.sql`
      SELECT
        cp.profession,
        COUNT(DISTINCT cp."characterId") as "crafterCount"
      FROM "CharacterProfession" cp
      GROUP BY cp.profession
      ORDER BY "crafterCount" DESC
      LIMIT 5
    `);

    const topProfessions = topProfessionsResult.map((row) => ({
      profession: row.profession,
      crafterCount: Number(row.crafterCount),
    }));

    return {
      totalCrafters,
      totalRecipes,
      topProfessions,
    };
  }}