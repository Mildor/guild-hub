#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_FILE="$SCRIPT_DIR/resync-professions.log"

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

# Check if compiled script exists
if [ ! -f "$BACKEND_DIR/dist/scripts/resync-professions.js" ]; then
  log "⚠️  Script compilé non trouvé. Compilation en cours..."
  cd "$BACKEND_DIR"
  if ! npm run build 2>&1 | tee -a "$LOG_FILE"; then
    log "❌ Erreur: La compilation a échoué"
    exit 1
  fi
  log "✅ Compilation réussie"
fi

# Execute the compiled script
cd "$BACKEND_DIR"

log "🔄 Lancement de la synchronisation des métiers..."
log "=================================================="

if node dist/scripts/resync-professions.js 2>&1 | tee -a "$LOG_FILE"; then
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
