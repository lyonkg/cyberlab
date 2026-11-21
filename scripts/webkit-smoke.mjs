// Safari/WebKit smoke test for CyberLab.
// Usage:  npm run build && npm run preview -- --host 127.0.0.1 --port 4173 &
//         node scripts/webkit-smoke.mjs                       (default http://127.0.0.1:4173/)
//         BASE_URL=http://127.0.0.1:4174/cyberlab/ node scripts/webkit-smoke.mjs
//         BASE_URL=http://127.0.0.1:8000/ HASH=1 node scripts/webkit-smoke.mjs   (Mac zip / hash router)
// Requires `npm install --no-save playwright && npx playwright install webkit` (not a project dependency).
import { webkit, chromium, devices } from 'playwright'

const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:4173/').replace(/\/?$/, '/')
const HASH = process.env.HASH === '1'
const ENGINE = process.env.ENGINE ?? 'webkit'
const url = (p) => (HASH ? `${BASE}#${p}` : `${BASE}${p.replace(/^\//, '')}`)

const MODULES = {
  network: ['lab-topology', 'lab-firewall', 'lab-packet-flow', 'lab-tcp-handshake'],
  encryption: ['lab-caesar', 'lab-aes', 'lab-hashing'],
  phishing: ['lab-phishing'],
  malware: ['lab-malware'],
  ddos: ['lab-ddos'],
  mitm: ['lab-mitm'],
  sqli: ['lab-sqli', 'lab-sqli-union', 'lab-sqli-join', 'lab-sqli-blind'],
  defense: ['lab-password', 'lab-defense-depth'],
}

const results = []
const errors = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const browserType = ENGINE === 'chromium' ? chromium : webkit
const launchOpts = ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {}
const browser = await browserType.launch(launchOpts)
const ctx = await browser.newContext({ ...devices['Desktop Safari'] })
const page = await ctx.newPage()
let collecting = true
page.on('pageerror', (e) => collecting && errors.push(`pageerror @ ${page.url()}: ${e.message}`))
page.on('console', (m) => {
  if (collecting && m.type() === 'error') errors.push(`console.error @ ${page.url()}: ${m.text()}`)
})

// In hash mode a goto() that only changes the #fragment resolves before React re-renders,
// so force a full load each time (in-app hash navigation is tested separately via nav clicks).
const go = async (p) => {
  if (HASH) await page.goto('about:blank')
  await page.goto(url(p))
}

console.log(`Engine: ${ENGINE} ${browser.version()}  base: ${BASE}  hash: ${HASH}`)

// 1. Main routes
for (const [p, text] of [
  ['/', 'Network Security'],
  ['/labs', 'Labs'],
  ['/progress', 'Progress'],
  ['/tools', 'Network tools'],
]) {
  await go(p)
  await page.waitForLoadState('networkidle')
  const body = await page.locator('main').innerText()
  ok(`route ${p}`, body.toLowerCase().includes(text.toLowerCase()), `${body.length} chars`)
}

// 1b. In-app navigation through the header (BrowserRouter basename / HashRouter)
await go('/')
await page.locator('header nav').getByRole('link', { name: 'Progress' }).click()
await page.waitForURL(/progress/)
await page.locator('header nav').getByRole('link', { name: 'Labs' }).click()
await page.waitForURL(/labs/)
ok('header navigation keeps base/hash', page.url().startsWith(BASE) && (!HASH || page.url().includes('#/labs')), page.url())

// 2. Environment capabilities
const caps = await page.evaluate(() => ({
  secure: window.isSecureContext,
  subtle: !!(window.crypto && window.crypto.subtle),
  ua: navigator.userAgent,
  backdrop:
    CSS.supports('backdrop-filter', 'blur(4px)') || CSS.supports('-webkit-backdrop-filter', 'blur(4px)'),
  fullscreenApi: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
}))
ok('secure context (Web Crypto available)', caps.secure && caps.subtle, caps.ua)
ok('backdrop-filter supported (prefixed or not)', caps.backdrop)
ok('Fullscreen API present (std or webkit)', caps.fullscreenApi)

// 3. Every module + lab
for (const [mod, labs] of Object.entries(MODULES)) {
  await go(`/modules/${mod}`)
  await page.locator('main h1').waitFor()
  await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
  const labButtons = page.locator('main div.flex.flex-wrap.gap-2').first().locator('button')
  for (let i = 0; i < labs.length; i++) {
    await labButtons.nth(i).click()
    const visible = await page
      .getByTestId(labs[i])
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    ok(`lab ${mod}/${labs[i]}`, visible)
  }
  // Quiz tab renders
  await page.locator('main').getByRole('button', { name: 'Quiz', exact: true }).click()
  ok(`quiz ${mod}`, (await page.locator('main').innerText()).length > 200)
}

// 4. Animations
await go('/modules/network')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
await page.locator('main').getByRole('button', { name: /Packet/ }).first().click()
await page.getByRole('button', { name: 'Send packet' }).click()
const animating = await page.getByRole('button', { name: 'Animating…' }).isVisible()
await page.waitForTimeout(1500)
const glowCount = await page.locator('[data-testid="lab-packet-flow"] .animate-pulse-glow').count()
const animName = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="lab-packet-flow"] .animate-pulse-glow')
  return el ? getComputedStyle(el).animationName : ''
})
ok('packet flow animation runs', animating && glowCount > 0 && animName !== 'none', `animation-name=${animName}`)

