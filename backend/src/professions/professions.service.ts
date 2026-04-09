import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PROFESSION_ALIAS_GROUPS = [
  ['alchemy', 'alchimie'],
  ['blacksmithing', 'blacksmith', 'forge'],
  ['enchanting', 'enchantement', 'enchante'],
  ['engineering', 'ingenierie'],
  ['herbalism', 'herboristerie'],
  ['inscription', 'calligraphie'],
  ['jewelcrafting', 'joaillerie'],
  ['leatherworking', 'travail du cuir'],
  ['mining', 'minage'],
  ['skinning', 'depecage'],
  ['tailoring', 'couture'],
  ['cooking', 'cuisine'],
  ['fishing', 'peche'],
  ['archaeology', 'archeologie'],
].map((group) => group.map(normalizeSearchText));

interface CharacterProfessionRow {
  name: string;
  realm: string;
  class: string;
  profession: string;
  skillLevel: number;
  recipes: Prisma.JsonValue;
}

export interface ProfessionDirectoryCharacter {
  name: string;
  realm: string;
  class: string;
  skillLevel: number;
}

export interface ProfessionDirectoryEntry {
  profession: string;
  crafterCount: number;
  characters: ProfessionDirectoryCharacter[];
}

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
    const query = normalizeSearchText(recipe);
    if (!query) {
      throw new BadRequestException('Le parametre recipe est requis.');
    }

    const rows = await this.fetchCharacterProfessionRows();

    return rows
      .filter(
        (row) =>
          this.matchesProfessionQuery(row.profession, query) ||
          this.matchesRecipeQuery(row.recipes, query),
      )
      .sort((left, right) => {
        if (right.skillLevel !== left.skillLevel) {
          return right.skillLevel - left.skillLevel;
        }

        return left.name.localeCompare(right.name);
      })
      .map((row) => ({
        name: row.name,
        realm: row.realm,
        class: row.class,
        profession: row.profession,
        skillLevel: row.skillLevel,
      }));
  }

  async getProfessionDirectory(): Promise<ProfessionDirectoryEntry[]> {
    const rows = await this.fetchCharacterProfessionRows();
    const directory = new Map<string, ProfessionDirectoryEntry>();

    for (const row of rows) {
      const existing = directory.get(row.profession);

      if (existing) {
        existing.characters.push({
          name: row.name,
          realm: row.realm,
          class: row.class,
          skillLevel: row.skillLevel,
        });
        continue;
      }

      directory.set(row.profession, {
        profession: row.profession,
        crafterCount: 1,
        characters: [
          {
            name: row.name,
            realm: row.realm,
            class: row.class,
            skillLevel: row.skillLevel,
          },
        ],
      });
    }

    return Array.from(directory.values())
      .map((entry) => ({
        ...entry,
        characters: entry.characters.sort((left, right) => {
          if (right.skillLevel !== left.skillLevel) {
            return right.skillLevel - left.skillLevel;
          }

          return left.name.localeCompare(right.name);
        }),
      }))
      .sort((left, right) => {
        if (right.crafterCount !== left.crafterCount) {
          return right.crafterCount - left.crafterCount;
        }

        return left.profession.localeCompare(right.profession);
      });
  }

  private async fetchCharacterProfessionRows(): Promise<CharacterProfessionRow[]> {
    return (await this.prisma.$queryRaw(Prisma.sql`
      SELECT
        c.name,
        c.realm,
        c.class,
        cp.profession,
        cp."skillLevel",
        cp.recipes
      FROM "CharacterProfession" cp
      INNER JOIN "Character" c ON c.id = cp."characterId"
      ORDER BY cp.profession ASC, cp."skillLevel" DESC, c.name ASC
    `)) as CharacterProfessionRow[];
  }

  private matchesProfessionQuery(profession: string, query: string): boolean {
    const normalizedProfession = normalizeSearchText(profession);

    if (!normalizedProfession || !query) {
      return false;
    }

    if (
      normalizedProfession.includes(query) ||
      query.includes(normalizedProfession)
    ) {
      return true;
    }

    return PROFESSION_ALIAS_GROUPS.some((group) => {
      const professionMatchesGroup = group.some(
        (alias) =>
          alias === normalizedProfession || normalizedProfession.includes(alias),
      );

      const queryMatchesGroup = group.some(
        (alias) => alias.includes(query) || query.includes(alias),
      );

      return professionMatchesGroup && queryMatchesGroup;
    });
  }

  private matchesRecipeQuery(
    recipes: Prisma.JsonValue,
    query: string,
  ): boolean {
    if (!Array.isArray(recipes)) {
      return false;
    }

    return recipes.some((recipe) => {
      if (typeof recipe === 'string') {
        const normalizedRecipe = normalizeSearchText(recipe);
        return (
          normalizedRecipe.includes(query) || query.includes(normalizedRecipe)
        );
      }

      if (!recipe || typeof recipe !== 'object') {
        return false;
      }

      const candidate = recipe as {
        name?: unknown;
        nameFr?: unknown;
        nameEn?: unknown;
      };

      const recipeNames = [
        candidate.name,
        candidate.nameFr,
        candidate.nameEn,
      ].filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );

      return recipeNames.some((recipeName) => {
        const normalizedRecipeName = normalizeSearchText(recipeName);
        return (
          normalizedRecipeName.includes(query) ||
          query.includes(normalizedRecipeName)
        );
      });
    });
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
  }
}