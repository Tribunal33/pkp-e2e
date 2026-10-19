// Helpers of walk.js beside it. Requiring this file runs nothing. Page objects are required inside
// each function, after forEachApp has set the app's environment (patterns.md "Probe kit").
const {screen, shot, record, signIn} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 240);

/**
 * Every dialog, page error and console error of a browser context from now on, by phase; each
 * dialog answered "OK" as a person would. Set `w.phase` before an action.
 */
function watchContext(context) {
    const w = {phase: 'before', dialogs: [], errors: []};
    const hook = (page) => {
        page.on('dialog', (d) => {
            w.dialogs.push({phase: w.phase, type: d.type(), message: flat(d.message(), 300)});
            d.accept().catch(() => {});
        });
        page.on('pageerror', (e) => w.errors.push({phase: w.phase, kind: 'pageerror', text: flat(e.message || String(e), 300)}));
        page.on('console', (m) => { if (m.type() === 'error') w.errors.push({phase: w.phase, kind: 'console', text: flat(m.text(), 300)}); });
    };
    context.pages().forEach(hook);
    context.on('page', hook);
    return w;
}

/**
 * The page requests (no assets) a context sends while `fn` runs, each with its answer: status,
 * type, redirect target, and the body of a JSON answer.
 */
async function contextTraffic(context, fn) {
    const seen = [];
    const onReq = (r) => { if (!/\.(js|css|png|svg|gif|woff2?|ico|map)(\?|$)/.test(r.url())) seen.push(r); };
    context.on('request', onReq);
    let value;
    try {
        value = await fn();
    } finally {
        context.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        const e = {method: r.method(), url: strip(r.url()), status: res ? res.status() : null,
            accept: (r.headers().accept || '').slice(0, 60), xrw: r.headers()['x-requested-with'] || null};
        if (res) e.type = (res.headers()['content-type'] || '').slice(0, 50);
        if (res && res.status() >= 300 && res.status() < 400) e.location = strip(res.headers().location);
        if (res && /json/.test(e.type || '')) e.body = flat(await res.text().catch(() => null), 300);
        out.push(e);
    }
    return {value, requests: out};
}

/** One action in the watched context: its dialogs, errors and requests, `ms` after it. */
async function act(w, context, name, fn, ms = 5000) {
    w.phase = name;
    const d0 = w.dialogs.length, e0 = w.errors.length;
    let error = null;
    const {requests} = await contextTraffic(context, async () => {
        try {
            await fn();
        } catch (e) {
            error = flat(String(e), 300);
        }
        await sleep(ms);
    });
    return {action: name, error, dialogs: w.dialogs.slice(d0).map((d) => `${d.type}: ${d.message}`),
        errors: w.errors.slice(e0).map((e) => `${e.kind}: ${e.text}`), requests};
}

/** screen() + PNG under `name`, bounded: a page whose script is stuck still gets its PNG. */
async function snap(page, name, ms = 12000) {
    let s = null;
    try {
        s = await Promise.race([screen(page), sleep(ms).then(() => null)]);
    } catch (e) {
        s = {error: flat(String(e), 200)};
    }
    if (s) record(name, s);
    await shot(page, name).catch(() => {});
    return s ? name : `${name} (screen() timed out; PNG only)`;
}

/**
 * Browser A: `admin` signs in, opens Administration and presses "Expire User Sessions", answering
 * "OK" to the confirm. What A was asked and where it landed.
 */
async function expireSessions(page) {
    await signIn(page, 'admin');
    await page.goto('/index.php/index/en/admin');
    await page.waitForLoadState('load');
    const heading = flat(await page.locator('h1').first().innerText().catch(() => null), 80);
    const asked = [];
    const onDialog = (d) => { asked.push(`${d.type()}: ${flat(d.message(), 300)}`); d.accept().catch(() => {}); };
    page.on('dialog', onDialog);
    await Promise.all([
        page.waitForURL(/\/login/, {timeout: 20000}).catch(() => {}),
        page.getByRole('button', {name: 'Expire User Sessions', exact: true}).click({timeout: 10000}),
    ]);
    await sleep(1000);
    page.off('dialog', onDialog);
    return {heading, asked, url: strip(page.url()), loginForm: await page.locator('form#login').count()};
}

/** Where a page stands: its address, whether it shows the Login form, its main text. */
async function where(page) {
    return {url: strip(page.url()), loginForm: await page.locator('form#login').count().catch(() => null),
        username: await page.locator('form#login input[name="username"]').inputValue({timeout: 1000}).catch(() => null),
        main: flat(await page.locator('main, body').first().innerText({timeout: 2000}).catch(() => null), 300)};
}

module.exports = {sleep, flat, strip, watchContext, contextTraffic, act, snap, expireSessions, where};
