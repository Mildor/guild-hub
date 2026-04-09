import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Hammer,
  Users,
  BookOpen,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  useSearchProfessions,
  useGuildProfessionsSummary,
  useGuildProfessionsDirectory,
} from '@/api/queries';
import { getClassColorClass } from '@/lib/wowColors';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const COPY_FEEDBACK_MS = 1500;

const copyToClipboard = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export function CrafterHubPage() {
  const [inputValue, setInputValue] = useState('');
  const [recipeQuery, setRecipeQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useGuildProfessionsSummary();
  const {
    data: directoryData,
    isLoading: directoryLoading,
  } = useGuildProfessionsDirectory();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRecipeQuery(inputValue.trim());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [inputValue]);

  const {
    data: results,
    isLoading,
    isFetching,
    isError,
  } = useSearchProfessions(recipeQuery);

  const hasQuery = recipeQuery.length > 0;
  const resultCount = results?.length ?? 0;

  const subtitle = useMemo(() => {
    if (!hasQuery) {
      return 'Tapez le nom d\'une recette ou d\'un métier.';
    }

    if (isLoading || isFetching) {
      return `Recherche de ${recipeQuery} en cours...`;
    }

    return `${resultCount} artisan${resultCount > 1 ? 's' : ''} trouve${resultCount > 1 ? 's' : ''} pour ${recipeQuery}.`;
  }, [hasQuery, isLoading, isFetching, recipeQuery, resultCount]);

  const handleCopyWhisper = async (name: string, realm: string) => {
    const whisperText = `/w ${name}-${realm} Salut, peux-tu m'aider pour ${recipeQuery} ?`;
    const key = `${name}-${realm}`;

    try {
      await copyToClipboard(whisperText);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), COPY_FEEDBACK_MS);
    } catch (error) {
      console.error('Copie du whisper impossible', error);
    }
  };

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <div className="relative overflow-hidden border-b border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_45%),radial-gradient(circle_at_10%_40%,rgba(148,163,184,0.14),transparent_35%)]" />
        <div className="relative container mx-auto px-4 py-10 md:px-8 md:py-14">
          <div className="max-w-4xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              <Hammer className="h-3.5 w-3.5" />
              Crafter Hub
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-50 md:text-5xl">
              Annuaire des métiers
            </h1>
            <p className="text-sm text-slate-300 md:text-base">{subtitle}</p>
          </div>

          <div className="mt-8">
            <label htmlFor="crafter-search" className="sr-only">
              Rechercher une recette ou un métier
            </label>
            <div className="group relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-400/80" />
              <input
                id="crafter-search"
                type="text"
                placeholder="Recherchez une recette ou un métier."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                className="h-14 w-full rounded-2xl border border-amber-500/30 bg-slate-950/70 pl-12 pr-4 text-base text-slate-100 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] outline-none transition duration-200 placeholder:text-slate-400 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] md:h-16 md:text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-8 md:py-8">
        {!hasQuery ? (
          <>
            {summaryLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-32 rounded-2xl bg-slate-800" />
                <Skeleton className="h-32 rounded-2xl bg-slate-800" />
                <Skeleton className="h-32 rounded-2xl bg-slate-800" />
              </div>
            ) : summaryData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-[inset_0_1px_0_rgba(245,158,11,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Artisans</p>
                        <p className="mt-2 text-4xl font-black text-amber-300">
                          {summaryData.totalCrafters}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-[inset_0_1px_0_rgba(245,158,11,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Recettes</p>
                        <p className="mt-2 text-4xl font-black text-amber-300">
                          {summaryData.totalRecipes}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-[inset_0_1px_0_rgba(245,158,11,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Métiers</p>
                        <p className="mt-2 text-4xl font-black text-amber-300">
                          {directoryData?.length ?? 0}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                    Annuaire des métiers
                  </h3>

                  {directoryLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 rounded-2xl bg-slate-800" />
                      <Skeleton className="h-16 rounded-2xl bg-slate-800" />
                      <Skeleton className="h-16 rounded-2xl bg-slate-800" />
                    </div>
                  ) : directoryData && directoryData.length > 0 ? (
                    <div className="space-y-3">
                      {directoryData.map((entry) => (
                        <details
                          key={entry.profession}
                          className="group overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/60 transition duration-200 open:border-amber-500/30 open:bg-slate-800"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:hidden">
                            <div>
                              <p className="text-base font-semibold text-slate-50">
                                {entry.profession}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {entry.crafterCount} artisan{entry.crafterCount > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                              <span>{entry.characters.length} persos</span>
                              <ChevronDown className="h-4 w-4 transition duration-200 group-open:rotate-180" />
                            </div>
                          </summary>

                          <div className="border-t border-slate-700 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {entry.characters.map((character) => (
                                <div
                                  key={`${character.name}-${character.realm}-${entry.profession}`}
                                  className="rounded-xl border border-slate-700 bg-slate-900/80 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p
                                        className={`truncate text-sm font-semibold ${getClassColorClass(character.class)}`}
                                      >
                                        {character.name}
                                      </p>
                                      <p className="truncate text-xs text-slate-400">
                                        {character.realm}
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300">
                                      {character.skillLevel}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                                    {character.class}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-sm text-slate-300">
                      Aucun métier trouvé pour le moment.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {hasQuery && (isLoading || isFetching) ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-2xl bg-slate-800" />
            <Skeleton className="h-40 w-full rounded-2xl bg-slate-800" />
          </div>
        ) : null}

        {hasQuery && isError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
            Une erreur est survenue pendant la recherche des métiers.
          </div>
        ) : null}

        {hasQuery && !isLoading && !isFetching && !isError && resultCount === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-sm text-slate-300">
            Aucun artisan trouvé pour cette recherche.
          </div>
        ) : null}

        {hasQuery && !isLoading && !isFetching && !isError && resultCount > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {results?.map((entry) => {
              const whisperKey = `${entry.name}-${entry.realm}`;
              const isCopied = copiedKey === whisperKey;

              return (
                <article
                  key={`${entry.name}-${entry.realm}-${entry.profession}`}
                  className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-[inset_0_1px_0_rgba(245,158,11,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-bold text-amber-300">
                        {entry.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-lg font-bold ${getClassColorClass(entry.class)}`}>
                          {entry.name}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.14em] text-slate-400">
                          {entry.realm}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-amber-300/85">
                        Niveau
                      </p>
                      <p className="text-lg font-extrabold text-amber-300">{entry.skillLevel}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-600 bg-slate-900/80 px-2.5 py-1 text-slate-200">
                      {entry.class}
                    </span>
                    <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                      {entry.profession}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() => handleCopyWhisper(entry.name, entry.realm)}
                      className="w-full border border-amber-500/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copie
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copier /w
                        </>
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
