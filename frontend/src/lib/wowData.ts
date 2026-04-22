// Mapping des icons WoW via Wowhead/ZamImg CDN
export const classIcons: Record<string, string> = {
  // Utilise le type WoWClass (en majuscules avec underscores)
  'Warrior': 'classicon_warrior',
  'Paladin': 'classicon_paladin',
  'Hunter': 'classicon_hunter',
  'Rogue': 'classicon_rogue',
  'Priest': 'classicon_priest',
  'DeathKnight': 'spell_deathknight_classicon',
  'Shaman': 'classicon_shaman',
  'Mage': 'classicon_mage',
  'Warlock': 'classicon_warlock',
  'Monk': 'classicon_monk',
  'Druid': 'classicon_druid',
  'DemonHunter': 'classicon_demonhunter',
  'Evoker': 'classicon_evoker',

  // Également supporter les noms français
  'Guerrier': 'classicon_warrior',
  'Paladin': 'classicon_paladin',
  'Chasseur': 'classicon_hunter',
  'Voleur': 'classicon_rogue',
  'Prêtre': 'classicon_priest',
  'Chevalier de la mort': 'spell_deathknight_classicon',
  'Chaman': 'classicon_shaman',
  'Mage': 'classicon_mage',
  'Démoniste': 'classicon_warlock',
  'Moine': 'classicon_monk',
  'Druide': 'classicon_druid',
  'Chasseur de démons': 'classicon_demonhunter',
  'Évocateur': 'classicon_evoker',
};

export const roleIcons: Record<string, string> = {
  'TANK': 'inv_shield_06',
  'HEALER': 'spell_holy_flashheal',
  'DPS': 'inv_sword_27',
};

// Mapping des slots d'équipement vers noms lisibles en français
export const slotNames: Record<string, string> = {
  'HEAD': 'Tête',
  'NECK': 'Cou',
  'SHOULDER': 'Épaule',
  'BACK': 'Dos',
  'CHEST': 'Torse',
  'WAIST': 'Taille',
  'LEGS': 'Jambes',
  'FEET': 'Pieds',
  'WRIST': 'Poignets',
  'HANDS': 'Mains',
  'FINGER': 'Bague',
  'FINGER_1': 'Bague 1',
  'FINGER_2': 'Bague 2',
  'TRINKET': 'Bijou',
  'TRINKET_2': 'Bijou 2',
  'MAIN_HAND': 'Main droite',
  'OFF_HAND': 'Main gauche',
  'RANGED': 'À distance',
  'BACK_SLOT': 'Dos',
};

// Mapping des qualités d'items vers couleurs Tailwind
export const itemQualityColors: Record<number, string> = {
  0: 'text-gray-300',        // Poor
  1: 'text-white',            // Common
  2: 'text-green-400',        // Uncommon
  3: 'text-blue-400',         // Rare
  4: 'text-purple-400',       // Epic
  5: 'text-orange-400',       // Legendary
  6: 'text-red-500',          // Artifact
  7: 'text-red-300',          // Heirloom
};

// Mapping des noms de qualité (Blizzard API) vers IDs
export const qualityNameToId: Record<string, number> = {
  'Poor': 0,
  'Common': 1,
  'Uncommon': 2,
  'Rare': 3,
  'Epic': 4,
  'Legendary': 5,
  'Artifact': 6,
  'Heirloom': 7,
  'Pauvre': 0,
  'Commun': 1,
  'Peu courant': 2,
  'Rare': 3,
  'Épique': 4,
  'Légendaire': 5,
  'Artefact': 6,
  'Héritage': 7,
};
