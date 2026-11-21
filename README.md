# CyberLab

Plateforme interactive d’apprentissage de la cybersécurité : leçons, simulations en direct et quiz, le tout dans le navigateur. Aucune clé d’API payante ni infrastructure réelle n’est nécessaire.

**Interface entièrement en français** (depuis la v1.1.0). Le code, les requêtes SQL, les payloads et les termes techniques usuels (hash, salt, IV, UNION, JOIN, TLS…) restent en anglais.

**Stack :** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Vitest · Recharts · icônes Lucide

Installable en option comme PWA légère (`public/manifest.webmanifest`).

## Liens en ligne

- **Application web (GitHub Pages, compatible Safari) :** https://lyonkg.github.io/cyberlab/
- **Téléchargement Mac (dernière release) :** https://github.com/lyonkg/cyberlab/releases/latest/download/cyberlab-mac.zip
- **Release v1.1.0 (interface en français) :** https://github.com/lyonkg/cyberlab/releases/tag/v1.1.0
- **Release v1.0.0 :** https://github.com/lyonkg/cyberlab/releases/tag/v1.0.0
- **Code source :** https://github.com/lyonkg/cyberlab

## Fonctionnalités

### Modules
| Module | Leçons | Labs interactifs |
|--------|--------|------------------|
| **Sécurité réseau** | Couches, pare-feu | Schéma de topologie, lab de règles de pare-feu, animation du flux de paquets, handshake TCP |
| **Chiffrement et hachage** | Symétrique/asymétrique, dérivation de clé, hachage | Atelier César/Vigenère, AES-256-GCM avec clé dérivée par PBKDF2 (Web Crypto ; affiche salt, IV, itérations), hachage + salage |
| **Attaques de phishing** | Ingénierie sociale | Lab « repérez le phishing » sur des e-mails |
| **Malware et propagation** | Vers et confinement | Propagation d’une infection sur un graphe réseau |
| **Attaques DDoS** | Attaques sur la disponibilité | Graphique de requêtes/s en direct avec limitation de débit / CDN |
| **Homme du milieu (MITM)** | HTTP contre HTTPS | Animation Alice / Bob / Mallory |
| **Injection SQL** | Concaténation contre paramètres, priorité des opérateurs, UNION, JOIN, sous-requêtes, fonctions | Labs connexion · recherche UNION · suivi de commande JOIN · aveugle booléen/EXISTS ; interrupteur « requêtes paramétrées » sur chacun |
| **Bases de la défense** | MFA, correctifs, moindre privilège | Testeur de robustesse de mot de passe, check-list de défense en profondeur |

### Transversal
- Quiz avec correction immédiate et explications
- Suivi de la progression dans `localStorage`
- Interface de fournisseur de labs : `simulated` (par défaut) ↔ `real` (API locale), via `VITE_LAB_MODE` ou la page **Outils**

## Prérequis

- Node.js 20+ (18+ peut fonctionner)
- npm 10+

## Installation

```bash
cd cyberlab
npm install
```

## Lancer (développement)

```bash
npm run dev
```

Ouvrez l’URL affichée par Vite (en général `http://localhost:5173`).

## Compiler

```bash
npm run build
```

Le résultat est dans `dist/`. Les routes et chaque lab sont chargés à la demande : la première page ne télécharge que le point d’entrée et les chunks React (~95 Ko gzip). Recharts (`charts-*.js`) ne se charge qu’à l’ouverture du lab DDoS.

```bash
VITE_BASE=/cyberlab/ npm run build   # build sous un sous-chemin (site de projet GitHub Pages)
npm run build:mac                    # paquet macOS → release/cyberlab-mac.zip (voir « macOS / Safari »)
```

## Prévisualiser le build de production

```bash
npm run preview
```

## Tests

```bash
npm test
```

