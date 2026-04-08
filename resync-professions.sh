#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_FILE="$SCRIPT_DIR/resync-professions.log"
COMPILED_SCRIPT="$BACKEND_DIR/dist/scripts/resync-professions.js"
ALT_COMPILED_SCRIPT="$BACKEND_DIR/dist/src/scripts/resync-professions.js"

echo "📦 Resync Professions - Production Script"
echo "=========================================="
echo ""
echo "🕐 Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
  log "❌ Erreur: Dossier backend non trouvé à $BACKEND_DIR"
  exit 1
fi

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
  log "❌ Erreur: Fichier .env non trouvé dans $BACKEND_DIR"
  log "   Assurez-vous que le fichier .env est présent avec:"
  log "   - DATABASE_URL"
  log "   - BLIZZARD_CLIENT_ID"
  log "   - BLIZZARD_CLIENT_SECRET"
  exit 1
fi

# Ensure the compiled script exists
if [ ! -f "$COMPILED_SCRIPT" ] && [ -f "$ALT_COMPILED_SCRIPT" ]; then
  COMPILED_SCRIPT="$ALT_COMPILED_SCRIPT"
fi

if [ ! -f "$COMPILED_SCRIPT" ]; then
  log "⚠️  Script compilé non trouvé. Compilation du backend en cours..."
  cd "$BACKEND_DIR"
  if command -v pnpm >/dev/null 2>&1; then
    if ! pnpm run build 2>&1 | tee -a "$LOG_FILE"; then
      log "❌ Erreur: La compilation a échoué"
      exit 1
    fi
  else
    if ! npm run build 2>&1 | tee -a "$LOG_FILE"; then
      log "❌ Erreur: La compilation a échoué"
      exit 1
    fi
  fi

  if [ -f "$COMPILED_SCRIPT" ]; then
    log "✅ Compilation réussie"
  elif [ -f "$ALT_COMPILED_SCRIPT" ]; then
    COMPILED_SCRIPT="$ALT_COMPILED_SCRIPT"
    log "✅ Compilation réussie"
  else
    log "❌ Erreur: le script compilé est introuvable après build"
    log "   Chemins attendus:"
    log "   - $BACKEND_DIR/dist/scripts/resync-professions.js"
    log "   - $BACKEND_DIR/dist/src/scripts/resync-professions.js"
    exit 1
  fi
fi

# Execute the compiled script
cd "$BACKEND_DIR"

log "🔄 Lancement de la synchronisation des métiers..."
log "=================================================="

if node "$COMPILED_SCRIPT" 2>&1 | tee -a "$LOG_FILE"; then
  exit_code=0
  log ""
  log "✅ Synchronisation terminée avec succès"
else
  exit_code=$?
  log ""
  log "❌ Synchronisation terminée avec des erreurs (code: $exit_code)"
fi

log ""
log "📋 Log complet disponible dans: $LOG_FILE"

exit $exit_code
