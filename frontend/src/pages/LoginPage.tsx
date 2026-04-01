import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');

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

    // Sauvegarder le nom du personnage en attente
    localStorage.setItem('pendingCharacter', characterName.trim());

    // Rediriger vers l'OAuth Battle.net
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/bnet`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          ← Retour à l&apos;accueil
        </Link>

        <Card className="w-full animate-fade-in-up shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl font-bold text-transparent">
              Guild Hub
            </CardTitle>
            <CardDescription className="mt-3 text-base">
              Connectez-vous pour acceder au hub de votre guilde World of Warcraft
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
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
  );
}
