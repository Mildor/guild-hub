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
    return data;
  };

  useEffect(() => {
    const run = async () => {
      try {
        const me = await hydrateUserAndProceed();

        if (me.appRole === 'GUEST') {
          navigate('/onboarding', { replace: true });
        } else {
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

        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    void run();
  }, [setUser, logout, navigate]);

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
              Finalisation de connexion...
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