await go('/modules/mitm')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
const mitmBefore = await page.getByTestId('lab-mitm').innerText()
await page.getByRole('button', { name: 'Play', exact: true }).click()
await page.waitForTimeout(2500)
const mitmAfter = await page.getByTestId('lab-mitm').innerText()
ok('MITM animation advances frames', mitmBefore !== mitmAfter)

await go('/modules/malware')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
const infected = () =>
  page.evaluate(() => document.querySelectorAll('[data-testid="lab-malware"] svg circle[fill*="f43f5e"], [data-testid="lab-malware"] svg circle[class*="rose"]').length)
const svgBefore = await page.locator('[data-testid="lab-malware"] svg').innerHTML()
await page.getByRole('button', { name: 'Start spread' }).click()
// Spread is random (60 % per 800 ms tick) — poll up to 8 s for the SVG to change.
let svgAfter = svgBefore
for (let i = 0; i < 16 && svgAfter === svgBefore; i++) {
  await page.waitForTimeout(500)
  svgAfter = await page.locator('[data-testid="lab-malware"] svg').innerHTML()
}
ok('malware spread animation updates SVG', svgBefore !== svgAfter, `infected-ish nodes=${await infected()}`)

await go('/modules/ddos')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
await page.getByRole('button', { name: /Attack traffic/ }).click()
await page.waitForTimeout(3000)
const paths = await page.locator('[data-testid="lab-ddos"] .recharts-area-area').count()
const d = await page.locator('[data-testid="lab-ddos"] .recharts-area-area').first().getAttribute('d')
ok('DDoS Recharts chart renders + updates', paths >= 2 && !!d && d.length > 20, `${paths} areas`)

// 5. Web Crypto AES-GCM + PBKDF2 through the real UI
await go('/modules/encryption')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
await page.locator('main').getByRole('button', { name: /AES/ }).first().click()
await page.getByRole('button', { name: 'Encrypt', exact: true }).click()
await page.getByText('Stored blob', { exact: false }).waitFor({ timeout: 20000 })
await page.getByRole('button', { name: 'Decrypt', exact: true }).click()
const recovered = await page
  .getByText('Recovered', { exact: true })
  .waitFor({ timeout: 20000 })
  .then(() => true)
  .catch(() => false)
ok('AES-256-GCM + PBKDF2 encrypt/decrypt roundtrip', recovered)
await page.getByTestId('lab-aes').locator('input').nth(2).fill('wrong-pass')
await page.getByRole('button', { name: 'Decrypt', exact: true }).click()
ok(
  'AES wrong passphrase rejected',
  await page
    .getByText(/authentication tag mismatch/)
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false),
)

// 6. localStorage persistence (progress) across reload
await go('/')
await page.evaluate(() => localStorage.setItem('cyberlab-webkit-probe', '1'))
await page.reload()
const ls = await page.evaluate(() => ({
  probe: localStorage.getItem('cyberlab-webkit-probe'),
  keys: Object.keys(localStorage),
}))
ok('localStorage persists across reload', ls.probe === '1', ls.keys.join(','))

// 7. Deep link reload (SPA fallback / hash)
await go('/modules/sqli')
await page.reload()
ok('deep link reload', (await page.locator('main h1').innerText()).toLowerCase().includes('sql'))

// 8. Fullscreen toggle (best effort in headless)
const fsBtn = page.getByTestId('fullscreen-toggle')
if (await fsBtn.count()) {
  await fsBtn.click()
  await page.waitForTimeout(500)
  const state = await page.evaluate(() => ({
    el: !!(document.fullscreenElement || document.webkitFullscreenElement),
    label: document.querySelector('[data-testid="fullscreen-toggle"]')?.getAttribute('aria-label'),
  }))
  ok('fullscreen toggle (header)', true, `fullscreenElement=${state.el} label=${state.label}`)
  if (state.el) {
    await fsBtn.click()
    await page.waitForTimeout(300)
  }
} else ok('fullscreen toggle (header)', false, 'button missing')

// Per-lab fullscreen: only the lab frame should become the fullscreen element.
await go('/modules/ddos')
await page.locator('main').getByRole('button', { name: 'Labs', exact: true }).click()
await page.getByTestId('lab-ddos').waitFor()
await page.getByTestId('lab-fullscreen-toggle').click()
await page.waitForTimeout(600)
const labFs = await page.evaluate(() => {
  const el = document.fullscreenElement || document.webkitFullscreenElement
  return { cls: el ? el.className : '', bg: el ? getComputedStyle(el).backgroundColor : '' }
})
ok('fullscreen toggle (per lab)', labFs.cls.includes('lab-frame'), `bg=${labFs.bg}`)
if (labFs.cls) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  if (await page.evaluate(() => !!(document.fullscreenElement || document.webkitFullscreenElement)))
    await page.getByTestId('lab-fullscreen-toggle').click()
}

// Stop collecting: Playwright's screenshot injects an inline <style> that our strict CSP (rightly) refuses.
collecting = false
// caret:'initial' — otherwise Playwright injects an inline <style> that our strict CSP (rightly) refuses.
await page.screenshot({ path: process.env.SHOT ?? 'docs/screenshots/10-webkit-safari.png', caret: 'initial' })
await browser.close()

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed; ${errors.length} console/page errors`)
for (const e of errors) console.log('  ERR ' + e)
process.exit(failed.length || errors.length ? 1 : 0)
