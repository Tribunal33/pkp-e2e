// Issue report docs/issues/U44-A11-urn-settings-pattern-choice-script-error.md (U44 A11): while the URN
// settings window's "Use the pattern entered below…" choice is selected, every press of a box or a choice
// in the window, and the window's opening once that choice is stored, raises a page error from
// URNSettingsFormHandler.js. Takes the report's Steps on PKP's default test dataset (a dataset fleet), as
// `dbarnes`, on OJS and OMP (OPS has no URN plugin):
//   1-3  sign in; Settings › Website › "Plugins": "URN" enabled
//   5    the row's arrow, "Settings" (default choice)
//   6    "Use the pattern entered below…"
//   7    "Articles" (press "Monographs")
//   8    "Check Number"
//   9    prefix, "for articles" (press "for monographs"), namespace, resolver, "Save"
//   10   Settings › Website › "Plugins" again, the arrow, "Settings"
// Each step records the page errors it raised and the pattern boxes' greyed state.
// WALK=neighbour runs alone (fix in and out): steps 1-5, then the pattern choice, "Articles" untick, tick,
// "Use default patterns.": the pattern boxes' greyed state after each press, which the fix must not change.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44h --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u44h PROBE_AGENT=u44h node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44h-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44h-3_5 PROBE_AGENT=u44h node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {kind: 'Articles', pattern: '%j.%a'},
    omp: {kind: 'Monographs', pattern: '%p.%m'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    if (!a) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
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
    const errors = [];
    let current = 'before';
    page.on('pageerror', (e) => {
        const frames = String(e.stack || '').split('\n').filter((l) => /\.js/.test(l));
        const at = frames.find((l) => /URNSettingsFormHandler/.test(l)) || frames[0] || '';
        errors.push({step: current, message: e.message, at: at.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^/]+/, '')});
    });
    const plugins = new UrnPluginSettings(page, app.contextPath);
    const boxes = async () =>
        plugins
            .form()
            .locator('input[type=text][name$="SuffixPattern"]')
            .evaluateAll((els) => Object.fromEntries(els.map((e) => [e.name, e.disabled ? 'greyed' : 'editable'])))
            .catch(() => null);
    // Each step: its action, then what it raised and how the pattern boxes stand.
    const step = async (label, action) => {
        current = label;
        const from = errors.length;
        try {
            await action();
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page);
        const raised = errors.slice(from);
        fact(label, {pageErrors: raised.length, first: raised[0] || null, patternBoxes: await boxes()});
    };

    try {
        await step('1 sign in', () => signIn(page, 'dbarnes'));
        await step('2 plugins', () => plugins.openPlugins());
        const wasEnabled = await plugins.enabledBox().isChecked();
        await step('3 enable URN', async () => {
            if (!wasEnabled) await plugins.setEnabled(true);
        });
        facts.wasEnabled = wasEnabled;
        await step('5 open settings', () => plugins.openSettings());
        record(name('5-settings'), await screen(page));
        await step('6 pattern choice', () => plugins.suffixRadio('pattern').check());

        if (MODE === 'neighbour') {
            await step('n1 kind ticked', () => plugins.setKind(a.kind, true));
            await step('n2 kind unticked', () => plugins.setKind(a.kind, false));
            await step('n3 kind ticked again', () => plugins.setKind(a.kind, true));
            await step('n4 default choice', () => plugins.suffixRadio('default').check());
            await step('n5 kind unticked under default', () => plugins.setKind(a.kind, false));
            record(name('neighbour'), await screen(page));
        } else {
            await step('7 kind ticked', () => plugins.setKind(a.kind, true));
            record(name('7-kind'), await screen(page));
            await step('8 check number', () => plugins.checkNumberBox().check());
            await step('9 save', async () => {
                await plugins.prefixBox().fill('urn:nbn:de:0000-');
                await plugins.form().locator('input[name="urnPublicationSuffixPattern"]').fill(a.pattern);
                await plugins.namespaceSelect().selectOption('urn:nbn:de');
                await plugins.resolverBox().fill('https://nbn-resolving.de/');
                await plugins.saveAccepted();
            });
            await step('10 reopen settings', async () => {
                await plugins.openPlugins();
                await plugins.openSettings();
            });
            facts.reopenedChoice = await plugins.suffixRadio('pattern').isChecked().catch(() => null);
            record(name('10-reopened'), await screen(page));
        }
        facts.pageErrors = errors;
        facts.total = errors.length;
        console.log(`[fact] ${app.name} total page errors: ${errors.length}`);
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
