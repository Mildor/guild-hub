import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/auth';

interface OnboardingCharacter {
  name: string;
  realm: string;
  class: string;
  level: number;
  avatar: string | null;
}

interface ConfirmOnboardingResponse {
  message: string;
  token: string;
}

const AUTH_TOKEN_STORAGE_KEY = 'gh_auth_token';

export function OnboardingPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [characters, setCharacters] = useState<OnboardingCharacter[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user && user.appRole !== 'GUEST') {
      navigate('/dashboard', { replace: true });
      return;
    }

    const run = async () => {
      try {
        setIsScanning(true);
        setError('');

        const { data } = await api.get<OnboardingCharacter[]>('/auth/onboarding/check');
        setCharacters(data);
      } catch (err: any) {
        const apiErrorMessage = err?.response?.data?.message;
        setError(
          typeof apiErrorMessage === 'string'
            ? apiErrorMessage
            : 'Impossible de scanner vos personnages pour le moment.',
        );
      } finally {
        setIsScanning(false);
      }
    };

    void run();
  }, [navigate, user]);

  const selectedCharacters = useMemo(
    () =>
      characters.filter((character) =>
        selectedKeys.has(getCharacterKey(character.name, character.realm)),
      ),
    [characters, selectedKeys],
  );

  const toggleSelection = (character: OnboardingCharacter) => {
    const key = getCharacterKey(character.name, character.realm);

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

  const handleConfirmSelection = async () => {
    if (selectedCharacters.length === 0 || isConfirming) {
      return;
    }

    try {
      setIsConfirming(true);
      setError('');

      const payload = {
        characters: selectedCharacters.map((character) => ({
          name: character.name,
          realm: character.realm,
        })),
      };

      const { data } = await api.post<ConfirmOnboardingResponse>(
        '/auth/onboarding/confirm',
        payload,
      );

      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
      }

      const meResponse = await api.get<User>('/auth/me');
      setUser(meResponse.data);

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const apiErrorMessage = err?.response?.data?.message;
      setError(
        typeof apiErrorMessage === 'string'
          ? apiErrorMessage
          : 'La confirmation a echoue. Veuillez reessayer.',
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const noCharactersFound = !isScanning && characters.length === 0 && !error;

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {isScanning ? (
          <Card className="mx-auto w-full max-w-2xl border-primary/20 bg-card/80 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle className="text-2xl">Scan de vos personnages en cours...</CardTitle>
              <CardDescription>
                Nous analysons votre compte Battle.net pour retrouver vos personnages de guilde.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : noCharactersFound ? (
          <Card className="mx-auto w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 p-4">
                <ShieldAlert className="h-8 w-8 text-amber-400" />
              </div>
              <CardTitle className="text-2xl">Aucun personnage de la guilde detecte</CardTitle>
              <CardDescription>
                Aucun personnage appartenant a The Good Place n&apos;a ete trouve sur votre compte Battle.net.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild variant="secondary" className="cursor-pointer">
                <Link to="/">Retourner a l&apos;accueil</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-2 text-center">
              <p className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Onboarding The Good Place
              </p>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Selectionnez vos personnages de guilde
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Choisissez un ou plusieurs personnages. Nous allons synchroniser leur equipement et leurs statistiques.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mx-auto max-w-3xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => {
                const key = getCharacterKey(character.name, character.realm);
                const isSelected = selectedKeys.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelection(character)}
                    className={`relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-smooth-lg hover:-translate-y-1 hover:shadow-lg ${
                      isSelected
                        ? 'border-amber-500 ring-1 ring-amber-500/70'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <img
                        src={character.avatar || '/uploads/default-avatar.png'}
                        alt={`${character.name} avatar`}
                        className="h-14 w-14 rounded-full border border-border object-cover"
                        loading="lazy"
                      />
                      <div>
                        <p className="text-lg font-semibold leading-tight">{character.name}</p>
                        <p className="text-xs text-muted-foreground">{character.realm}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Classe:</span> {character.class}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Niveau:</span> {character.level}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-xl border border-border bg-card/80 p-4 text-center backdrop-blur">
              <p className="text-sm text-muted-foreground">
                {selectedCharacters.length} personnage(s) selectionne(s)
              </p>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedCharacters.length === 0 || isConfirming}
                size="lg"
                className="w-full cursor-pointer sm:w-auto"
              >
                {isConfirming ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Synchronisation en cours...
                  </span>
                ) : (
                  'Confirmer ma sélection et rejoindre le Hub'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCharacterKey(name: string, realm: string) {
  return `${name.trim().toLowerCase()}::${realm.trim().toLowerCase()}`;
}
