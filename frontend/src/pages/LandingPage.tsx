import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <p className="text-lg font-semibold tracking-wide text-primary">{'<The Good Place>'}</p>
          <Link
            to="/login"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Espace Membre
          </Link>
        </div>
      </header>

      <main>
        <section className="flex flex-col items-center px-4 py-32 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            Jouer ensemble, tout simplement.
          </p>
          <h1 className="mt-5 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl lg:text-7xl">
            Bienvenue dans The Good Place
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            Nous ne sommes pas une usine à progress, mais un espace de jeu partagé. L&apos;IRL passera
            toujours avant tout. Rejoignez une véritable communauté où le tag de guilde a du sens,
            pour tomber des boss ou faire des clés sans prise de tête.
          </p>
          <Link
            to="/login"
            className="mt-10 rounded-md bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Accéder au Guild Hub
          </Link>
        </section>

        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-16 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/50 p-8">
            <h2 className="text-2xl font-semibold text-primary">Raids : Mercredi &amp; Lundi</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Parcourir le mode Héroïque à notre rythme. Sérieux pendant les combats, mais toujours
              détendus. Un wipe est une leçon : on ajuste, on discute calmement, et on y retourne.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-8">
            <h2 className="text-2xl font-semibold text-primary">Donjons Mythiques+</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Fini la loterie et le stress du PU ! On monte nos clés entre nous pour équiper les
              personnages de chacun, sans la pression d&apos;un chronomètre toxique.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-8">
            <h2 className="text-2xl font-semibold text-primary">Respect &amp; Entraide</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Venir en raid avec ses consos et avoir lu les strats, ce n&apos;est pas du tryhard, c&apos;est
              respecter le temps de jeu des copains. La vraie vie avant tout, WoW doit rester une
              soupape de décompression.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl border-t border-border/50 px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-primary">Nous recrutons des joueurs, pas des classes.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Que vous soyez Tank, Heal ou DPS, si notre approche résonne avec vous, il y a une place
            chez nous.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <span className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-medium text-primary">
              Discord: @Hildï
            </span>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-medium text-primary">
              Bnet: Jisersouwb#2112
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 The Good Place. World of Warcraft Guild.
      </footer>
    </div>
  );
}
