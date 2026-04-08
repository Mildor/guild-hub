#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📦 Resync Professions - Production Script"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "❌ Erreur: Fichier .env non trouvé dans $PROJECT_ROOT"
  echo "   Assurez-vous que le fichier .env est présent avec les variables Blizzard."
  exit 1
fi

# Execute the TypeScript script
cd "$PROJECT_ROOT"

echo "🔄 Lancement de la synchronisation des métiers..."
echo ""

npx ts-node --project tsconfig.json scripts/resync-professions.ts

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo ""
  echo "✅ Script terminé avec succès"
else
  echo ""
  echo "❌ Script terminé avec des erreurs (code: $exit_code)"
fi

exit $exit_code
