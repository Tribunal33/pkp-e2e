// Issue report docs/issues/U44-A8-urn-suffix-pattern-spaces-raw-text-code.md (U44 A8): in the URN plugin's
// settings window, with "Use the pattern entered below…" chosen, a ticked kind's pattern box holding only a
// space is refused with a text code ("##plugins.pubIds.urn.manager.settings.form.urn…SuffixPatternRequired##")
// instead of "Please enter the URN suffix pattern for …". Takes the report's Steps on PKP's default test
// dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no URN plugin):
//   1-4  sign in; Settings › Website › "Plugins": "URN" enabled; the row's arrow, "Settings"
//   5    every kind under "Journal Content" ("Press Content") ticked
//   6    prefix, namespace, resolver
//   7    "Use the pattern entered below…"
//   8    one space in every pattern box
//   9    "Save": the messages under the boxes, at the top of the window, and anywhere else on the page
//   10   control: "Save" again (the refusal brought the boxes back empty): the browser's own refusal, nothing sent
// WALK=neighbour runs alone (fix in and out): steps 1-7, then a real pattern in every box and "Save", which
// must save as before.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44l --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u44l PROBE_AGENT=u44l node bin/probe.js all shared/playwright/checks/issues/urn-suffix-pattern-spaces-raw-text-code/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44l-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44l-3_5 PROBE_AGENT=u44l node bin/probe.js all shared/playwright/checks/issues/urn-suffix-pattern-spaces-raw-text-code/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
// Each app's kinds (the box under "Journal Content" / "Press Content") and their pattern boxes.
const APP = {
    ojs: {
        kinds: [
            {label: 'Issues', box: 'urnIssueSuffixPattern', pattern: '%j.v%vi%i'},
            {label: 'Articles', box: 'urnPublicationSuffixPattern', pattern: '%j.v%vi%i.%a'},
            {label: 'Galleys', box: 'urnRepresentationSuffixPattern', pattern: '%j.v%vi%i.%a.g%g'},
        ],
        control: 'urnPublicationSuffixPattern',
    },
    omp: {
        kinds: [
            {label: 'Monographs', box: 'urnPublicationSuffixPattern', pattern: '%p.%m'},
            {label: 'Chapters', box: 'urnChapterSuffixPattern', pattern: '%p.%m.c%c'},
            {label: 'Publication Formats', box: 'urnRepresentationSuffixPattern', pattern: '%p.%m.%f'},
            {label: 'Files', box: 'urnSubmissionFileSuffixPattern', pattern: '%p.%m.%f.%s'},
        ],
        control: 'urnPublicationSuffixPattern',
    },
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
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };

    const {page, close} = await launch(app);
    const plugins = new UrnPluginSettings(page, app.contextPath);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page);
    };
    // Every visible message the refusal left: under each box, the list at the top, and anything outside the form.
    const messages = () =>
        page.evaluate(() => {
            const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const form = document.querySelector('#urnSettingsForm');
            const under = {};
            if (form) {
                form.querySelectorAll('label.error').forEach((l) => {
                    const key = (l.getAttribute('for') || '?').replace(/-[0-9a-f]+$/, '');
                    if (visible(l)) (under[key] = under[key] || []).push(l.textContent.trim());
                });
            }
            const top = form ? [...form.querySelectorAll('#formErrors li')].filter(visible).map((li) => li.textContent.trim()) : [];
            // Text on the page outside the form that reads like one of these messages (the notice at the top right).
            const outside = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                const t = n.textContent.trim();
                if (!t || !/##plugins\.pubIds\.urn|URN suffix pattern|field is required/.test(t)) continue;
                const el = n.parentElement;
                if (!el || !visible(el) || (form && form.contains(el))) continue;
                outside.push({text: t.slice(0, 300), in: (el.closest('[class]') || el).className.toString().slice(0, 80)});
            }
            return {under, top, outside};
        });
    // Count the posts a "Save" sends.
    let sent = 0;
    page.on('request', (r) => {
        if (r.method() === 'POST' && /\/manage\b|verb=save/.test(r.url())) sent += 1;
    });

    try {
        await step('1 sign in', () => signIn(page, 'dbarnes'));
        await step('2 plugins', () => plugins.openPlugins());
        const wasEnabled = await plugins.enabledBox().isChecked();
        facts.wasEnabled = wasEnabled;
        await step('3 enable URN', async () => {
            if (!wasEnabled) await plugins.setEnabled(true);
            return {wasEnabled};
        });
        await step('4 open settings', () => plugins.openSettings());
        await step('5 kinds ticked', async () => {
            for (const k of a.kinds) await plugins.setKind(k.label, true);
            return a.kinds.map((k) => k.label);
        });
        await step('6 prefix, namespace, resolver', async () => {
            await plugins.prefixBox().fill('urn:nbn:de:0000-');
            await plugins.namespaceSelect().selectOption('urn:nbn:de');
            await plugins.resolverBox().fill('https://nbn-resolving.de/');
        });
        await step('7 pattern choice', async () => {
            await plugins.suffixRadio('pattern').check();
            return plugins
                .form()
                .locator('input[type=text][name$="SuffixPattern"]')
                .evaluateAll((els) => Object.fromEntries(els.map((e) => [e.name, e.disabled ? 'greyed' : 'editable'])));
        });

        if (MODE === 'neighbour') {
            await step('n8 real patterns', async () => {
                for (const k of a.kinds) await plugins.form().locator(`input[name="${k.box}"]`).fill(k.pattern);
            });
            await step('n9 save', async () => {
                const from = sent;
                try {
                    await plugins.saveAccepted();
                    return {saved: true, sent: sent - from};
                } catch (e) {
                    return {saved: false, sent: sent - from, error: String(e.message).split('\n')[0], messages: await messages()};
                }
            });
            record(name('neighbour'), await screen(page));
        } else {
            await step('8 one space in each box', async () => {
                for (const k of a.kinds) await plugins.form().locator(`input[name="${k.box}"]`).fill(' ');
            });
            await step('9 save', async () => {
                const from = sent;
                try {
                    await plugins.saveRefusedByServer();
                } catch (e) {
                    return {refused: false, sent: sent - from, error: String(e.message).split('\n')[0], windowOpen: (await plugins.form().count()) > 0};
                }
                return {refused: true, sent: sent - from, ...(await messages())};
            });
            record(name('9-refused'), await screen(page));
            await step('9a pattern boxes after the refusal', () =>
                plugins
                    .form()
                    .locator('input[type=text][name$="SuffixPattern"]')
                    .evaluateAll((els) => Object.fromEntries(els.map((e) => [e.name, JSON.stringify(e.value)])))
            );
            await step('10 control: save again', async () => {
                const from = sent;
                await plugins.form().getByRole('button', {name: 'Save', exact: true}).click();
                // The browser rewrites the label under each box; wait for its text, not the label (the server's is already there).
                await plugins
                    .fieldError(a.control)
                    .filter({hasText: 'This field is required.'})
                    .first()
                    .waitFor({state: 'visible', timeout: 15_000})
                    .catch(() => null);
                await idle(page);
                return {sent: sent - from, windowOpen: (await plugins.form().count()) > 0, ...(await messages())};
            });
            record(name('10-control'), await screen(page));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
