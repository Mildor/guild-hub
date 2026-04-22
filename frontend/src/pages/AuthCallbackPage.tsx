import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import type { SharedAccountProfile, SharedProfile, User } from '@/types/auth';

interface SharedAccountConfigResponse {
  userId: string;
  isSharedAccount: boolean;
  profiles: SharedAccountProfile[];
}

export function AuthCallbackPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const setActiveSharedProfile = useAuthStore((s) => s.setActiveSharedProfile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [sharedProfiles, setSharedProfiles] = useState<SharedAccountProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SharedProfile | ''>('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const hydrateUser = async () => {
    const { data } = await api.get<User>('/auth/me');
    setUser(data);

    if (!data.isSharedAccount) {
      return { user: data, sharedConfig: null };
    }

    const { data: sharedConfig } = await api.get<SharedAccountConfigResponse>(
      '/users/me/shared-account',
    );

    return { user: data, sharedConfig };
  };

  const continueToApp = (user: User, profile?: SharedProfile) => {
    if (profile) {
      setActiveSharedProfile(profile);
    }

    if (user.appRole === 'GUEST') {
      navigate('/onboarding', { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const { user, sharedConfig } = await hydrateUser();

        if (
          user.isSharedAccount &&
          sharedConfig?.isSharedAccount &&
          sharedConfig.profiles.length > 0
        ) {
          const stored =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('gh_active_shared_profile')
              : null;
          const storedProfile = sharedConfig.profiles.find(
            (profile) => profile.code === stored,
          );
          const defaultProfile = storedProfile?.code ?? sharedConfig.profiles[0].code;

          setPendingUser(user);
          setSharedProfiles(sharedConfig.profiles);
          setSelectedProfile(defaultProfile);
          setIsLoading(false);
          return;
        }

        continueToApp(user);
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
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [setUser, logout, navigate, setActiveSharedProfile]);

  if (!error && pendingUser && sharedProfiles.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border/60 bg-card/50 p-6">
          <h1 className="text-xl font-semibold text-foreground">Choisir un profil</h1>
          <p className="text-sm text-muted-foreground">
            Ce compte est partage. Selectionnez le profil avec lequel vous voulez vous connecter.
          </p>
          <Select
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value as SharedProfile)}
          >
            {sharedProfiles.map((profile) => (
              <option key={profile.code} value={profile.code}>
                {profile.name}
              </option>
            ))}
          </Select>
          <Button
            className="w-full"
            onClick={() => {
              if (!selectedProfile) {
                return;
              }

              continueToApp(pendingUser, selectedProfile);
            }}
          >
            Continuer
          </Button>
        </div>
      </div>
    );
  }

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
              {isLoading ? 'Finalisation de connexion...' : 'Preparation...'}
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
