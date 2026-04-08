import { Link } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour a l'accueil
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Politique de confidentialite</h1>

        <div className="mt-8 space-y-6 rounded-xl border border-border/70 bg-card/40 p-6">
          <section>
            <h2 className="text-lg font-semibold">Responsable du traitement</h2>
            <p className="mt-2 text-muted-foreground">
              La guilde The Good Place, representee par Mildore.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Contact DPO</h2>
            <p className="mt-2 text-muted-foreground">Tarek.bern.pro@gmail.com</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Conservation des donnees</h2>
            <p className="mt-2 text-muted-foreground">
              Les donnees sont conservees tant que l'utilisateur possede un compte
              actif sur Guild Hub. En cas d'utilisation du bouton de suppression
              de compte ou de demande explicite, les donnees sont effacees
              definitivement et irreversiblement de nos serveurs de maniere
              immediate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Nature des donnees</h2>
            <p className="mt-2 text-muted-foreground">
              BattleTag, informations des personnages (ilvl, specialisation,
              classe), logs de presences aux evenements de la guilde.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