Les tests unitaires (Vitest) couvrent les helpers de plein écran (API standard + préfixée WebKit) et le bouton, le choix du routeur/de la base, les chiffrements classiques, le pare-feu, le moteur SQL (WHERE, UNION, ORDER BY, LIKE, JOIN, sous-requêtes, fonctions), les simulateurs connexion/recherche/JOIN/aveugle, AES-GCM + PBKDF2, les fournisseurs et le changement de mode, la notation des quiz, la robustesse des mots de passe et la validation des saisies. Les validateurs du serveur se testent avec `npm run server:test` (node:test).

## Lab d’injection SQL : fonctionnement du simulateur

En mode vulnérable, la connexion construit `SELECT * FROM users WHERE username = '<u>' AND password = '<p>'` par concaténation de chaînes et l’exécute dans un petit moteur SQL (`src/lib/sqli.ts`) qui respecte les vraies règles SQL :

- `--` ouvre un commentaire (hors des chaînes littérales) ; `''` est une apostrophe échappée
- la priorité est `NOT` > `AND` > `OR` ; les parenthèses fonctionnent
- une apostrophe non fermée est une erreur de syntaxe ; les requêtes empilées (`; DROP …`) sont refusées

| Nom d’utilisateur | Mot de passe | Résultat en mode vulnérable |
|-------------------|--------------|-----------------------------|
| `' OR 1=1 --` | n’importe quoi | Contournement — renvoie tous les utilisateurs |
| `admin' --` | n’importe quoi | Contournement — connexion en tant qu’admin |
| `' OR '1'='1` | `x` | **Échec** — se lit `username='' OR ('1'='1' AND password='x')` |
| `' OR '1'='1` | `' OR '1'='1` | Contournement — la tautologie est dans les deux champs |
| `'` | n’importe quoi | Erreur de syntaxe (montre pourquoi la fuite d’erreurs est dangereuse) |

Le mode paramétré lie les deux saisies comme des valeurs : tous les payloads ci-dessus échouent.

Les erreurs brutes du moteur simulé (par ex. `SELECTs to the left and right of UNION do not have the same number of result columns`) restent volontairement en anglais, comme dans un vrai SGBD ; l’interface ajoute à côté une explication en français.

### Lab d’attaque UNION (recherche de produits)

Un deuxième scénario interroge une table **products** de forme fixe à **3 colonnes** (`id, title, body`) :

```sql
SELECT id, title, body FROM products WHERE title LIKE '%{input}%'
```

Le même moteur SQL gère aussi `UNION [ALL] SELECT`, `ORDER BY n` et `LIKE`. Des payloads en un clic sondent le nombre de colonnes et font fuiter la table `users` dans la grille de résultats.

| Saisie de recherche | Résultat en mode vulnérable |
|---------------------|-----------------------------|
| `Patch` | Résultat normal — « Patch Tuesday » |
| `' ORDER BY 1 --` … `' ORDER BY 3 --` | OK (la sonde réussit) |
| `' ORDER BY 4 --` | Erreur : `ORDER BY position 4 is out of range` |
| `' UNION SELECT username, password FROM users --` | Erreur : 3 colonnes contre 2 |
| `' UNION SELECT null, null, null, null FROM users --` | Erreur : 3 colonnes contre 4 |
| `' UNION SELECT null, username, password FROM users --` | **Fuite** — les noms d’utilisateur apparaissent sous `title`, les mots de passe sous `body` (lignes surlignées) |
| (n’importe lequel, mode sûr) | `LIKE ?` lié — ni UNION, ni ORDER BY, ni fuite |

**Limites actuelles du moteur :** SELECT / WHERE / LIKE / IN / EXISTS / sous-requêtes scalaires / INNER|LEFT JOIN … ON / alias / UNION [ALL] / ORDER BY / fonctions (`COUNT`, `LOWER`, `UPPER`, `LENGTH`, `SUBSTR`, `CONCAT`/`||`, `ASCII`). Pas de RIGHT/FULL JOIN, pas de GROUP BY au-delà d’un SELECT à agrégat unique, pas de LIMIT/OFFSET, pas de fonctions de fenêtrage, pas de DDL/DML, pas de requêtes empilées. Tables : `products` (3), `users` (4), `orders` (5), `api_keys` (3, cachée).

