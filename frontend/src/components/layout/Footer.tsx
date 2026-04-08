import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/20 px-4 py-4 text-center text-xs text-muted-foreground">
      <p>
        Data provided by Blizzard Entertainment. World of Warcraft and Blizzard
        Entertainment are trademarks or registered trademarks of Blizzard
        Entertainment, Inc. in the U.S. and/or other countries.
      </p>
      <p className="mt-2">
        <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-foreground">
          Politique de confidentialite
        </Link>
      </p>
    </footer>
  );
}
