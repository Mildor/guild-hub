import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  useDetectNewCharacters,
  useImportSelectedCharacters,
  type DetectNewCharacter,
} from '@/api/queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SyncMissingCharactersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
}

export function SyncMissingCharactersModal({
  open,
  onOpenChange,
  onImported,
}: SyncMissingCharactersModalProps) {
  const {
    data: missingCharacters,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useDetectNewCharacters(open);
  const importSelectedMutation = useImportSelectedCharacters();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelectedKeys(new Set());
    }
  }, [open]);

  const selectedCharacters = useMemo(() => {
    return (missingCharacters ?? []).filter((character) =>
      selectedKeys.has(toCharacterKey(character.name, character.realm)),
    );
  }, [missingCharacters, selectedKeys]);

  const toggleSelection = (character: DetectNewCharacter) => {
    const key = toCharacterKey(character.name, character.realm);

    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleImport = () => {
    if (selectedCharacters.length === 0 || importSelectedMutation.isPending) {
      return;
    }

    importSelectedMutation.mutate(
      selectedCharacters.map((character) => ({
        name: character.name,
        realm: character.realm,
      })),
      {
        onSuccess: (result) => {
          const importedCount = result.length ?? selectedCharacters.length;
          onImported?.(importedCount);
          onOpenChange(false);
        },
      },
    );
  };

  const apiErrorMessage = (error as any)?.response?.data?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Synchronisation manuelle du roster</DialogTitle>
          <DialogDescription>
            Detectez les personnages Battle.net de The Good Place qui ne sont pas encore importes.
          </DialogDescription>
        </DialogHeader>

        {isLoading || isFetching ? (
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scan de l&apos;armurerie Blizzard...
            </p>
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {typeof apiErrorMessage === 'string'
                ? apiErrorMessage
                : 'Impossible de detecter les personnages pour le moment.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !isFetching && !isError ? (
          missingCharacters && missingCharacters.length > 0 ? (
            <div className="space-y-3">
              <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                {missingCharacters.map((character) => {
                  const key = toCharacterKey(character.name, character.realm);
                  const checked = selectedKeys.has(key);

                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 transition-colors hover:border-amber-500/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelection(character)}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500"
                      />

                      <img
                        src={character.avatar || '/uploads/default-avatar.png'}
                        alt={`${character.name} avatar`}
                        className="h-10 w-10 rounded-full border border-slate-600 object-cover"
                        loading="lazy"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {character.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {character.realm} - {character.class} - {Math.round(character.ilvl)} iLvl
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-slate-400">
                {selectedCharacters.length} personnage(s) selectionne(s)
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-600/10 p-4 text-sm text-emerald-200">
              Tous vos personnages de la guilde sont deja synchronises !
            </div>
          )
        ) : null}

        {importSelectedMutation.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {(importSelectedMutation.error as any)?.response?.data?.message ||
                "L'import des personnages a echoue."}
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isLoading || isFetching || importSelectedMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Relancer le scan
          </Button>

          <Button
            type="button"
            onClick={handleImport}
            disabled={
              selectedCharacters.length === 0 ||
              importSelectedMutation.isPending ||
              isLoading ||
              isFetching
            }
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            {importSelectedMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Import en cours...
              </span>
            ) : (
              'Importer les personnages selectionnes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toCharacterKey(name: string, realm: string) {
  return `${name.trim().toLowerCase()}::${realm.trim().toLowerCase()}`;
}
