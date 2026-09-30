// Neighbour checks for fix.diff (docs/issues/2-institution-long-ip-range-save-error.md,
// spec U66 register A9): what the fix must leave alone, walked with the fix in and
// out on a dataset fleet, signed in as the dataset's manager `rvaca`.
//   - a range written normally saves and reads back as typed;
//   - an invalid line is refused with "Invalid IP range" and adds nothing.
// (The 40-character control is in walk.js.) Reset the fleet before a walk.
//
// Run:
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/institution-long-ip-range-save-error/neighbours.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const NORMAL = '142.58.103.1 - 142.58.103.4';
const INVALID = '010.0.0.1';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbours.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`n${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const panel = () => page.locator('.institutionsListPanel');
    const rows = () => panel().locator('.listPanel__item span[id^="institution-"]').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const rowOf = (name) => panel().locator('.listPanel__item').filter({has: page.locator('span[id^="institution-"]', {hasText: new RegExp(`^\\s*${esc(name)}\\s*$`)})});
    const dlg = (title) => page.getByRole('dialog', {name: title});
    async function land() {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/institutions`));
        await idle(page); await panel().first().waitFor({timeout: T}); await idle(page);
    }
    async function add(name, ranges) {
        await panel().getByRole('button', {name: 'Add Institution', exact: true}).click();
        const d = dlg('Add Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="name-en"]').fill(name);
        await d.locator('textarea[name="ipRanges"]').fill(ranges);
        const resp = page.waitForResponse((r) => /\/api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(900);
        const open = await d.isVisible().catch(() => false);
        const out = {status: r ? r.status() : null, open};
        if (open) out.fieldErrors = await d.locator('.pkpFieldError').allInnerTexts().catch(() => []);
        await snap(`add-${name.replace(/\W+/g, '-')}`);
        if (open) { await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await pause(800); }
        return out;
    }
    async function readBack(name) {
        await rowOf(name).first().getByRole('button', {name: 'Edit', exact: true}).click();
        const d = dlg('Edit Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(300);
        const v = await d.locator('textarea[name="ipRanges"]').inputValue();
        await d.getByRole('button', {name: 'Close', exact: true}).first().click(); await pause(800);
        return v;
    }
    try {
        await signIn(page, 'rvaca');
        await land();
        fact('normal save', await add('Normal Range', NORMAL));
        fact('invalid save', await add('Bad Range', INVALID));
        await page.reload(); await idle(page); await panel().first().waitFor({timeout: T}); await idle(page);
        fact('rows after reload', await rows());
        fact('normal read back', JSON.stringify(await readBack('Normal Range')));
    } finally {
        record('neighbours', facts);
        await close();
    }
});
