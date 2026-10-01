// Issue report walk: docs/issues/U50-A1-create-issue-title-refusal-unmarked.md
// (spec U50 register A1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's editor `dbarnes` on `publicknowledge`; the kit
// builds nothing, every issue is created on screen. Records every screen with
// screen(); after each "Save" it reads the page notices as they appear, the
// form's marked fields (`label.error`, `.error`) and the "Future Issues" rows,
// and the `issues` table (evidence only, not steps). OJS only (issues are an
// OJS surface). Reset the fleet before each walk: the walk adds issues.
//
//   PHASE=steps (default)  Steps 1-5 (the four boxes as they arrive, no title),
//                          then the control: untick "Title", "Save"
//   PHASE=neighbour        what fix.diff must leave alone or extend, walked with
//                          the fix in and out:
//                          N1 all four ticked with a title: saves
//                          N2 "Volume" and "Title" unticked, "Volume" empty: saves
//                          N3 "Volume" ticked and empty, "Title" unticked: refused
//                             with the Volume message (marked with the fix)
//                          N4 no box ticked: refused with the identification
//                             message (a notice only, with and without the fix)
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/create-issue-title-refusal-unmarked/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/create-issue-title-refusal-unmarked/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const PHASE = process.env.PHASE || 'steps';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const squash = (x) => x.replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issues on a press or a preprint server
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {phase: PHASE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const issues = () => sql(app, 'SELECT issue_id, volume, number, year, show_volume, show_number, show_year, show_title FROM issues ORDER BY issue_id');
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        const file = `${PHASE === 'steps' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${name}`;
        record(file, s);
        await shot(page, file).catch(() => {});
        return s;
    }
    const form = () => page.locator('form#issueForm');
    const futureRows = async () => (await page.locator('tr.gridRow').filter({visible: true}).allInnerTexts()).map(squash);
    const ticks = async () => {
        const out = {};
        for (const f of ['showVolume', 'showNumber', 'showYear', 'showTitle']) {
            out[f] = await form().locator(`input[type="checkbox"][name="${f}"]`).isChecked();
        }
        return out;
    };
    // What the form marks: every visible element carrying the error class, and
    // the label each text box shows under it.
    const marks = async () => ({
        errors: (await form().locator('.error').filter({visible: true}).evaluateAll((els) => els.map((e) => ({
            tag: e.tagName.toLowerCase(), cls: e.className, for: e.getAttribute('for'), text: e.innerText.replace(/\s+/g, ' ').trim(),
        })))),
        labels: await form().evaluate((f) => {
            const out = {};
            for (const name of ['volume', 'number', 'year', 'title']) {
                const input = f.querySelector(`input[name="${name}"], input[name^="${name}["]:not(.multilingual_extra)`);
                const label = input ? f.querySelector(`label.sub_label[for="${input.id}"]`) : null;
                out[name] = label ? {text: label.innerText.replace(/\s+/g, ' ').trim(), error: label.classList.contains('error')} : null;
            }
            return out;
        }),
    });
    // Notices as they appear, with the time since "Save" (ui-library toasts).
    const t0 = {v: 0};
    const seen = [];
    await page.exposeFunction('__u50w26Notice', (text) => seen.push({ms: Date.now() - t0.v, text}));
    await page.addInitScript(() => {
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification').forEach((el) => {
                if (el.dataset.u50w26) return;
                el.dataset.u50w26 = '1';
                window.__u50w26Notice(el.innerText.replace(/\s+/g, ' ').trim());
            });
        }).observe(document, {subtree: true, childList: true});
    });
    async function noticeGone(text) {
        // poll until no notice holding the text is shown, up to 15 s
        const until = Date.now() + 15_000;
        while (Date.now() < until) {
            const shown = await page.locator('.app__notifications .pkpNotification').filter({hasText: text}).filter({visible: true}).count();
            if (!shown) return Date.now() - t0.v;
            await pause(250);
        }
        return null;
    }

    // Step 2: Issues, on the "Future Issues" tab
    async function land() {
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const tab = page.getByRole('tab', {name: 'Future Issues'});
        if (await tab.count()) { await tab.first().click(); await idle(page); }
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().waitFor({timeout: T});
    }
    async function open(name) {
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
        await form().locator('input[name="volume"]').waitFor({timeout: T});
        await idle(page); await pause(300);
        const arrived = await ticks();
        await snap(`${name}-window`);
        return arrived;
    }
    async function fill(values) {
        for (const [field, value] of Object.entries(values.boxes || {})) {
            const box = field === 'title'
                ? form().locator('input[name^="title["]:not(.multilingual_extra)').first()
                : form().locator(`input[name="${field}"]`);
            await box.fill(value);
        }
        for (const [field, on] of Object.entries(values.ticks || {})) {
            const box = form().locator(`input[type="checkbox"][name="${field}"]`);
            if ((await box.isChecked()) !== on) await box.click();
        }
    }
    async function save(name) {
        seen.length = 0;
        const resp = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000}).catch(() => null);
        t0.v = Date.now();
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page); await pause(800);
        const out = {ticks: await ticks().catch(() => null), status: r ? r.status() : null};
        out.windowOpen = await form().isVisible().catch(() => false);
        const s = await snap(`${name}-saved`);
        out.screenNotices = (s.notices || []).map((x) => (typeof x === 'string' ? x : x.text || JSON.stringify(x)));
        if (out.windowOpen) {
            out.marks = await marks();
            const first = seen[0];
            if (first) out.noticeGoneMs = await noticeGone(first.text.slice(0, 30));
            out.marksAfterNotice = await marks();
            await snap(`${name}-after-notice`);
            out.dialogText = squash(await form().innerText()).slice(0, 600);
        }
        out.notices = [...seen];
        out.futureRows = await futureRows();
        out.issuesTable = issues();
        return out;
    }
    async function cancel() {
        if (await form().isVisible().catch(() => false)) {
            await form().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await idle(page); await pause(800);
        }
    }

    try {
        await signIn(page, 'dbarnes');                                   // step 1
        await idle(page);
        await land();                                                    // step 2
        fact('before', {futureRows: await futureRows(), issuesTable: issues()});
        if (PHASE === 'steps') {
            fact('step 3 arrived ticked', await open('step3'));          // step 3
            await fill({boxes: {volume: '3', number: '1', year: '2026'}}); // step 4
            fact('step 5 save', await save('step5'));                    // step 5
            // control: untick "Title", "Save" again in the same window
            await fill({ticks: {showTitle: false}});
            fact('control untick title', await save('control'));
            await cancel();
            await snap('list');
        } else {
            fact('N1 all ticked with a title', await (async () => {
                const arrived = await open('n1');
                await fill({boxes: {volume: '4', number: '1', year: '2026', title: 'u50w26 Special'}});
                return {arrived, ...(await save('n1'))};
            })());
            await cancel();
            fact('N2 volume and title unticked, volume empty', await (async () => {
                await open('n2');
                await fill({boxes: {number: '2', year: '2026'}, ticks: {showVolume: false, showTitle: false}});
                return save('n2');
            })());
            await cancel();
            fact('N3 volume ticked and empty, title unticked', await (async () => {
                await open('n3');
                await fill({boxes: {number: '3', year: '2026'}, ticks: {showTitle: false}});
                return save('n3');
            })());
            await cancel();
            fact('N4 no box ticked', await (async () => {
                await open('n4');
                await fill({boxes: {volume: '5', number: '1', year: '2026'}, ticks: {showVolume: false, showNumber: false, showYear: false, showTitle: false}});
                return save('n4');
            })());
            await cancel();
        }
    } finally {
        record(PHASE === 'steps' ? 'walk' : 'neighbour', facts);
        await close();
    }
});
