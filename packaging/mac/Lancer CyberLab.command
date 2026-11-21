#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Lancer CyberLab (macOS) — double-cliquez ce fichier dans le Finder.
#  Démarre un mini-serveur web LOCAL (127.0.0.1 uniquement) dans le dossier
#  « app » puis ouvre Safari. Fermez cette fenêtre (ou Ctrl+C) pour arrêter.
# ─────────────────────────────────────────────────────────────────────────────
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/app" || { echo "Dossier « app » introuvable à côté de ce fichier."; read -r -p "Entrée pour fermer…"; exit 1; }

if ! /usr/bin/env python3 -c 'import http.server' >/dev/null 2>&1; then
  osascript -e 'display alert "Python 3 est requis" message "Installez les outils de développement Apple : ouvrez Terminal et tapez  xcode-select --install  puis relancez CyberLab."' >/dev/null 2>&1
  echo "Python 3 introuvable. Installez-le avec : xcode-select --install"
  read -r -p "Entrée pour fermer…"
  exit 1
fi

# Premier port libre à partir de 8765.
PORT=8765
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done
URL="http://127.0.0.1:${PORT}/"

echo ""
echo "  CyberLab tourne sur  ${URL}"
echo "  (serveur local uniquement — fermez cette fenêtre ou Ctrl+C pour l'arrêter)"
echo ""

# Ouvre Safari dès que le serveur répond (sinon le navigateur par défaut).
(
  for _ in $(seq 1 50); do
    curl -fsS -o /dev/null "$URL" 2>/dev/null && break
    sleep 0.1
  done
  open -a Safari "$URL" 2>/dev/null || open "$URL"
) &

exec /usr/bin/env python3 -m http.server "$PORT" --bind 127.0.0.1
