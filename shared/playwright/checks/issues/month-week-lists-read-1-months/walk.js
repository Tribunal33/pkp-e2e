// Issue report walk: docs/issues/U51-A15-month-week-lists-read-1-months.md
// (spec U51 register A15). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   the Journal Manager `rvaca` opens Settings › Distribution › "Access",
//   chooses the subscription "Publishing Mode", reads the "Delayed Open
//   Access" list, presses "Save", opens the "Payments" page by its address,
//   presses "Subscription Policies" and reads the four "Subscription Expiry
//   Reminders" lists.
//
// Arguments (after the script):
//   (none)      the Steps, in English (the address's `en`).
//   neighbour   the fix check: the same five lists read in French (the
//               address's `fr_CA`, the dataset's second language), whose
//               translation has no plural forms: they must read as before
//               the fix ("1 mois", "2 mois", "1 semaines"), never a raw key.
//
// The kit builds nothing. Every screen is recorded with screen(); each
// list's entries (value=text) go into the facts, with any failed request
// or page script error.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const LANG = MODE === 'neighbour' ? 'fr_CA' : 'en';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REMINDERS = [
    'numMonthsBeforeSubscriptionExpiryReminder',
    'numWeeksBeforeSubscriptionExpiryReminder',
    'numMonthsAfterSubscriptionExpiryReminder',
    'numWeeksAfterSubscriptionExpiryReminder',
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const cp = app.contextPath;
    const old = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0';
    const ctx = old ? `/index.php/${cp}` : `/index.php/${cp}/${LANG}`;
    const label = `a15-${MODE}`;
    const facts = {mode: MODE, line: app.line || 'main', lang: LANG};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(String(e.message).slice(0, 300)));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); });
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    /** A <select>'s label (its <label for>) and its entries, value=text. */
    const readList = (sel) => sel.evaluate((s) => {
        const l = s.id ? document.querySelector(`label[for="${s.id}"]`) : null;
        return {
            label: l ? l.innerText.replace(/\s+/g, ' ').trim() : null,
            count: s.options.length,
            first: [...s.options].slice(0, 4).map((o) => `${o.value}=${o.text.trim()}`),
            last: s.options.length ? `${s.options[s.options.length - 1].value}=${s.options[s.options.length - 1].text.trim()}` : null,
        };
    });

    try {
        // 1. Sign in as the Journal Manager.
        await signIn(page, 'rvaca', {contextPath: cp});
        // 2. Settings › Distribution, "Access".
        await page.goto(app.url(`${ctx}/management/settings/distribution`));
        await idle(page);
        await page.locator('#access-button').click();
        const panel = page.locator('#access');
        const radios = panel.locator('input[type="radio"][name="publishingMode"]');
        await radios.first().waitFor({timeout: T});
        // 3. The subscription mode (value 1).
        await panel.locator('input[type="radio"][name="publishingMode"][value="1"]').check();
        await pause(300);
        fact('03-mode-label', await panel.locator('input[type="radio"][name="publishingMode"][value="1"]').evaluate((r) => (r.closest('label') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim()));
        // 4. "Delayed Open Access", opened.
        const delayed = panel.locator('select[name="delayedOpenAccessDuration"]');
        await delayed.waitFor({timeout: T});
        fact('04-delayed-open-access', await readList(delayed));
        await delayed.click().catch(() => {});
        await snap('delayed-open-access');
        await page.keyboard.press('Escape').catch(() => {});
        // 5. "Save".
        const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await panel.locator('button').filter({hasText: /^\s*(Save|Enregistrer)\s*$/}).first().click();
        const r = await answer;
        fact('05-save', {status: r.status()});
        await pause(500);
        await snap('access-saved');
        // 6. The "Payments" page by its address, "Subscription Policies".
        await page.goto(app.url(`${ctx}/payments`));
        await idle(page);
        await page.locator('a[name="subscriptionPolicies"]').click();
        const first = page.locator(`select[name="${REMINDERS[0]}"]`);
        await first.waitFor({timeout: T});
        await idle(page);
        // 7. The four "Subscription Expiry Reminders" lists, each opened.
        const lists = {};
        for (const name of REMINDERS) {
            const sel = page.locator(`select[name="${name}"]`);
            lists[name] = await readList(sel);
            await sel.click().catch(() => {});
            await page.keyboard.press('Escape').catch(() => {});
        }
        fact('07-expiry-reminder-lists', lists);
        await snap('subscription-policies');
        const all = [facts['04-delayed-open-access'], ...Object.values(lists)].flatMap((l) => [...l.first, l.last]);
        fact('raw-keys', all.filter((t) => /##/.test(t)));
    } finally {
        fact('server-errors', failed);
        fact('script-errors', scriptErrors);
        record(`${label}-facts`, facts);
        await close();
    }
});
