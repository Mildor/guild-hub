/**
 * Décode et vérifie si le JWT est encore valide
 */
export function isJwtValid(token: string | null): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Décode le payload (partie 2)
    const payload = JSON.parse(atob(parts[1]));

    // Vérifie l'expiration (exp est en secondes)
    const expiresAt = payload.exp * 1000; // Convertir en millisecondes
    const now = Date.now();

    return expiresAt > now;
  } catch (error) {
    console.error('Erreur lors de la vérification du JWT:', error);
    return false;
  }
}

/**
 * Décode le JWT et retourne le payload
 */
export function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Erreur lors du décodage du JWT:', error);
    return null;
  }
}
