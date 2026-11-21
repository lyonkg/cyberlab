# User Prompts

## Initial request

Build a complete interactive cybersecurity learning platform. Requirements: (1) Cross-platform mobile or web app (React Native, Flutter, or web) covering core topics: network security, encryption, common attacks (phishing, malware, DDoS, MITM, SQL injection), defense basics, and hands-on labs. (2) Visual, interactive content: network diagrams, packet flow animations, attack simulations showing results live, and quizzes with immediate feedback. (3) Demo/simulated environments so labs run without paid API keys or real infrastructure; easy switch to real tools later. (4) Deliver full source code in a workspace folder with a README explaining how to build, run, and a separate PROMPTS.md with the user's requests word for word. (5) Work autonomously: scaffold, code, test, and iterate until the platform is functional and usable.

## Second request — Nov 9, 2026

The user re-sent the same request word for word on November 9, 2026 (treated as "keep iterating"):

Build a complete interactive cybersecurity learning platform. Requirements: (1) Cross-platform mobile or web app (React Native, Flutter, or web) covering core topics: network security, encryption, common attacks (phishing, malware, DDoS, MITM, SQL injection), defense basics, and hands-on labs. (2) Visual, interactive content: network diagrams, packet flow animations, attack simulations showing results live, and quizzes with immediate feedback. (3) Demo/simulated environments so labs run without paid API keys or real infrastructure; easy switch to real tools later. (4) Deliver full source code in a workspace folder with a README explaining how to build, run, and a separate PROMPTS.md with the user's requests word for word. (5) Work autonomously: scaffold, code, test, and iterate until the platform is functional and usable.

## Third request — Nov 12, 2026

Extend the SQL injection lab simulator so it also covers UNION-based attacks, not just login-query condition checks. Add a UNION attack scenario where the user can try payloads like ' UNION SELECT null, username, password FROM users -- and see realistic results: column count mismatches should error, correct column counts should leak data. Explain why the number of columns must match and how ORDER BY can be used to probe it. Keep the existing accurate SQL evaluation rules (AND before OR, comment syntax). Add tests for the new UNION scenarios and make sure all existing tests still pass. Update README.md and PROMPTS.md accordingly, and send the updated build when done.

---

Harden the CyberLab cybersecurity application codebase before any public publication. Scan for hardcoded secrets and externalize them; add input validation/sanitization on user-facing inputs (preserve the SQLi teaching lab's vulnerable vs parameterized behavior, but keep it inside the in-memory simulation); review XSS, CSRF, and IDOR; add a strict CSP compatible with the Vite build; run npm audit (fix non-breaking issues only); do not publish or push to any remote.

## Fourth request — Nov 17, 2026

Dernier état connu : CyberLab est livré avec 8 modules, 58 tests verts, le lab SQL avec scénario UNION, démo d'encryption PBKDF2, chargement rapide et liens directs. Limites restantes signalées par toi-même : le simulateur SQL ne gère ni les jointures (JOINs), ni les sous-requêtes, ni les fonctions ; le mode outils réels (VITE_LAB_MODE) est encore un placeholder ; et le fichier de code principal reste assez volumineux. Prends ces trois points comme tâches. Priorité 1 : étendre le simulateur SQL pour couvrir les jointures et les sous-requêtes avec des scénarios de lab réalistes, des leçons et des quiz, en gardant les règles SQL exactes existantes (AND avant OR, syntaxe des commentaires) et le mode paramétré qui bloque tout. Priorité 2 : remplacer le placeholder du mode outils réels par un vrai branchement vers des outils concrets (par exemple des appels réseau simulés côté navigateur pour ping, traceroute, ou un mini-serveur local documenté), avec un réglage clair pour basculer. Priorité 3 : découper le gros fichier principal en modules plus petits sans casser l'app. Ajoute les tests pour chaque ajout, mets à jour README.md et PROMPTS.md, et livre le build mis à jour avec le zip. Itère jusqu'à ce que tous les tests passent.

## Fifth request — Nov 17, 2026

L'utilisateur veut un lien pour Mac une fois le projet terminé. Livre CyberLab aussi sous forme accessible sur Mac : assure-toi que le build web fonctionne bien sur Safari macOS (y compris les animations et le mode plein écran), et publie un lien Mac dédié sur GitHub Releases (par exemple une page GitHub Pages ou un zip du build optimisé pour Mac). Mentionne les éventuelles limites macOS dans le README. Fais-le après avoir fini tes trois priorités en cours.
