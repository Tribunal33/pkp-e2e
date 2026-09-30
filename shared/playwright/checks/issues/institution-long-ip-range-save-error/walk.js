// Issue report walk: docs/issues/U66-A9-institution-long-ip-range-save-error.md
// (spec U66 register A9). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// signed in as the dataset's manager `rvaca` on `publicknowledge`; the kit
// builds nothing, every institution is created on screen. Records every
// screen with screen(). Reset the fleet before each walk: the walk adds
// institutions to the dataset.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/institution-long-ip-range-save-error/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/institution-long-ip-range-save-error/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const LONG = `142.58.103.1${' '.repeat(10)}-${' '.repeat(10)}142.58.103.4`; // 45
const FORTY = `142.58.103.1${' '.repeat(7)}-${' '.repeat(8)}142.58.103.4`; // 40
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The body of a server error and an "Error" window's message are not kept.
const WITHHELD = '[not recorded]';

forEachApp(async (app) => {
    const facts = {long: LONG.length, forty: FORTY.length};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const path = app.contextPath; // publicknowledge
    fact('context', path);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        if (s && s.text && typeof s.text.dialog === 'string' && /^\s*Error\b/.test(s.text.dialog)) s.text.dialog = `Error ${WITHHELD}`;
        const file = `${String(++n).padStart(2, '0')}-${name}`;
        record(file, s);
        return s;
    }
    const panel = () => page.locator('.institutionsListPanel');
    const rows = () => panel().locator('.listPanel__item span[id^="institution-"]').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const rowOf = (name) => panel().locator('.listPanel__item').filter({has: page.locator('span[id^="institution-"]', {hasText: new RegExp(`^\\s*${esc(name)}\\s*$`)})});
    const dlg = (title) => page.getByRole('dialog', {name: title});
    async function land() {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/institutions`));
        await idle(page);
        await panel().first().waitFor({timeout: T});
        await idle(page);
    }
    async function save(d) {
        const resp = page.waitForResponse((r) => /\/api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(900);
        const open = await d.isVisible().catch(() => false);
        const out = {status: r ? r.status() : null, open};
        if (open) {
            out.footer = await d.locator('.pkpFormPage__footer').innerText().catch(() => null);
            out.fieldErrors = await d.locator('.pkpFieldError').allInnerTexts().catch(() => []);
        }
        out.errorWindow = await page.getByRole('dialog', {name: 'Error'}).isVisible().catch(() => false);
        return out;
    }
    async function closeDialogs() {
        // An "Error" window over the panel first, then the panel itself.
        for (let i = 0; i < 3; i++) {
            const btn = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|OK)$/}).first();
            if (!(await btn.count())) break;
            await btn.click().catch(() => {});
            await pause(800);
        }
    }
    async function readEdit(name, i = 0) {
        await rowOf(name).nth(i).getByRole('button', {name: 'Edit', exact: true}).click();
        const d = dlg('Edit Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(300);
        const v = await d.locator('textarea[name="ipRanges"]').inputValue();
        return {d, v};
    }
    try {
        // 1
        await signIn(page, 'rvaca');
        // 2: by address; the side menu's link, when there is one, is recorded
        await land();
        await snap('page');
        fact('side menu Institutions links', await page.getByRole('link', {name: 'Institutions', exact: true}).count());
        fact('rows at start', await rows());
        // 3-5
        await panel().getByRole('button', {name: 'Add Institution', exact: true}).click();
        let d = dlg('Add Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="name-en"]').fill('Long Library');
        await d.locator('textarea[name="ipRanges"]').fill(LONG);
        await snap('add-filled');
        // 6
        fact('step 6 save', await save(d));
        await snap('after-save-1');
        fact('step 6 rows behind', await rows());
        // 7: the "Error" window closed first, then Save again
        if (await page.getByRole('dialog', {name: 'Error'}).isVisible().catch(() => false)) {
            await page.getByRole('dialog', {name: 'Error'}).getByRole('button').first().click().catch(() => {});
            await pause(800);
        }
        if (await d.isVisible().catch(() => false)) {
            fact('step 7 save', await save(d));
            await snap('after-save-2');
            fact('step 7 rows behind', await rows());
        }
        // 8
        await closeDialogs();
        await page.reload(); await idle(page); await panel().first().waitFor({timeout: T}); await idle(page);
        await snap('after-reload');
        const after = await rows();
        fact('step 8 rows after reload', after);
        // 9
        const longCount = after.filter((r) => r === 'Long Library').length;
        const longRanges = [];
        for (let i = 0; i < longCount; i++) {
            const {d: e, v} = await readEdit('Long Library', i);
            longRanges.push(v);
            await snap(`long-edit-${i + 1}`);
            await e.getByRole('button', {name: 'Close', exact: true}).first().click(); await pause(800);
        }
        fact('step 9 IP ranges per Long Library row', longRanges);
        // 10
        await panel().getByRole('button', {name: 'Add Institution', exact: true}).click();
        d = dlg('Add Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="name-en"]').fill('Campus Library');
        await d.locator('textarea[name="ipRanges"]').fill('10.1.0.0/16');
        fact('step 10 save', await save(d));
        await snap('campus-added');
        // 11
        let e = (await readEdit('Campus Library')).d;
        fact('step 11 IP ranges before', await e.locator('textarea[name="ipRanges"]').inputValue());
        await e.locator('textarea[name="ipRanges"]').fill(`${LONG}\n10.1.0.0/16`);
        await snap('campus-edit-filled');
        fact('step 11 save', await save(e));
        await snap('campus-after-save');
        // 12
        await closeDialogs();
        await page.reload(); await idle(page); await panel().first().waitFor({timeout: T}); await idle(page);
        fact('step 12 rows after reload', await rows());
        const r11 = await readEdit('Campus Library');
        fact('step 12 Campus Library IP ranges', r11.v);
        await snap('campus-edit-after-reload');
        await shot(page, 'campus-edit-after-reload');
        await r11.d.getByRole('button', {name: 'Close', exact: true}).first().click(); await pause(800);
        // Control: 40 characters
        await panel().getByRole('button', {name: 'Add Institution', exact: true}).click();
        d = dlg('Add Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="name-en"]').fill('Forty Library');
        await d.locator('textarea[name="ipRanges"]').fill(FORTY);
        fact('control 40 save', await save(d));
        await snap('forty-saved');
        const rf = await readEdit('Forty Library');
        fact('control 40 read back', JSON.stringify(rf.v));
        await rf.d.getByRole('button', {name: 'Close', exact: true}).first().click(); await pause(800);
        // Stored rows (evidence only, not a step)
        if (typeof sql === 'function') {
            const c = app.contextTables;
            fact('db institutions', await sql(app, `select i.institution_id, (select setting_value from institution_settings s where s.institution_id=i.institution_id and s.setting_name='name' limit 1), (select string_agg(ip_string, ' | ') from institution_ip p where p.institution_id=i.institution_id) from institutions i join ${c.table} j on j.${c.id}=i.context_id where j.path='${path}' order by i.institution_id`));
        }
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});
