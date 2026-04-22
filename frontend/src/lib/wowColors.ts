import type { GameRole } from '@/types/character';
import type { AppRole } from '@/types/auth';

// ── WoW Class Colors ──
// Source of truth: CSS variables defined in index.css (--color-wow-*)
// All components MUST use these helpers instead of hardcoding hex values.

/** CSS variable name for each WoW class (English key) */
const CLASS_CSS_VARS: Record<string, string> = {
  Warrior: 'var(--color-wow-warrior)',
  Paladin: 'var(--color-wow-paladin)',
  Hunter: 'var(--color-wow-hunter)',
  Rogue: 'var(--color-wow-rogue)',
  Priest: 'var(--color-wow-priest)',
  DeathKnight: 'var(--color-wow-death-knight)',
  Shaman: 'var(--color-wow-shaman)',
  Mage: 'var(--color-wow-mage)',
  Warlock: 'var(--color-wow-warlock)',
  Monk: 'var(--color-wow-monk)',
  Druid: 'var(--color-wow-druid)',
  DemonHunter: 'var(--color-wow-demon-hunter)',
  Evoker: 'var(--color-wow-evoker)',
};

/** French class name → English key mapping */
const FR_TO_EN: Record<string, string> = {
  Guerrier: 'Warrior',
  Paladin: 'Paladin',
  Chasseur: 'Hunter',
  Voleur: 'Rogue',
  Pretre: 'Priest',
  Prêtre: 'Priest',
  ChevalierDeLaMort: 'DeathKnight',
  Chaman: 'Shaman',
  Mage: 'Mage',
  Demoniste: 'Warlock',
  Démoniste: 'Warlock',
  Moine: 'Monk',
  Druide: 'Druid',
  ChasseurDeDemons: 'DemonHunter',
  Evoker: 'Evoker',
  Evocateur: 'Evoker',
};

/**
 * Normalize a class name string to a lookup-friendly key.
 * Handles accents, underscores, spaces, and casing.
 * e.g. "DEATH_KNIGHT" → "DeathKnight", "Chevalier de la mort" → "ChevalierDeLaMort"
 */
export function normalizeClassName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

/**
 * Get the CSS variable reference for a WoW class.
 * Works with English, French, or raw API names (e.g. "DEATH_KNIGHT").
 * Returns the var() string or undefined if not found.
 */
function resolveClassVar(className: string): string | undefined {
  const normalized = normalizeClassName(className);
  // Try direct English lookup first
  if (CLASS_CSS_VARS[normalized]) return CLASS_CSS_VARS[normalized];
  // Try French → English mapping
  const enKey = FR_TO_EN[normalized];
  if (enKey) return CLASS_CSS_VARS[enKey];
  return undefined;
}

/**
 * Returns an inline style object with the class color.
 * Usage: <span style={getClassColorStyle('Mage')}>Mage</span>
 */
export function getClassColorStyle(className: string): React.CSSProperties {
  const cssVar = resolveClassVar(className);
  return cssVar ? { color: cssVar } : {};
}

/**
 * Returns a Tailwind-compatible class string for text color.
 * Usage: <span className={getClassColorClass('Warrior')}>Warrior</span>
 */
export function getClassColorClass(className: string): string {
  const normalized = normalizeClassName(className);
  const enKey = FR_TO_EN[normalized] || normalized;

  const CSS_VAR_MAP: Record<string, string> = {
    Warrior: 'text-[var(--color-wow-warrior)]',
    Paladin: 'text-[var(--color-wow-paladin)]',
    Hunter: 'text-[var(--color-wow-hunter)]',
    Rogue: 'text-[var(--color-wow-rogue)]',
    Priest: 'text-[var(--color-wow-priest)]',
    DeathKnight: 'text-[var(--color-wow-death-knight)]',
    Shaman: 'text-[var(--color-wow-shaman)]',
    Mage: 'text-[var(--color-wow-mage)]',
    Warlock: 'text-[var(--color-wow-warlock)]',
    Monk: 'text-[var(--color-wow-monk)]',
    Druid: 'text-[var(--color-wow-druid)]',
    DemonHunter: 'text-[var(--color-wow-demon-hunter)]',
    Evoker: 'text-[var(--color-wow-evoker)]',
  };

  return CSS_VAR_MAP[enKey] || 'text-foreground';
}

// ── Role Styles ──

export const ROLE_STYLES: Record<GameRole, { title: string; accent: string }> = {
  TANK: { title: 'Tanks', accent: 'border-sky-500/35 bg-sky-500/10 text-sky-200' },
  HEALER: { title: 'Healers', accent: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200' },
  DPS: { title: 'DPS', accent: 'border-rose-500/35 bg-rose-500/10 text-rose-200' },
};

// ── App Role Badge Styles ──

export const ROLE_BADGE_STYLES: Record<AppRole, string> = {
  ADMIN: 'bg-red-500/20 text-red-700 border border-red-400/40 dark:text-red-300',
  OFFICER: 'bg-blue-500/20 text-blue-700 border border-blue-400/40 dark:text-blue-300',
  MEMBER: 'bg-green-500/20 text-green-700 border border-green-400/40 dark:text-green-300',
  GUEST: 'bg-slate-500/20 text-slate-700 border border-slate-400/40 dark:text-slate-300',
};

// ── Attendance Status Styles ──

export const STATUS_STYLES: Record<string, string> = {
  ACCEPTED: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  TENTATIVE: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  LATE: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
  DECLINED: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
};
