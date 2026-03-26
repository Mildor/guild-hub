import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [searchParams, setToken, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center animate-fade-in-up">
        {/* Premium Spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-16 h-16">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin"></div>
            {/* Middle ring - slower */}
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
            {/* Inner circle */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-primary/20 to-primary/5"></div>
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold mb-2 animate-pulse">Authentification en cours...</p>
          <p className="text-sm text-muted-foreground">Redirection vers le Guild Hub</p>
        </div>
      </div>
    </div>
  );
}