### Lab de suivi de commande (JOIN)

```sql
SELECT o.id, o.item, u.username, o.ship_to
FROM orders o INNER JOIN users u ON o.user_id = u.id
WHERE o.id = '{input}'
```

| Saisie | Résultat en mode vulnérable |
|--------|-----------------------------|
| `1001` | Uniquement la commande d’Alice |
| `' OR 1=1 --` | Les commandes et adresses de livraison de tous les clients (surlignées) |
| `' UNION SELECT null, username, password, role FROM users --` | UNION sur la forme à 4 colonnes du JOIN |
| (n’importe laquelle, mode sûr) | `o.id = ?` lié — aucune fuite |

### Lab booléen à l’aveugle / sous-requêtes

Même page de recherche de produits ; les payloads posent des questions fermées (oui/non) :

| Saisie | Oracle |
|--------|--------|
| `' AND (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='s' --` | VRAI (des lignes) |
| `…='x' --` | FAUX (0 ligne) |
| `' AND EXISTS(SELECT 1 FROM api_keys) --` | VRAI |
| `' AND EXISTS(SELECT 1 FROM secrets) --` | Erreur `no such table` |

## Mode outils réels (API de lab locale)

```bash
npm run server          # http://127.0.0.1:8787  (boucle locale uniquement)
npm run dev             # interface Vite
# ou les deux :
npm run dev:all
```

Définissez `VITE_LAB_MODE=real` et `VITE_LAB_API_URL=http://127.0.0.1:8787`, ou utilisez l’interrupteur de la page **Outils** de l’application (mémorisé dans `localStorage`, prioritaire sur la valeur d’environnement). Points d’accès : `/health`, `/ping`, `/traceroute`, `/dns`, `/headers`, `/port`.

**Sécurité :** l’API n’écoute que sur `127.0.0.1`, limite à 30 requêtes/min, valide les hôtes avec une liste blanche stricte nom d’hôte/IPv4 (aucun métacaractère shell) et appelle toujours les binaires système via `execFile` avec un tableau d’arguments (jamais une chaîne shell). Ping/traceroute ICMP se replient sur une sonde de connexion TCP `:443` quand les binaires manquent ou que l’ICMP est bloqué — fréquent dans les conteneurs. La capture de paquets reste simulée (nécessite root/pcap). Côté interface, la liste blanche accepte `http://` en boucle locale et toute base `https://` sans identifiants (`src/lib/validation.ts`). Les messages d’erreur de l’API sont en français.

## Lab AES : dérivation de clé

`src/lib/aes.ts` dérive une clé AES-GCM de 256 bits depuis la phrase secrète avec PBKDF2-HMAC-SHA-256 (600 000 itérations, salt aléatoire de 16 octets) et utilise un IV aléatoire de 12 octets neuf à chaque chiffrement. Le blob stocké vaut `base64(salt ‖ IV ‖ ciphertext+tag)` ; l’interface affiche le salt, l’IV, le nombre d’itérations et la durée. Une mauvaise phrase secrète ou un bit modifié fait échouer l’authentification GCM.

## Mode des labs : simulé → outils réels

Par défaut (`.env`) :

```
VITE_LAB_MODE=simulated
```

Tous les labs utilisent alors `src/labs/providers/simulated`. L’adaptateur `real` (`src/labs/providers/real/index.ts`) appelle l’API locale décrite plus haut. Pour l’activer :

1. Copiez `.env.example` → `.env` et mettez `VITE_LAB_MODE=real`
2. Si besoin, réglez `VITE_LAB_API_URL` sur une URL `http://127.0.0.1…` / `localhost`, une URL `https://` ou un chemin de même origine (sans identifiants)
3. Toute URL passe par `resolveLabApiUrl()`, si bien qu’aucun hôte arbitraire ne peut être appelé
4. L’interface pédagogique reste identique — seul le fournisseur change

