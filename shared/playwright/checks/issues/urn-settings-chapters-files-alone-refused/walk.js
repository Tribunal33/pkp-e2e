// Issue report docs/issues/U44-OMP1-urn-settings-chapters-files-alone-refused.md (U44 OMP1): a press that
// ticks only "Chapters", only "Files", or only those two under "Press Content" in the URN settings window
// is refused with "Please choose the objects URNs should be assigned to." Takes the report's Steps on PKP's
// default test dataset (a dataset fleet), as `dbarnes`:
//   OMP  1-4  sign in; Settings › Website › "Plugins": "URN" enabled; the row's arrow, "Settings"
//        5-6  "Chapters" only; prefix, namespace, resolver; "Save"
//        7    "Files" only; "Save"
//        8    "Chapters" and "Files"; "Save"
//        c    control: "Publication Formats" as well; "Save"
//   OJS  control only: "Galleys" alone under "Journal Content"; "Save" (OPS has no URN plugin).
// Each "Save" records its outcome (refused with the top list, or saved with the notice) and, after a
// save, the boxes as the reopened window shows them. A save that goes through reopens the window, so the
// walk takes the state the fix brings without throwing.
// WALK=neighbour runs alone (fix in and out), OMP only: nothing ticked, "Save" (must stay refused); then
// "Monographs" alone, "Save" (must still save).
//
// Reset first:  npm run fleet-prep -- --feature issues-u44n --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u44n PROBE_AGENT=u44n node bin/probe.js all shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44n-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44n-3_5 PROBE_AGENT=u44n node bin/probe.js all shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js
const {forEachApp, launch, signIn, screen, record, idle, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const KINDS = {
    ojs: ['Issues', 'Articles', 'Galleys'],
    omp: ['Monographs', 'Chapters', 'Publication Formats', 'Files'],
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const kinds = KINDS[app.name];
    if (!kinds) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    if (MODE === 'neighbour' && app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: the neighbour check is OMP's`);
        return;
    }
    const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const log = serverLog(app);
    const plugins = new UrnPluginSettings(page, app.contextPath);
    let open = false;

    const boxes = async () =>
        Object.fromEntries(
            await Promise.all(kinds.map(async (k) => [k, await plugins.kindBox(k).isChecked().catch(() => null)]))
        );
    const ensureOpen = async () => {
        if (open) return;
        await plugins.openPlugins();
        await plugins.openSettings();
        open = true;
    };
    // Tick exactly `want` among the window's kind boxes, the rest unticked.
    const tickOnly = async (want) => {
        await ensureOpen();
        for (const k of kinds) await plugins.setKind(k, want.includes(k));
    };
    const fillRest = async () => {
        await plugins.prefixBox().fill('urn:nbn:de:0000-');
        await plugins.namespaceSelect().selectOption('urn:nbn:de');
        await plugins.resolverBox().fill('https://nbn-resolving.de/');
    };
    // Press "Save": refused (the window stays with the top list) or saved (the window closes with the notice).
    const save = async (label) => {
        const from = log.mark();
        const answered = page.waitForResponse(
            (r) => r.request().method() === 'POST' && /\/manage\b/.test(r.url()),
            {timeout: 30_000}
        );
        await plugins.form().getByRole('button', {name: 'Save', exact: true}).click();
        const response = await answered;
        const notice = page.getByText('Your changes have been saved.').first();
        await plugins.formErrors().or(notice).first().waitFor({timeout: 30_000});
        await idle(page);
        const out = {status: response.status(), serverLog: log.since(from)};
        if (await plugins.formErrors().isVisible()) {
            out.outcome = 'refused';
            out.top = (await plugins.formErrors().innerText()).trim();
            out.boxesAfter = await boxes();
            record(name(`${label}-refused`), await screen(page));
        } else {
            out.outcome = 'saved';
            out.notice = (await notice.innerText()).trim();
            open = false;
            await ensureOpen();
            out.boxesOnReopen = await boxes();
            record(name(`${label}-reopened`), await screen(page));
        }
        fact(label, out);
        return out;
    };
    const step = async (label, want) => {
        try {
            await tickOnly(want);
            await fillRest();
            await save(label);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
    };

    try {
        await signIn(page, 'dbarnes');
        await plugins.openPlugins();
        facts.wasEnabled = await plugins.enabledBox().isChecked();
        if (!facts.wasEnabled) await plugins.setEnabled(true);
        await ensureOpen();
        facts.boxesOnOpen = await boxes();
        record(name('4-settings'), await screen(page));

        if (app.name === 'ojs') {
            await step('c Galleys alone', ['Galleys']);
        } else if (MODE === 'neighbour') {
            await step('n1 nothing ticked', []);
            await step('n2 Monographs alone', ['Monographs']);
        } else {
            await step('6 Chapters alone', ['Chapters']);
            await step('7 Files alone', ['Files']);
            await step('8 Chapters and Files', ['Chapters', 'Files']);
            await step('c with Publication Formats', ['Chapters', 'Files', 'Publication Formats']);
        }
        facts.pageErrors = pageErrors;
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
