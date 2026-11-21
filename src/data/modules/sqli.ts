import type { ModuleMeta } from '../../types'

export const SQLI_MODULE: ModuleMeta = {
    id: 'sqli',
    title: 'Injection SQL',
    shortTitle: 'SQLi',
    description:
      'Contournement de connexion, fuites par UNION, recherche de commandes avec JOIN et sous-requêtes booléennes à l’aveugle — avec un interrupteur « requêtes paramétrées ».',
    icon: 'Database',
    path: '/modules/sqli',
    color: 'emerald',
    labIds: ['sqli-login', 'sqli-union', 'sqli-join', 'sqli-blind'],
    lessons: [
      {
        id: 'sqli-intro',
        title: 'Quand la saisie devient du code',
        content:
          "Une injection SQL se produit quand une saisie non fiable est concaténée dans une requête : l’attaquant change le sens de la requête pour contourner l’authentification, lire des données, ou pire. Dans une connexion du type WHERE username = '…' AND password = '…', le nom d’utilisateur ' OR 1=1 -- ferme la chaîne, ajoute une condition toujours vraie et met en commentaire la vérification du mot de passe avec --.",
      },
      {
        id: 'sqli-precedence',
        title: 'Pourquoi la priorité des opérateurs compte',
        content:
          'SQL évalue AND avant OR. Ainsi username = \'\' OR \'1\'=\'1\' AND password = \'x\' signifie username = \'\' OR (\'1\'=\'1\' AND password = \'x\') : le mot de passe est toujours vérifié et le payload classique échoue. Les attaquants contournent cela avec un commentaire -- (admin\' --) ou en injectant la tautologie dans chaque champ. Les messages d’erreur d’une requête mal formée (une apostrophe seule) révèlent aussi la structure : n’affichez jamais d’erreurs brutes de la base aux utilisateurs.',
      },
      {
        id: 'sqli-union',
        title: 'Fuites de données par UNION',
        content:
          "UNION ajoute le résultat d’un second SELECT à la suite du premier. Dans une recherche vulnérable comme SELECT id, title, body FROM products WHERE title LIKE '%…%', un attaquant qui ferme la chaîne peut ajouter : ' UNION SELECT null, username, password FROM users --. Les noms d’utilisateur et mots de passe volés apparaissent alors dans les colonnes title et body du tableau de résultats.",
      },
      {
        id: 'sqli-columns',
        title: 'Nombre de colonnes et sondage par ORDER BY',
        content:
          "Les deux côtés d’un UNION doivent renvoyer le même nombre de colonnes, sinon la base renvoie une erreur (par ex. « SELECTs to the left and right of UNION do not have the same number of result columns »). Les attaquants trouvent ce nombre en essayant ORDER BY 1, ORDER BY 2, … jusqu’à l’échec : le dernier succès donne le nombre de colonnes. Ils peuvent aussi essayer UNION SELECT NULL, NULL, … en ajoutant des NULL jusqu’à ce que l’erreur disparaisse. On met NULL dans les colonnes sans intérêt et les données intéressantes dans les colonnes que l’interface affiche réellement.",
      },
      {
        id: 'sqli-join',
        title: 'Les JOIN élargissent les dégâts',
        content:
          "Quand une page joint des tables — par ex. orders INNER JOIN users ON orders.user_id = users.id — une injection dans le WHERE ne fait pas que basculer un booléen. Elle renvoie toutes les lignes jointes correspondantes : ' OR 1=1 -- peut donc vider en une réponse les commandes et adresses de livraison des autres clients. Les alias de table (o, u) et les conditions ON font partie de la même requête que l’attaquant peut manipuler.",
      },
      {
        id: 'sqli-subquery',
        title: 'Sous-requêtes et extraction à l’aveugle',
        content:
          "Une sous-requête scalaire renvoie une seule valeur : (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin'). Imbriquée dans un test booléen, elle devient un oracle oui/non : les lignes n’apparaissent que si la supposition est juste. EXISTS (SELECT 1 FROM api_keys) et IN (SELECT …) permettent de tester l’existence de tables ou de valeurs, même si l’application n’affiche jamais ces tables. Les requêtes paramétrées bloquent tout cela, exactement comme elles bloquent UNION.",
      },
      {
        id: 'sqli-fix',
        title: 'Les requêtes paramétrées',
        content:
          'Utilisez des paramètres liés / requêtes préparées pour que la base traite la saisie comme une donnée, jamais comme de la syntaxe SQL. Cela bloque aussi bien le contournement de connexion que l’injection UNION ou ORDER BY. Ajoutez des comptes de base de données à privilèges minimaux et une validation des saisies, en défense en profondeur.',
      },
    ],
    quiz: [
      {
        id: 'sq1',
        prompt: "Dans WHERE username = '<saisie>' AND password = '<saisie>', que fait le nom d’utilisateur ' OR 1=1 -- ?",
        choices: [
          'Il chiffre la base de données',
          'Il ajoute une condition OR toujours vraie et met en commentaire la vérification du mot de passe : toutes les lignes sont renvoyées',
          'Il met à jour les certificats TLS',
          'Rien — les apostrophes sont toujours échappées automatiquement',
        ],
        correctIndex: 1,
        explanation: 'L’apostrophe ferme la chaîne, OR 1=1 est toujours vrai, et -- transforme le reste (AND password = …) en commentaire.',
      },
      {
        id: 'sq3',
        prompt: "Le nom d’utilisateur ' OR '1'='1 avec le mot de passe x (sans commentaire), sur la même requête, va en général :",
        choices: [
          'Contourner la connexion, car OR rend tout vrai',
          "Échouer, car AND est prioritaire sur OR : password = 'x' reste exigé",
          'Supprimer la table users',
          'Faire planter le navigateur',
        ],
        correctIndex: 1,
        explanation: "La requête se lit username = '' OR ('1'='1' AND password = 'x'). Aucun utilisateur n’a le mot de passe x, donc aucune ligne ne correspond.",
      },
      {
        id: 'sq6',
        prompt: "Une page exécute SELECT o.id, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = '{saisie}'. Que fait généralement fuiter la saisie ' OR 1=1 -- ?",
        choices: [
          'Seulement le certificat TLS',
          'Toutes les commandes jointes — y compris les noms des autres utilisateurs (et les champs d’adresse sélectionnés)',
          'Rien — JOIN bloque l’injection',
          'Seulement la version de la base',
        ],
        correctIndex: 1,
        explanation: 'Le OR rend le WHERE vrai pour chaque commande ; le JOIN rattache toujours chaque commande à son utilisateur, donc les données des autres clients apparaissent dans le tableau.',
      },
      {
        id: 'sq7',
        prompt: "Dans une attaque booléenne à l’aveugle, (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='s' est utile parce que :",
        choices: [
          'Elle supprime la table users',
          'L’application ne renvoie des lignes que si le caractère deviné est juste — un oracle pour extraire un secret caractère par caractère',
          'Elle désactive les requêtes paramétrées',
          'SUBSTR chiffre le mot de passe',
        ],
        correctIndex: 1,
        explanation: 'Vrai ⇒ résultats non vides ; faux ⇒ vides. L’attaquant procède par dichotomie ou teste chaque caractère avec SUBSTR/ASCII.',
      },
      {
        id: 'sq4',
        prompt: 'Pourquoi un UNION SELECT doit-il renvoyer le même nombre de colonnes que la requête d’origine ?',
        choices: [
          'Parce que SQL exige des noms de colonnes identiques',
          'Parce que la base fusionne les lignes par position — des largeurs différentes provoquent une erreur de forme/type',
          'Parce que UNION ne fonctionne que sur la table users',
          'Ce n’est pas le cas — n’importe quel nombre de colonnes convient',
        ],
        correctIndex: 1,
        explanation: 'UNION empile des lignes. Toutes doivent avoir la même largeur ; le moteur rejette un SELECT à 2 colonnes face à un SELECT à 3 colonnes.',
      },
      {
        id: 'sq5',
        prompt: 'Un attaquant exécute ORDER BY 1, puis 2, puis 3 (succès) et ORDER BY 4 (erreur). Qu’a-t-il appris ?',
        choices: [
          'Le mot de passe fait 4 caractères',
          'Le SELECT d’origine renvoie 3 colonnes',
          'La base contient 4 tables',
          'Les requêtes paramétrées sont activées',
        ],
        correctIndex: 1,
        explanation: 'ORDER BY n désigne la n-ième colonne du résultat. Le dernier n qui fonctionne donne le nombre de colonnes — ici, 3.',
      },
      {
        id: 'sq2',
        prompt: 'Meilleure correction principale contre les SQLi :',
        choices: [
          'Masquer les noms de colonnes',
          'Les requêtes paramétrées / préparées',
          'Désactiver HTTPS',
          'Appliquer un chiffrement de César aux saisies',
        ],
        correctIndex: 1,
        explanation: 'Les paramètres séparent le code des données au niveau du pilote / de la base.',
      },
    ],
}