Voir `src/labs/providers/types.ts` pour l’interface `LabProvider`.

## Déploiement

N’importe quel hébergeur statique convient après `npm run build` : publiez `dist/`.

CyberLab est une application monopage avec des routes côté client (`/modules/sqli`, `/progress`, …). L’hébergeur doit servir `index.html` pour les chemins inconnus, sinon les liens directs et les rechargements renvoient une 404. Les solutions de repli sont déjà incluses :

| Hébergeur | Fichier | Rôle |
|-----------|---------|------|
| Netlify / Cloudflare Pages | `public/_redirects` → `dist/_redirects` | `/*  /index.html  200` |
| Vercel | `vercel.json` | réécrit tous les chemins vers `/index.html` |
| GitHub Pages | `dist/404.html` (copié depuis `index.html` par un petit plugin de `vite.config.ts`) | sert l’application pour tout chemin inconnu |
| nginx | — | ajoutez `try_files $uri /index.html;` |
| S3 + CloudFront | — | document d’erreur / réponses 403 et 404 personnalisées vers `/index.html` avec le statut 200 |

### Sous-chemin et routeur (variables au moment du build)

| Variable | Défaut | Effet |
|----------|--------|-------|
| `VITE_BASE` | `/` | Chemin public de base. `VITE_BASE=/cyberlab/ npm run build` pour un site de projet GitHub Pages (`vite build --base /cyberlab/` fonctionne aussi). Le `basename` du routeur suit automatiquement (`import.meta.env.BASE_URL`). |
| `VITE_BASE=./` | — | Build relocalisable : toutes les URL de ressources sont relatives et l’application passe automatiquement en `HashRouter` (`index.html#/modules/sqli`) ; elle fonctionne depuis n’importe quel dossier, sans règle de réécriture. Utilisé par le zip Mac. |
| `VITE_ROUTER=hash` | browser | Force `HashRouter` quelle que soit la base. |

Prévisualiser un build sous sous-chemin exactement comme il sera servi :

```bash
VITE_BASE=/cyberlab/ npm run build
VITE_BASE=/cyberlab/ npx vite preview     # → http://localhost:4173/cyberlab/
```

Le manifeste PWA utilise des `start_url`/`scope`/icônes relatifs : il reste correct quelle que soit la base.

### GitHub Pages (en ligne sur https://lyonkg.github.io/cyberlab/)

`.github/workflows/pages.yml` lance les tests, compile avec `VITE_BASE=/<nom-du-dépôt>/` et déploie sur Pages à chaque push sur `main`. Réglage unique par le propriétaire du dépôt : **Settings → Pages → Source : GitHub Actions**. Avec les offres GitHub gratuites, Pages ne fonctionne que pour les dépôts **publics**. Le site est alors sur `https://<owner>.github.io/<repo>/` (pour un site utilisateur `<owner>.github.io` ou un domaine personnalisé, remplacez `VITE_BASE` par `/` dans le workflow).

### Release GitHub avec le zip Mac

`.github/workflows/release.yml` compile `cyberlab-mac.zip` et le joint à une Release à chaque push d’un tag `v*` (ou manuellement via *Actions → Release (macOS zip) → Run workflow*) :

```bash
git tag v1.1.0 && git push origin v1.1.0
```

Alternative manuelle avec la CLI GitHub (depuis une machine connectée avec `gh auth login`) :

```bash
npm run build:mac                                   # → release/cyberlab-mac.zip
gh release create v1.1.0 release/cyberlab-mac.zip \
  --title "CyberLab v1.1.0" \
  --notes "Mac : décompressez puis double-cliquez « Lancer CyberLab.command ». En ligne : https://<owner>.github.io/<repo>/"
# builds suivants : gh release upload v1.1.0 release/cyberlab-mac.zip --clobber
```

Lien de téléchargement direct après publication : `https://github.com/<owner>/<repo>/releases/latest/download/cyberlab-mac.zip`.

