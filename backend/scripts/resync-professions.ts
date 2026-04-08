import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const prisma = new PrismaClient();
const BLIZZARD_API_BASE = 'https://eu.api.blizzard.com';

interface BlizzardTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ProfessionSnapshot {
  professionId: number | null;
  profession: string;
  skillLevel: number;
  recipes: Array<{ id: number | null; name: string }>;
}

interface NormalizedProfession {
  professionId: number | null;
  profession: string;
  skillLevel: number;
  recipes: Array<{ id: number | null; nameFr?: string; nameEn?: string }>;
}

let clientTokenCache: { token: string; expiresAt: number } | null = null;

async function getClientAccessToken(): Promise<string> {
  const now = Date.now();
  if (clientTokenCache && clientTokenCache.expiresAt > now) {
    return clientTokenCache.token;
  }

  const response = await axios.post<BlizzardTokenResponse>(
    'https://oauth.battle.net/oauth/token',
    null,
    {
      params: {
        grant_type: 'client_credentials',
      },
      auth: {
        username: process.env.BLIZZARD_CLIENT_ID!,
        password: process.env.BLIZZARD_CLIENT_SECRET!,
      },
    },
  );

  clientTokenCache = {
    token: response.data.access_token,
    expiresAt: now + response.data.expires_in * 1000 - 60000,
  };

  return response.data.access_token;
}

