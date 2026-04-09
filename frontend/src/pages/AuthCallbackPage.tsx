import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import type { User } from '@/types/auth';

export function AuthCallbackPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  const hydrateUserAndProceed = async () => {
    const { data } = await api.get<User>('/auth/me');
    setUser(data);
  };

  useEffect(() => {
    const pendingCharacter = localStorage.getItem('pendingCharacter');
    const pendingRealm = localStorage.getItem('pendingRealm') || 'Archimonde';

    const run = async () => {
      try {
        if (pendingCharacter) {
          // Appeler la route verify-guild
          await verifyGuildAndProceed(pendingCharacter, pendingRealm);
        } else {
          await hydrateUserAndProceed();
          // Pas de character en attente, rediriger vers dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        const errorData = err.response?.data;
        let errorMessage = 'Erreur lors de l\'authentification. Veuillez reessayer.';

        if (errorData?.message) {
          errorMessage = errorData.message;
        }

        setError(errorMessage);
        await logout();
        localStorage.removeItem('pendingCharacter');
        localStorage.removeItem('pendingRealm');

        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    void run();
  }, [setUser, logout, navigate]);

  const verifyGuildAndProceed = async (characterName: string, realm: string) => {
    try {
      await api.post('/auth/verify-guild', { characterName, realm });
      await hydrateUserAndProceed();

      // Supprimer pendingCharacter du localStorage
      localStorage.removeItem('pendingCharacter');
      localStorage.removeItem('pendingRealm');

      // Rediriger vers dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const errorData = err.response?.data;
      let errorMessage = 'Erreur lors de la vérification de la guilde. Veuillez réessayer.';

      if (errorData?.message) {
        errorMessage = errorData.message;
      }

      setError(errorMessage);

      // Nettoyer la session locale
      await logout();
      localStorage.removeItem('pendingCharacter');
      localStorage.removeItem('pendingRealm');

      // Rediriger vers login après 3 secondes
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {error ? (
        <div className="max-w-md w-full animate-fade-in-up">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground text-center mt-4 opacity-60">
            Redirection vers la page de connexion...
          </p>
        </div>
      ) : (
        <div className="text-center animate-fade-in-up">
          {/* Premium Spinner */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-16 h-16">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"></div>
              {/* Middle ring - slower */}
              <div
                className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary/60 animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '3s' }}
              ></div>
              {/* Inner circle */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-r from-primary/20 to-primary/5"></div>
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold mb-2 animate-pulse">
              Vérification de guilde en cours...
            </p>
            <p className="text-sm text-muted-foreground">
              Authentification sécurisée
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
