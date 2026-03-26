import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    window.location.href = 'http://localhost:3000/auth/bnet';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md animate-fade-in-up shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Guild Hub
          </CardTitle>
          <CardDescription className="text-base mt-3">
            Connectez-vous pour accéder au hub de votre guilde World of Warcraft
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

          <p className="text-sm text-muted-foreground text-center">
            Utilisez votre compte Battle.net pour continuer
          </p>

          <Button
            onClick={handleLoginClick}
            size="lg"
            className="w-full btn-glow hover:scale-105 active:scale-95 transition-smooth-lg cursor-pointer"
          >
            Se connecter avec Battle.net
          </Button>

          <p className="text-xs text-muted-foreground text-center opacity-60">
            Sécurisé par Battle.net OAuth
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
