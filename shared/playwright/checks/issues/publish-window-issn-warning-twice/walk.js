// Issue report docs/issues/U45-OJS3-publish-window-issn-warning-twice.md
// (U45 OJS3): with Crossref chosen and neither ISSN saved, the publish
// confirmation window lists the ISSN warning twice. Takes the report's Steps
// through the screens on a dataset fleet freshly reset to PKP's default test
// dataset:
//   1. sign in as dbarnes
//   2. Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   3. Settings › Distribution › "DOIs" › "Registration": Crossref, depositor
//      name and email, "Save"
//   4. Settings › Journal › "Masthead": empty "Online ISSN" and "Print ISSN",
//      "Save"
//   5. open submission 5, "Genetic transformation of forest trees"
//      (Production), its "Title & Abstract" page under "Publication":
//      "Schedule For Publication"
//   6. "Review Publishing Details": the empty required boxes filled
//      ("Version of Record", the major revision, "Don't Assign To An
//      Issue"), "Confirm"
//   7. read the confirmation window's warning list; close it, nothing is
//      published.
// KEEP=print or KEEP=online is the neighbour the fix must leave alone: step 4
// empties only the other box, and the window must list no ISSN line, with
// fix.diff in and out. (KEEP=none, the default, is the Steps.)
// OJS only: a preprint server's Crossref plugin adds no publish warnings and
// a press has no Crossref plugin.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir17 node bin/probe.js ojs shared/playwright/checks/issues/publish-window-issn-warning-twice/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir1-3_5,
// and PROBE_RUN=r35 in front of the run. There step 6 is the window "Select
// an issue to schedule for publication": "Vol. 1 No. 2 (2014)", "Save".
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const KEEP = process.env.KEEP || 'none';
const SID = 5;
const ISSN_LINE = 'Either an online ISSN or print ISSN must be provided before submissions can be deposited with Crossref.';
const HEADING = 'The following issues were found, but will not prevent publishing';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[walk] ${app.name}: no Crossref publish warnings, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublishScreen} = require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const pre = KEEP === 'none' ? 'walk' : `keep-${KEEP}`;
    const facts = {app: app.name, line: app.line || 'main', keep: KEEP, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const stored = () => sql(app, `select setting_name || '=' || coalesce(setting_value, '') from journal_settings where setting_name in ('onlineIssn','printIssn','publisherInstitution','registrationAgency','doiCreationTime','enabledDoiTypes') order by 1`).split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    try {
        fact('0 dataset', stored());
        // 1
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, ctx);

        // 2
        await settings.gotoPlugins('crossrefplugin');
        await settings.setPluginEnabled('crossrefplugin', true);
        fact('2 plugin on', await settings.pluginBox('crossrefplugin').isChecked());

        // 3
        await settings.goto('Registration');
        await settings.chooseAgency('Crossref');
        for (const [name, value] of Object.entries({depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'})) {
            await expect(settings.field(name)).toBeVisible({timeout: T});
            await settings.field(name).fill(value);
        }
        const r3 = await settings.save(settings.registration);
        fact('3 registration save', {status: r3.status(), agency: (await settings.agencyState()).value});

        // 4
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${ctx}/en/management/settings/context#masthead`));
        await idle(page);
        const online = page.locator('input[name="onlineIssn"]');
        const print = page.locator('input[name="printIssn"]');
        await expect(online).toBeVisible({timeout: T});
        const form = page.locator('form').filter({has: online});
        const labels = await form.evaluate((f) => ['onlineIssn', 'printIssn', 'publisherInstitution'].map((n) => {
            const box = f.querySelector(`[name="${n}"]`);
            const label = box && box.id ? f.querySelector(`label[for="${box.id}"]`) : null;
            return `${n}: ${label ? (label.textContent || '').replace(/\s+/g, ' ').trim() : '?'} = ${box ? /** @type {HTMLInputElement} */ (box).value : '?'}`;
        }));
        if (KEEP !== 'online') await online.fill('');
        if (KEEP !== 'print') await print.fill('');
        const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r4 = await saved;
        await idle(page);
        record(`${pre}-4-masthead`, await screen(page));
        fact('4 masthead save', {before: labels, status: r4.status(), stored: stored()});

        // 5
        const frame = new WorkflowPage(page, ctx);
        await frame.gotoEditorial(SID);
        await idle(page);
        await sleep(1500);
        const s5 = await screen(page);
        record(`${pre}-5-workflow`, s5);
        fact('5 workflow', {dialog: flat(s5.text && s5.text.dialog, 300)});

        const pages = frame.menuLink('Title & Abstract');
        await expect(pages.last()).toBeVisible({timeout: T});
        await pages.last().click();
        await frame.expectVersionLoaded().catch(() => {});
        await idle(page);

        const publish = new PublishScreen(page, ctx);
        const window = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule) this/}).last();
        const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        fact('5 button', flat(await button.innerText().catch(() => null), 60));
        let panel = null;
        if ((app.line || 'main') === 'main') {
            panel = await publish.pressPublish({or: window});
        } else {
            // 3.5: the press asks for an issue first ("Select an issue to
            // schedule for publication"): "Vol. 1 No. 2 (2014)", "Save",
            // and the confirmation window follows.
            await button.click();
            const ask = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
            if (await ask.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false)) {
                const issue = ask.locator('select').first();
                const option = issue.locator('option').filter({hasText: 'Vol. 1 No. 2 (2014)'});
                await expect(option).toHaveCount(1, {timeout: T});
                await issue.selectOption((await option.getAttribute('value')) || '');
                record(`${pre}-6-issue`, await screen(page));
                await ask.getByRole('button', {name: 'Save', exact: true}).click();
                fact('6 issue (3.5)', 'Vol. 1 No. 2 (2014)');
            }
            await idle(page).catch(() => {});
        }
        // 6
        if (panel) {
            const sPanel = await screen(page);
            record(`${pre}-6-panel`, sPanel);
            await shot(page, `${pre}-6-panel`).catch(() => {});
            const filled = [];
            for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
                const box = panel.locator(`select[name="${name}"]`);
                if ((await box.count()) > 0 && (await box.isVisible()) && !(await box.inputValue())) {
                    await box.selectOption(value);
                    filled.push(`${name}: ${flat(await box.locator('option:checked').innerText(), 80)}`);
                }
            }
            const none = panel.getByRole('radio', {name: "Don't Assign To An Issue", exact: true});
            if ((await none.count()) > 0) {
                await none.check();
                filled.push("Don't Assign To An Issue");
            }
            fact('6 panel', {text: flat(await panel.innerText(), 900), filled});
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        }
        // 7
        const opened = await window.waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false);
        await idle(page).catch(() => {});
        await sleep(1000);
        const s7 = await screen(page);
        record(`${pre}-7-window`, s7);
        await shot(page, `${pre}-7-window`).catch(() => {});
        if (!opened) {
            fact('7 window', {opened: false, dialog: flat(s7.text && s7.text.dialog, 1200)});
        } else {
            const text = await window.innerText();
            const items = (await window.locator('.pkpNotification--warning li').allInnerTexts()).map((t) => flat(t, 300));
            fact('7 window', {
                opened: true,
                heading: text.includes(HEADING),
                warnings: items,
                issnLines: items.filter((t) => t === ISSN_LINE).length,
                issnInText: text.split(ISSN_LINE).length - 1,
                text: flat(text, 1500),
                buttons: (await window.getByRole('button').allInnerTexts()).map((t) => flat(t, 40)),
            });
        }
        fact('7 nothing published', sql(app, `select status from publications where submission_id = ${SID}`));
    } finally {
        record(`${pre}-facts`, facts);
        await close();
    }
});
