import { AppRole } from "@/types/auth";

export const GUILD_REALM = "archimonde";
export const GUILD_NAME = "The Good Place";

export const availableRoles: AppRole[] = [
    AppRole.ADMIN,
    AppRole.OFFICER,
    AppRole.MEMBER,
    AppRole.GUEST,
];

export const gameRoles = ["TANK", "HEALER", "DPS"] as const;

export function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatDateTime(value: string) {
    const date = new Date(value);
    return `${date.toLocaleDateString("fr-FR")} ${date.toLocaleTimeString(
        "fr-FR",
        {
            hour: "2-digit",
            minute: "2-digit",
        },
    )}`;
}

export function toLocalDateTimeInput(value: string) {
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export function toIsoFromLocalInput(value: string) {
    return new Date(value).toISOString();
}

export function formatFailedLoginReason(reason: string): string {
    const normalized = reason.trim().toLowerCase();

    const knownReasons: Record<string, string> = {
        access_denied: "Acces refuse par l'utilisateur sur Battle.net",
        invalid_request: "Requete OAuth invalide",
        unauthorized_client: "Client OAuth non autorise",
        invalid_scope: "Scope OAuth invalide",
        server_error: "Erreur temporaire du fournisseur OAuth",
        temporarily_unavailable: "Service OAuth temporairement indisponible",
        oauth_error_access_denied: "Acces refuse pendant le callback OAuth",
        oauth_error_invalid_request: "Callback OAuth invalide",
        oauth_error_unauthorized_client:
            "Client OAuth non autorise au callback",
        oauth_error_invalid_scope: "Scope OAuth invalide au callback",
        oauth_error_server_error: "Erreur serveur OAuth pendant le callback",
        oauth_error_temporarily_unavailable:
            "Fournisseur OAuth temporairement indisponible pendant le callback",
        oauth_state_mismatch:
            "Etat OAuth invalide ou session expiree (state mismatch)",
        oauth_callback_failed_without_error_context:
            "Echec OAuth sans detail renvoye par Battle.net",
        unknown_oauth_failure:
            "Echec OAuth non detaille (Battle.net n'a fourni aucun contexte)",
    };

    if (knownReasons[normalized]) {
        return knownReasons[normalized];
    }

    if (normalized.startsWith("oauth_callback_error:")) {
        const detail = reason.slice("oauth_callback_error:".length).trim();
        return detail
            ? `Erreur OAuth au callback: ${detail}`
            : "Erreur OAuth au callback";
    }

    if (normalized.startsWith("oauth_callback_info:")) {
        const detail = reason.slice("oauth_callback_info:".length).trim();
        return detail ? `Rejet OAuth: ${detail}` : "Rejet OAuth sans detail";
    }

    return reason;
}
