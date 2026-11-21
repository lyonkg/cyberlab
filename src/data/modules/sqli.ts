import type { ModuleMeta } from '../../types'

export const SQLI_MODULE: ModuleMeta = {
    id: 'sqli',
    title: 'SQL Injection',
    shortTitle: 'SQLi',
    description:
      'Login bypass, UNION leaks, JOIN order-lookup, and blind boolean subqueries — with a parameterized toggle.',
    icon: 'Database',
    path: '/modules/sqli',
    color: 'emerald',
    labIds: ['sqli-login', 'sqli-union', 'sqli-join', 'sqli-blind'],
    lessons: [
      {
        id: 'sqli-intro',
        title: 'When input becomes code',
        content:
          "SQL injection happens when untrusted input is concatenated into a query string, letting attackers change the query's meaning — bypassing auth, reading data, or worse. In a login like WHERE username = '…' AND password = '…', the username ' OR 1=1 -- closes the string, adds an always-true condition, and comments out the password check with --.",
      },
      {
        id: 'sqli-precedence',
        title: 'Why precedence matters',
        content:
          'SQL evaluates AND before OR. So username = \'\' OR \'1\'=\'1\' AND password = \'x\' means username = \'\' OR (\'1\'=\'1\' AND password = \'x\') — the password is still checked and the classic payload fails. Attackers get around this with a -- comment (admin\' --) or by injecting the tautology into every field. Error messages from malformed queries (a lone quote) also leak structure — never show raw DB errors to users.',
      },
      {
        id: 'sqli-union',
        title: 'UNION-based data leaks',
        content:
          "UNION appends the result of a second SELECT onto the first. In a vulnerable search like SELECT id, title, body FROM products WHERE title LIKE '%…%', an attacker who closes the string can append: ' UNION SELECT null, username, password FROM users --. The leaked username and password values appear in the title and body columns of the result grid.",
      },
      {
        id: 'sqli-columns',
        title: 'Column counts and ORDER BY probing',
        content:
          "Both sides of a UNION must return the same number of columns — otherwise the database errors (e.g. 'SELECTs to the left and right of UNION do not have the same number of result columns'). Attackers discover that count by trying ORDER BY 1, ORDER BY 2, … until it fails; the last success is the column count. They can also try UNION SELECT NULL, NULL, … adding NULLs until the error goes away. Use placeholders (NULL) for columns you do not care about, and put interesting data in columns that the UI actually displays.",
      },
      {
        id: 'sqli-join',
        title: 'JOINs widen the blast radius',
        content:
          "When a page joins tables — e.g. orders INNER JOIN users ON orders.user_id = users.id — a WHERE injection does not just flip a boolean. It returns every matching joined row, so ' OR 1=1 -- can dump other customers' orders and shipping addresses in one response. Table aliases (o, u) and ON conditions are part of the same statement an attacker can manipulate.",
      },
      {
        id: 'sqli-subquery',
        title: 'Subqueries and blind extraction',
        content:
          "A scalar subquery returns one value: (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin'). Nested in a boolean test it becomes a yes/no oracle — rows appear only when the guess is right. EXISTS (SELECT 1 FROM api_keys) and IN (SELECT …) probe whether tables or values exist, even when the app never displays those tables. Parameterized queries stop all of these the same way they stop UNION.",
      },
      {
        id: 'sqli-fix',
        title: 'Parameterized queries',
        content:
          'Use bound parameters / prepared statements so the database treats input as data, never as SQL syntax. That stops login bypass, UNION, and ORDER BY injection alike. Also apply least-privilege DB accounts and input validation as defense in depth.',
      },
    ],
    quiz: [
      {
        id: 'sq1',
        prompt: "In WHERE username = '<input>' AND password = '<input>', what does the username ' OR 1=1 -- do?",
        choices: [
          'Encrypts the database',
          'Adds an always-true OR condition and comments out the password check, returning every row',
          'Updates TLS certificates',
          'Nothing — quotes are always escaped automatically',
        ],
        correctIndex: 1,
        explanation: 'The quote closes the string, OR 1=1 is always true, and -- turns the rest (AND password = …) into a comment.',
      },
      {
        id: 'sq3',
        prompt: "Username ' OR '1'='1 with password x (no comment) against the same query will usually:",
        choices: [
          'Bypass login, because OR makes everything true',
          "Fail, because AND binds tighter than OR so password = 'x' is still required",
          'Drop the users table',
          'Crash the browser',
        ],
        correctIndex: 1,
        explanation: "It parses as username = '' OR ('1'='1' AND password = 'x'). No user has password x, so no rows match.",
      },
      {
        id: 'sq6',
        prompt: "A page runs SELECT o.id, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = '{input}'. What does input ' OR 1=1 -- typically leak?",
        choices: [
          'Only the TLS certificate',
          'Every joined order row — including other users\' names (and any selected address fields)',
          'Nothing — JOIN blocks injection',
          'Only the database version',
        ],
        correctIndex: 1,
        explanation: 'The OR makes the WHERE true for every order; the JOIN still attaches each order\'s user, so other customers\' data appears in the grid.',
      },
      {
        id: 'sq7',
        prompt: "In a blind boolean attack, (SELECT SUBSTR(password,1,1) FROM users WHERE username='admin')='s' is useful because:",
        choices: [
          'It drops the users table',
          'The app returns rows only when the guessed character is correct — an oracle for extracting secrets one character at a time',
          'It disables parameterized queries',
          'SUBSTR encrypts the password',
        ],
        correctIndex: 1,
        explanation: 'True ⇒ result set non-empty; false ⇒ empty. Attackers binary-search or walk each character with SUBSTR/ASCII.',
      },
      {
        id: 'sq4',
        prompt: 'Why must a UNION SELECT return the same number of columns as the original query?',
        choices: [
          'Because SQL requires matching column names',
          'Because the database merges rows positionally — mismatched widths are a type/shape error',
          'Because UNION only works on the users table',
          'It does not — any number of columns is fine',
        ],
        correctIndex: 1,
        explanation: 'UNION stacks rows. Every row must have the same width; the engine rejects 2- vs 3-column SELECTs with a column-count error.',
      },
      {
        id: 'sq5',
        prompt: 'An attacker runs ORDER BY 1, then 2, then 3 (success) and ORDER BY 4 (error). What did they learn?',
        choices: [
          'The password is 4 characters long',
          'The original SELECT returns 3 columns',
          'The database has 4 tables',
          'Parameterized queries are enabled',
        ],
        correctIndex: 1,
        explanation: 'ORDER BY n refers to the n-th result column. The last n that succeeds is the column count — here, 3.',
      },
      {
        id: 'sq2',
        prompt: 'Best primary fix for SQLi:',
        choices: [
          'Obfuscate column names',
          'Parameterized queries / prepared statements',
          'Disable HTTPS',
          'Use Caesar cipher on inputs',
        ],
        correctIndex: 1,
        explanation: 'Parameters separate code from data at the driver/DB level.',
      },
    ],
}
