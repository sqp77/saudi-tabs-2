// Usage: pnpm mock-api && pnpm start:mock, then: node mock-server/smoke-test.mjs  (env: CHROME, OUT, LIGHT=1)

// Minimal Chrome DevTools Protocol driver (no deps) for smoke-testing the app.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.OUT ?? './smoke-shots';
const BASE = 'http://127.0.0.1:4200';
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', '--no-first-run', '--no-default-browser-check', '--disable-gpu', `--user-data-dir=${OUT}/profile`, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
const targets = await (await fetch('http://127.0.0.1:9333/json')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const logs = [];
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
// SAFETY: this script creates accounts and orders. Block every non-local API host at the network layer
// so a mis-configured environment can never reach production.
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
const ALLOWED = /^(http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/|https:\/\/([a-z]\.)?tile\.openstreetmap\.org\/|https:\/\/fonts\.(googleapis|gstatic)\.com\/|https:\/\/picsum\.photos\/|https:\/\/fastly\.picsum\.photos\/|https:\/\/eayni-assets\.s3)/;
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = d.params;
  if (ALLOWED.test(request.url)) ws.send(JSON.stringify({ id: ++seq, method: 'Fetch.continueRequest', params: { requestId } }));
  else { blocked.push(request.url); ws.send(JSON.stringify({ id: ++seq, method: 'Fetch.failRequest', params: { requestId, errorReason: 'BlockedByClient' } })); }
});
const blocked = [];

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Browser.grantPermissions', { origin: BASE, permissions: ['geolocation'] });
if (process.env.LIGHT) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Emulation.setGeolocationOverride', { latitude: 24.7136, longitude: 46.6753, accuracy: 20 });

const shot = async (name) => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', name); };
const drainErrors = (label) => { for (const e of events.splice(0)) { if (e.method === 'Runtime.exceptionThrown') logs.push(`[${label}] EXC ${e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text}`); if (e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')) logs.push(`[${label}] ${e.params.type.toUpperCase()} ${e.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`); if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') logs.push(`[${label}] LOG ${e.params.entry.text.slice(0, 300)} ${e.params.entry.url ?? ''}`); } };
const goto = async (path, wait = 1800) => { await send('Page.navigate', { url: BASE + path }); await sleep(wait); };
const click = async (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'MISSING ' + ${JSON.stringify(sel)}; el.click(); return 'ok'; })()`);
const type = async (sel, text) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'MISSING'; const setter = Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);

// 1. Welcome (guest, Arabic default)
await goto('/auth/welcome');
await evaluate(`localStorage.clear(); 'cleared'`); await goto('/auth/welcome');
await shot('01-welcome-ar'); drainErrors('welcome');
console.log('dir=', await evaluate('document.documentElement.dir'), 'lang=', await evaluate('document.documentElement.lang'));

// 2. Register + sign-in flows against the mock (real HTTP)
await goto('/auth/register', 1500); await shot('02-register');
console.log(await type('#name', 'سعود'), await type('#email', `new-${Date.now()}@example.com`), await type('#phone', '0555930749'), await type('#password', 'secret123'));
await click('ion-button[type=submit]'); await sleep(2500); console.log('url after register:', await evaluate('location.pathname')); drainErrors('register');
await evaluate(`localStorage.clear(); 'cleared'`); await goto('/auth/login', 1500); await shot('03-login');
console.log(await type('#email', 'saud@example.com'), await type('#password', 'secret123'));
await click('ion-button[type=submit]'); await sleep(2500); console.log('url after login:', await evaluate('location.pathname')); drainErrors('login');

// 3. Home (authed)
await goto('/tabs/home', 2500); await shot('04-home-ar'); drainErrors('home');
await click('.iconbtn'); await sleep(800); await shot('05-home-en'); console.log('dir after toggle=', await evaluate('document.documentElement.dir')); await click('.iconbtn'); await sleep(500);

// 4. Donate wizard
await goto('/donate', 2500); await shot('06-donate-step1'); drainErrors('donate1');
await click('.opt:nth-child(1) .opt__main'); await sleep(400); await click('.opt:nth-child(2) .opt__main'); await sleep(400); await click('.qty__ctrl button:last-child'); await sleep(300); await shot('07-donate-step1-selected');
await click('ion-footer ion-button'); await sleep(900); await shot('08-donate-step2'); drainErrors('donate2');
console.log(await type('#instr', 'الدور الثالث، بجوار المصعد')); await click('ion-footer ion-button'); await sleep(2500); await shot('09-donate-step3-map'); drainErrors('donate3');
await evaluate(`(() => { const s = document.querySelector('#region'); s.value = '65ba8a3d584a2d51f2f1bc07'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(900);
await evaluate(`(() => { const s = document.querySelector('#city'); s.value = '65ba8b0a63577a3ce4de8c83'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await sleep(500);
console.log('address resolved:', await evaluate(`document.querySelector('#addr')?.value`)); await shot('10-donate-step3-filled');
await click('ion-footer ion-button'); await sleep(1500); await shot('11-donate-review'); drainErrors('review');
await click('ion-footer ion-button'); await sleep(2500); console.log('after submit:', await evaluate('location.pathname')); await shot('12-donate-success'); drainErrors('submit');

// 5. Orders
await goto('/tabs/orders', 2500); await shot('13-orders'); drainErrors('orders');
await goto('/orders/ord_active', 2500); await shot('14-order-detail'); drainErrors('detail');
await evaluate(`document.querySelector('ion-content').scrollToBottom(0)`); await sleep(600); await shot('15-order-detail-bottom');
await goto('/orders/ord_active/chat', 2500); console.log(await type('.composer input', 'شكرًا لك')); await click('.composer button'); await sleep(1500); await shot('18-chat'); drainErrors('chat');
await goto('/orders/ord_done_1/receipt', 2500); await shot('19-receipt');

// 6. Impact / rewards / containers / notifications / assistant / profile
await goto('/tabs/impact', 2500); await shot('20-impact'); drainErrors('impact');
await evaluate(`document.querySelector('ion-content').scrollToBottom(0)`); await sleep(600); await shot('21-impact-bottom');
await goto('/rewards', 2500); await shot('22-rewards'); drainErrors('rewards');
await goto('/containers', 3000); await shot('23-containers'); drainErrors('containers');
await goto('/notifications', 2500); await shot('24-notifications'); drainErrors('notif');
await goto('/assistant', 2000); console.log(await type('.composer input', 'بماذا أتبرع؟')); await click('.composer button'); await sleep(1500); await shot('25-assistant'); drainErrors('assistant');
await goto('/tabs/profile', 2500); await shot('26-profile');
await evaluate(`(() => { const b = [...document.querySelectorAll('.seg button')].find(x => x.textContent.trim() === 'داكن'); b?.click(); })()`); await sleep(700); await shot('27-profile-dark');
await goto('/tabs/home', 2500); await shot('28-home-dark'); drainErrors('dark');
await goto('/info/contact', 2500); await shot('30-contact'); drainErrors('info');

console.log('\n==== CONSOLE / EXCEPTIONS ====');
for (const l of logs) console.log(l);
console.log('==== END (', logs.length, ') ====');
if (blocked.length) { console.log('BLOCKED NON-LOCAL REQUESTS (fix the environment!):'); for (const u of new Set(blocked)) console.log('  ', u); }
ws.close(); chrome.kill();