async function fetchCharacterProfessions(
  realmSlug: string,
  characterName: string,
  locale: 'fr_FR' | 'en_GB',
  token: string,
): Promise<ProfessionSnapshot[]> {
  const response = await axios.get(
    `${BLIZZARD_API_BASE}/profile/wow/character/${realmSlug}/${characterName}/professions`,
    {
      params: {
        namespace: 'profile-eu',
        locale,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return (response.data.professions ?? [])
    .map((profession: any) => {
      const professionName = profession.profession?.name?.trim();
      if (!professionName) {
        return null;
      }

      const tierSkillLevels = (profession.tiers ?? [])
        .map((tier: any) => tier.skill_points ?? 0)
        .filter((value: number) => Number.isFinite(value));

      const skillLevel = Math.max(
        profession.skill_points ?? 0,
        ...tierSkillLevels,
      );

      const recipes = new Map<string, { id: number | null; name: string }>();

      for (const recipe of profession.known_recipes ?? []) {
        const recipeName = recipe.name?.trim();
        const recipeId = typeof recipe.id === 'number' ? recipe.id : null;
        if (!recipeName && recipeId === null) {
          continue;
        }

        const key =
          recipeId !== null ? `id:${recipeId}` : `name:${recipeName?.toLowerCase()}`;
        if (!recipes.has(key)) {
          recipes.set(key, {
            id: recipeId,
            name: recipeName || String(recipeId),
          });
        }
      }

      for (const tier of profession.tiers ?? []) {
        for (const recipe of tier.known_recipes ?? []) {
          const recipeName = recipe.name?.trim();
          const recipeId = typeof recipe.id === 'number' ? recipe.id : null;
          if (!recipeName && recipeId === null) {
            continue;
          }

          const key =
            recipeId !== null ? `id:${recipeId}` : `name:${recipeName?.toLowerCase()}`;
          if (!recipes.has(key)) {
            recipes.set(key, {
              id: recipeId,
              name: recipeName || String(recipeId),
            });
          }
        }
      }

      return {
        professionId:
          typeof profession.profession?.id === 'number'
            ? profession.profession.id
            : null,
        profession: professionName,
        skillLevel,
        recipes: Array.from(recipes.values()),
      };
    })
    .filter((p: any) => p !== null);
}

function mergeLocalizedProfessions(
  frData: ProfessionSnapshot[],
  enData: ProfessionSnapshot[],
): NormalizedProfession[] {
  const merged = new Map<string, NormalizedProfession>();

  const getProfessionKey = (profession: ProfessionSnapshot): string => {
    if (profession.professionId !== null) {
      return `id:${profession.professionId}`;
    }
    return `name:${profession.profession.toLowerCase()}`;
  };

  const getRecipeKey = (recipe: {
    id: number | null;
    name?: string;
    nameFr?: string;
    nameEn?: string;
  }): string => {
    if (recipe.id !== null) {
      return `id:${recipe.id}`;
    }
    const nameValue =
      (recipe as any).name ||
      (recipe as any).nameFr ||
      (recipe as any).nameEn ||
      '';
    return `name:${nameValue.toLowerCase()}`;
  };

  for (const profession of frData) {
    merged.set(getProfessionKey(profession), {
      professionId: profession.professionId,
      profession: profession.profession,
      skillLevel: profession.skillLevel,
      recipes: profession.recipes.map((recipe) => ({
        id: recipe.id,
        nameFr: recipe.name,
        nameEn: recipe.name,
      })),
    });
  }

  for (const professionEn of enData) {
    const professionKey = getProfessionKey(professionEn);
    const existing = merged.get(professionKey);

    if (!existing) {
      merged.set(professionKey, {
        professionId: professionEn.professionId,
        profession: professionEn.profession,
        skillLevel: professionEn.skillLevel,
        recipes: professionEn.recipes.map((recipe) => ({
          id: recipe.id,
          nameFr: recipe.name,
          nameEn: recipe.name,
        })),
      });
      continue;
    }

    existing.skillLevel = Math.max(
      existing.skillLevel,
      professionEn.skillLevel,
    );
    const recipeMap = new Map(
      existing.recipes.map((recipe) => [getRecipeKey(recipe), recipe]),
    );

    for (const recipeEn of professionEn.recipes) {
      const recipeKeyEn =
        recipeEn.id !== null
          ? `id:${recipeEn.id}`
          : `name:${recipeEn.name.toLowerCase()}`;
      const existingRecipe = recipeMap.get(recipeKeyEn);

      if (existingRecipe) {
        existingRecipe.nameEn = recipeEn.name;
        continue;
      }

      recipeMap.set(recipeKeyEn, {
        id: recipeEn.id,
        nameFr: recipeEn.name,
        nameEn: recipeEn.name,
      });
    }

    existing.recipes = Array.from(recipeMap.values());
  }

  return Array.from(merged.values());
}

async function resyncCharacterProfessions(
  characterId: string,
  realmSlug: string,
  characterName: string,
): Promise<void> {
  const clientToken = await getClientAccessToken();

  try {
    const [frProfessions, enProfessions] = await Promise.all([
      fetchCharacterProfessions(realmSlug, characterName, 'fr_FR', clientToken),
      fetchCharacterProfessions(realmSlug, characterName, 'en_GB', clientToken),
    ]);

    const normalized = mergeLocalizedProfessions(frProfessions, enProfessions);

    for (const profession of normalized) {
      await prisma.characterProfession.upsert({
        where: {
          characterId_profession: {
            characterId,
            profession: profession.profession,
          },
        },
        update: {
          skillLevel: profession.skillLevel,
          recipes: profession.recipes,
        },
        create: {
          characterId,
          profession: profession.profession,
          skillLevel: profession.skillLevel,
          recipes: profession.recipes,
        },
      });
    }

    console.log(`✓ ${characterName} - métiers synchronisés`);
  } catch (error) {
    console.error(`✗ ${characterName} - Erreur:`, (error as Error).message);
  }
}

async function main() {
  console.log('🔄 Resynchronisation des métiers de tous les personnages...\n');

  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      realm: true,
    },
  });

  console.log(`Trouvé ${characters.length} personnages à synchroniser\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const character of characters) {
    await resyncCharacterProfessions(
      character.id,
      character.realm,
      character.name,
    );
    successCount++;
  }

  errorCount = characters.length - successCount;

  console.log(`\n✅ Synchronisation terminée`);
  console.log(`   Succès: ${successCount}/${characters.length}`);
  if (errorCount > 0) {
    console.log(`   Erreurs: ${errorCount}/${characters.length}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
