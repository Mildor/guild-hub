import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Footer } from '@/components/layout/Footer';
import frenchRealms from '@/data/french-realms.json';
import { useGetBlizzardRealms } from '@/api/queries';

const FR_REALMS = frenchRealms;
const DEFAULT_REALM = 'Archimonde';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [characterName, setCharacterName] = useState('');
  const [realm, setRealm] = useState(DEFAULT_REALM);
  const [error, setError] = useState('');
  const { data: euRealms } = useGetBlizzardRealms();
  const reconnectReason = searchParams.get('reason');

  const allRealmNames = useMemo(() => {
    const realmNames = euRealms?.map((realmOption) => realmOption.name) ?? [];
    const frSet = new Set(FR_REALMS.map((name) => name.toLowerCase()));

    return [
      ...FR_REALMS,
      ...realmNames.filter((name) => !frSet.has(name.toLowerCase())),
    ];
  }, [euRealms]);

  const preferredFrenchRealms = FR_REALMS;

  const otherEuRealms = useMemo(() => {
    const frSet = new Set(preferredFrenchRealms.map((name) => name.toLowerCase()));
    return allRealmNames.filter((name) => !frSet.has(name.toLowerCase()));
  }, [allRealmNames, preferredFrenchRealms]);

  // Rediriger vers dashboard si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLoginClick = () => {
    // Vérifier que le champ n'est pas vide
    if (!characterName.trim()) {
      setError('Veuillez entrer le nom de votre personnage');
      return;
    }

    if (!realm.trim()) {
      setError('Veuillez entrer ou choisir un royaume');
      return;
    }

    // Sauvegarder le nom du personnage en attente
    localStorage.setItem('pendingCharacter', characterName.trim());
    localStorage.setItem('pendingRealm', realm.trim());

    // Rediriger vers l'OAuth Battle.net
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/bnet`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          ← Retour à l&apos;accueil
        </Link>

        {reconnectReason === 'session-expired' && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Votre session a expire. Reconnectez-vous via Battle.net pour continuer.
          </p>
        )}

        {reconnectReason === 'account-deleted' && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Votre compte a ete supprime definitivement.
          </p>
        )}

        <Card className="w-full animate-fade-in-up shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              The Good Place
            </CardTitle>
            <CardDescription className="mt-3 text-base">
              Connectez-vous pour acceder au hub de votre guilde World of Warcraft
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Royaume (EU)
              </label>
              <Input
                list="eu-realms"
                placeholder="Ex: Silvermoon"
                value={realm}
                onChange={(e) => {
                  setRealm(e.target.value);
                  setError('');
                }}
                className="w-full"
              />
              <datalist id="eu-realms">
                {preferredFrenchRealms.map((realmOption) => (
                  <option key={`fr-${realmOption}`} value={realmOption} />
                ))}
                {otherEuRealms.map((realmOption) => (
                  <option key={`eu-${realmOption}`} value={realmOption} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Les royaumes FR sont proposes en priorite, mais tous les royaumes EU sont acceptes.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nom de votre personnage WoW
              </label>
              <Input
                placeholder="Ex: Arthas"
                value={characterName}
                onChange={(e) => {
                  setCharacterName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLoginClick();
                  }
                }}
                className="w-full"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Utilisez votre compte Battle.net pour continuer
            </p>

            <Button
              onClick={handleLoginClick}
              size="lg"
              className="w-full cursor-pointer btn-glow transition-smooth-lg hover:scale-105 active:scale-95"
            >
              Se connecter avec Battle.net
            </Button>

            <p className="text-center text-xs text-muted-foreground opacity-60">
              Securise par Battle.net OAuth
            </p>
          </CardContent>
        </Card>
      </div>

      </div>

      <Footer />
    </div>
  );
}