## macOS / Safari

CyberLab est testé avec **WebKit 27.2 et le profil *Desktop Safari* de Playwright** (`npm run smoke:webkit`, voir plus bas). Le test de fumée couvre les quatre routes principales, les 8 modules, les 17 labs et les quiz, les animations (flux de paquets, MITM, propagation du malware, graphique DDoS), le chiffrement/déchiffrement AES-256-GCM + PBKDF2 avec Web Crypto (et le rejet d’une mauvaise clé), la persistance dans localStorage, le rechargement d’un lien direct, la navigation par l’en-tête et les deux boutons de plein écran. Il vérifie aussi qu’aucun mot anglais courant ne subsiste dans le texte visible (hors code). Il passe à la racine (`/`), sous `/cyberlab/` et depuis le zip Mac servi par `python3 -m http.server`.

### Trois façons de l’utiliser sur Mac

1. **En ligne :** ouvrez https://lyonkg.github.io/cyberlab/ dans Safari.
2. **Ajouter au Dock (Safari 17+, macOS Sonoma+) :** site ouvert, choisissez **Fichier → Ajouter au Dock…**. CyberLab s’ouvre alors dans sa propre fenêtre, avec son icône (`apple-touch-icon.png`, balises `apple-mobile-web-app-*` et manifeste `display: standalone` inclus). Sur iPhone/iPad : **Partager → Sur l’écran d’accueil**.
3. **Zip hors ligne, `cyberlab-mac.zip`** ([téléchargement](https://github.com/lyonkg/cyberlab/releases/latest/download/cyberlab-mac.zip) depuis la Release GitHub, ou compilez-le avec `npm run build:mac`) :
   ```
   CyberLab-Mac/
   ├── Lancer CyberLab.command   # double-clic : lance python3 -m http.server sur 127.0.0.1 et ouvre Safari
   ├── LISEZMOI-MAC.txt          # instructions en français (Gatekeeper, chmod +x, explication file://)
   └── app/                      # build statique optimisé, chemins relatifs + HashRouter
   ```
   Le lanceur choisit le premier port libre à partir de 8765, n’écoute que sur **127.0.0.1**, attend que le serveur réponde puis exécute `open -a Safari`. Fermer la fenêtre Terminal l’arrête.

### Plein écran

- Un **bouton ⤢ dans l’en-tête** passe toute l’application en plein écran. Chaque lab a aussi un **bouton « Plein écran »** qui n’agrandit que le cadre du lab, avec un fond opaque et le défilement.
- L’implémentation se trouve dans `src/lib/fullscreen.ts` et `src/hooks/useFullscreen.ts`. Elle utilise l’API standard (`requestFullscreen`, `exitFullscreen`, `fullscreenchange`) et se replie sur l’API préfixée de WebKit (`webkitRequestFullscreen`, `webkitExitFullscreen`, `webkitfullscreenchange`, `webkitFullscreenElement`) pour les anciens Safari.
- Si aucune des deux API n’existe, les boutons sont masqués.
- Les règles CSS pour `:fullscreen` et `:-webkit-full-screen` sont séparées : Safari ignore toute une règle dont la liste de sélecteurs contient une pseudo-classe inconnue.

### Correctifs Safari

- **CSP et HTTP local.** La balise `<meta>` CSP contenait `upgrade-insecure-requests`, ce qui poussait Safari/WebKit à réécrire en `https://` toutes les requêtes de scripts et de styles sur `http://127.0.0.1` / `localhost` : rien ne se chargeait et la page restait blanche. Chrome exempte la boucle locale ; WebKit non. La directive a été retirée de la balise meta et des en-têtes de `vite preview` ; l’en-tête Vercel (HTTPS uniquement) la conserve. `frame-ancestors` a aussi été retiré de la balise meta, où les navigateurs l’ignorent (Safari journalise une erreur). Il reste dans les en-têtes HTTP.
- `backdrop-filter` (les panneaux en verre dépoli) est émis avec `-webkit-backdrop-filter` par Lightning CSS, ce que confirme le test de fumée.
- Pas de lookbehind dans les regex ni de `structuredClone` dans le code de l’application. `Array.prototype.at` demande Safari 15.4+, ce qui reste dans la cible par défaut de Vite (Safari 16+).

### Limites sur macOS

- **Plein écran dans Safari.** L’entrée en plein écran exige un clic (geste de l’utilisateur) ; elle ne peut pas démarrer automatiquement. Safari affiche brièvement un bandeau « Appuyez sur Échap pour quitter », et **Échap** sort du plein écran. Le bouton vert de la fenêtre / **Ctrl+Cmd+F** (plein écran de la fenêtre) est distinct de l’API Fullscreen de la page : les deux fonctionnent, mais Échap ne quitte que celle de la page. Dans une app web du Dock, le plein écran fonctionne de la même façon.
- **iOS / iPadOS.** Safari sur iPhone ne gère pas le plein écran d’un élément (vidéo uniquement) : les boutons y sont masqués. iPadOS 16.4+ le gère. « Sur l’écran d’accueil » donne à la place une fenêtre autonome sans barre de navigation.
- **Web Crypto exige un contexte sécurisé.** `crypto.subtle` (lab AES/PBKDF2) n’existe que sur `https://` ou `http://localhost` / `127.0.0.1`. Ouvrir `index.html` directement (`file://`) ne fonctionnera **pas** : Safari bloque aussi les modules ES en `file://`. D’où le lanceur du zip, qui démarre un serveur local.
- **Gatekeeper.** `Lancer CyberLab.command` n’est ni signé ni notarié. Au premier lancement :
  - macOS ≤ 14 : clic droit → **Ouvrir**.
  - macOS 15+ : **Réglages Système → Confidentialité et sécurité → Ouvrir quand même**.
  - Si le bit d’exécution a été perdu : `chmod +x "Lancer CyberLab.command"`.
  - Ou bien : `xattr -dr com.apple.quarantine CyberLab-Mac`.
- **Python 3.** Le lanceur utilise le `python3` des Command Line Tools d’Apple (`xcode-select --install`). S’il manque, une alerte s’affiche.
- **Mode outils réels (ping ICMP, traceroute…)** : il faut le code source et l’API de lab Node locale (`npm run dev:all`) ; le zip et le site Pages exécutent les labs simulés.
  - macOS peut demander d’autoriser les **connexions réseau entrantes** pour `node`/`python3`, ou l’accès au **réseau local**. Les deux serveurs n’écoutent que sur `127.0.0.1` : refuser l’accès externe ne pose pas de problème.
  - Le binaire `ping` fonctionne sans privilèges sur macOS. S’il est indisponible, le serveur se replie sur une sonde TCP :443.
  - Depuis le site Pages en **HTTPS**, Safari peut bloquer les appels à `http://127.0.0.1:8787` comme contenu mixte. Utilisez le mode outils réels depuis `npm run dev:all` (`http://localhost:5173`).
- **Stockage de la progression.** La progression vit dans le `localStorage` de Safari pour l’origine exacte. Un autre port (par ex. 8766) ou le site Pages = une progression séparée. Les fenêtres privées ne gardent rien, et Safari peut effacer les données d’un site non visité depuis 7 jours (ITP) s’il n’a pas été ajouté au Dock.
- **Version minimale :** Safari 16 / macOS 12 Monterey. « Ajouter au Dock » nécessite Safari 17 / macOS 14 Sonoma.

### Relancer le test de fumée WebKit

```bash
npm install --no-save playwright && npx playwright install webkit   # sous Linux, aussi : npx playwright install-deps webkit
npm run build && npx vite preview --host 127.0.0.1 --port 4173 &
npm run smoke:webkit                                                # BASE_URL=… HASH=1 pour le zip Mac
```

## Structure du projet

```
cyberlab/
├── PROMPTS.md                 # Demandes de l’utilisateur, mot pour mot
├── README.md
├── .env / .env.example        # VITE_LAB_MODE (aucun secret ; .env est ignoré par git)
├── index.html
├── server/                   # API de lab locale (ping/traceroute/dns/headers/port)
├── scripts/dev-all.mjs         # Lance l’API et Vite ensemble
├── scripts/build-mac.mjs       # npm run build:mac → release/cyberlab-mac.zip (utilise package_mac.py)
├── scripts/webkit-smoke.mjs    # npm run smoke:webkit — test de fumée Safari/WebKit de bout en bout
├── packaging/mac/              # Lancer CyberLab.command + LISEZMOI-MAC.txt (copiés dans le zip Mac)
├── .github/workflows/          # pages.yml (GitHub Pages) + release.yml (zip Mac sur les tags v*)
├── vercel.json                # Réécriture SPA Vercel + en-têtes de sécurité
├── public/                    # favicon, apple-touch-icon, icons/, manifeste PWA, _redirects (Netlify)
├── docs/screenshots/          # Captures d’écran de l’interface
├── src/
│   ├── App.tsx / main.tsx / index.css
│   ├── components/            # Layout, Quiz, LessonCard, PercentBar, FullscreenButton
│   ├── pages/                 # Accueil, Module, Labs, Progression, Outils
│   ├── data/modules/          # Contenu pédagogique par thème + index
│   ├── data/modules.ts        # Ré-exports
│   ├── lib/
│   │   ├── sql/               # moteur modulaire : ast, tokenizer, parser, evaluator, functions, database, scenarios
│   │   ├── sqli.ts / sqlSelect.ts  # façades de compatibilité
│   │   ├── aes, ciphers, firewall, quiz, progress, password, validation, fullscreen, routerConfig
│   ├── labs/
│   │   ├── providers/         # adaptateurs simulé + réel
│   │   ├── titles.ts          # noms des labs (séparés pour garder le code des labs en chargement différé)
│   │   └── ui/                # Composants des labs interactifs (chacun chargé à la demande)
│   ├── hooks/                 # useProgress, useFullscreen
│   ├── types/
│   └── test/setup.ts
└── vite.config.ts             # Vite + Tailwind + Vitest, groupes de chunks, repli 404.html
```


## Notes de sécurité

- Il n’y a pas de backend : la CSRF et les IDOR classiques contre un serveur ne s’appliquent pas. La progression n’est stockée que dans `localStorage` et relue avec un schéma (un JSON invalide ou trop gros est ignoré).
- Le build de production embarque une Content-Security-Policy stricte (`script-src`/`style-src` `'self'`, pas de `unsafe-eval`). Le serveur de dev de Vite retire cette balise meta pour que le Hot Module Replacement fonctionne.
  - `connect-src` n’autorise que `'self'` et l’API de lab en boucle locale (`http://127.0.0.1:8787`, `http://localhost:8787`).
  - La balise meta ne contient pas `upgrade-insecure-requests`, car Safari casserait alors tout service en HTTP simple sur localhost (voir *macOS / Safari*). Les hébergeurs HTTPS l’envoient en en-tête (`vercel.json`).
- Les labs d’injection SQL concatènent volontairement la saisie dans un moteur simulé en mémoire (modes vulnérable et paramétré). La saisie est limitée en longueur ; le parseur n’utilise ni `eval`, ni vraie base de données, ni injection HTML. Les comptes de démo (`alice`/`wonderland`, `bob`/`builder`, `admin`/`s3cret!`) sont des données pédagogiques fictives.
- Le lab de phishing affiche les e-mails d’exemple en texte et n’utilise jamais la destination affichée comme `href` cliquable.

## Usage éthique

Les simulations de CyberLab sont uniquement pédagogiques. N’utilisez pas ces techniques contre des systèmes qui ne vous appartiennent pas ou sans autorisation explicite de les tester.

## Licence

Code source fourni pour l’apprentissage / un portfolio, comme demandé.
