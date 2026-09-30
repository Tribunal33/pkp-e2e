// Issue report walk: docs/issues/U51-A17-delayed-open-access-empty-box.md
// (spec U51 register A17). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no "Delayed Open Access"):
//   the editor `dbarnes` opens Settings › Distribution › "Access", chooses
//   the subscription "Publishing Mode", reads "Delayed Open Access" and its
//   list, presses "Save" with the box untouched, reloads and reads the tab
//   again; then the control: chooses "Disabled", saves, reloads, reads.
//
// Arguments (after the script):
//   (none)      the Steps and the control.
//   neighbour   the fix check: the same journal chooses "6 Months", saves,
//               reloads (must read "6 Months"), then "Disabled", saves,
//               reloads (must read "Disabled"); the stored value is read
//               after each save.
//
// The kit builds nothing. Every screen is recorded with screen(); the box's
// shown text and value, the list's entries, each save's status and the
// `delayedOpenAccessDuration` it sent, and the stored journal_settings row
// go into the facts.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-empty-box/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no "Delayed Open Access" on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const cp = app.contextPath;
    const ctx = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? `/index.php/${cp}` : `/index.php/${cp}/en`;
    const label = `a17-${MODE}`;
    const fact = (k, v) => console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    const stored = async () => (await sql(app, `select setting_name, coalesce(setting_value, '<null>') from journal_settings where journal_id = (select journal_id from journals where path = '${cp}') and setting_name in ('publishingMode', 'delayedOpenAccessDuration') order by setting_name`)) || '(no rows)';

    const {page, close} = await launch(app);
    const scriptErrors = [];
    page.on('pageerror', (e) => scriptErrors.push(String(e.message).slice(0, 300)));
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); });
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const panel = () => page.getByRole('tabpanel', {name: 'Access', exact: true});
    const box = () => panel().getByRole('combobox', {name: 'Delayed Open Access'});

    /** Step 2 (and 6): Settings › Distribution, the "Access" tab. */
    async function openAccess() {
        await page.goto(app.url(`${ctx}/management/settings/distribution`));
        await idle(page);
        await page.getByRole('tab', {name: 'Access', exact: true}).click();
        await panel().getByRole('radio', {name: SUB_MODE, exact: true}).waitFor({timeout: T});
        await pause(300);
    }
    /** What the tab shows: the checked mode, and the box's shown text and value. */
    async function readTab() {
        const radios = await panel().getByRole('group', {name: 'Publishing Mode'}).getByRole('radio').evaluateAll((rs) => rs.map((r) => ({label: (r.closest('label') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim(), checked: r.checked})));
        const shown = await box().isVisible().catch(() => false);
        const out = {mode: (radios.find((r) => r.checked) || {label: '(none selected)'}).label, delayedShown: shown};
        if (shown) {
            Object.assign(out, await box().evaluate((s) => ({
                value: s.value,
                selectedIndex: s.selectedIndex,
                shownText: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text : '',
                optionCount: s.options.length,
                firstOptions: [...s.options].slice(0, 3).map((o) => `${o.value}=${o.text}`),
                lastOption: s.options.length ? `${s.options[s.options.length - 1].value}=${s.options[s.options.length - 1].text}` : null,
            })));
        }
        return out;
    }
    /** "Save": status, the delayedOpenAccessDuration the form sent, "Saved". */
    async function save(name) {
        const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await panel().getByRole('button', {name: 'Save', exact: true}).click();
        const savedSeen = panel().locator('[role="status"]').filter({hasText: 'Saved'}).waitFor({timeout: 5000}).then(() => true, () => false);
        const r = await answer;
        let sent = null;
        try { const body = JSON.parse(r.request().postData() || '{}'); sent = 'delayedOpenAccessDuration' in body ? body.delayedOpenAccessDuration : '(not sent)'; } catch { sent = r.request().postData(); }
        let answered = null;
        try { const j = await r.json(); answered = {publishingMode: j.publishingMode, delayedOpenAccessDuration: j.delayedOpenAccessDuration === undefined ? '(absent)' : j.delayedOpenAccessDuration}; } catch { answered = null; }
        const saved = await savedSeen;
        const out = {status: r.status(), sentDelayedOpenAccessDuration: sent, answered, savedShown: saved, stored: await stored()};
        fact(name, out);
        await snap(name, {walk: out});
        return out;
    }

    try {
        // 1. sign in
        await signIn(page, 'dbarnes', {contextPath: cp});
        fact('00-stored-before', await stored());
        // 2. the "Access" tab
        await openAccess();
        fact('02-access-tab', await readTab());
        await snap('access-tab');
        // 3. the subscription mode
        await panel().getByRole('radio', {name: SUB_MODE, exact: true}).check();
        await pause(300);

        if (MODE === 'steps') {
            // 4. the box, and its list opened
            fact('04-delayed-box', await readTab());
            await box().click().catch(() => {});
            await snap('delayed-box');
            await page.keyboard.press('Escape').catch(() => {});
            // 5. "Save" untouched
            await save('05-save-untouched');
            // 6. reload, "Access" again
            await openAccess();
            fact('06-after-reload', await readTab());
            await snap('after-reload');
            // control: "Disabled", "Save", reload
            await box().selectOption({label: 'Disabled'});
            await save('07-control-save-disabled');
            await openAccess();
            fact('08-control-after-reload', await readTab());
            await snap('control-after-reload');
        } else {
            await box().selectOption({label: '6 Months'});
            await save('n1-save-6-months');
            await openAccess();
            fact('n2-after-reload-6-months', await readTab());
            await snap('after-reload-6-months');
            await box().selectOption({label: 'Disabled'});
            await save('n3-save-disabled');
            await openAccess();
            fact('n4-after-reload-disabled', await readTab());
            await snap('after-reload-disabled');
        }
    } finally {
        fact('server-errors', failed);
        fact('script-errors', scriptErrors);
        await close();
    }
});
