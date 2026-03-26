import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

export function DashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 animate-slide-in-right">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 animate-glow-pulse"></div>
            <h1 className="text-2xl font-bold">Guild Hub</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="btn-glow transition-smooth hover:border-primary/50 active:scale-95 cursor-pointer"
          >
            Se déconnecter
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl animate-fade-in-up">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Bienvenue sur le Guild Hub
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Vous êtes maintenant connecté à votre guilde World of Warcraft.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Membres', value: 'N/A' },
              { label: 'Raids', value: 'N/A' },
              { label: 'Événements', value: 'N/A' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-smooth hover:bg-card/80 cursor-pointer"
                style={{
                  animation: `fade-in-up 0.5s ease-out ${idx * 0.1}s both`,
                }}
              >
                <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground italic">
            Plus de fonctionnalités à venir...
          </p>
        </div>
      </main>
    </div>
  );
}
