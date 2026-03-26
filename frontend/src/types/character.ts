export enum WoWClass {
  WARRIOR = 'Warrior',
  PALADIN = 'Paladin',
  HUNTER = 'Hunter',
  ROGUE = 'Rogue',
  PRIEST = 'Priest',
  DEATH_KNIGHT = 'DeathKnight',
  SHAMAN = 'Shaman',
  MAGE = 'Mage',
  WARLOCK = 'Warlock',
  MONK = 'Monk',
  DRUID = 'Druid',
  DEMON_HUNTER = 'DemonHunter',
  EVOKER = 'Evoker',
}

export enum GameRole {
  TANK = 'TANK',
  HEALER = 'HEALER',
  DPS = 'DPS',
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  realm: string;
  class: string;
  activeSpec: string;
  gameRole: GameRole;
  ilvl: number;
  isMain: boolean;
  guildRank?: number | null;
  lastSyncAt: string;
}
