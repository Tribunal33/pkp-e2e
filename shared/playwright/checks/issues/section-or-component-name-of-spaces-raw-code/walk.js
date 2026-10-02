// Issue report docs/issues/U17-A6-section-or-component-name-of-spaces-raw-code.md (U17 A6, U58 A10): a
// section's title (a series' title on a press) or a component's name of one space passes the window's own
// required check, and the server's refusal shows a raw text code at the top right
// ("##manager.setup.form.section.nameRequired## (English)", "##manager.setup.form.series.nameRequired##
// (English)", "##manager.setup.form.genre.nameRequired## (English)") instead of a sentence. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `rvaca`, on OJS, OMP and OPS:
//   1    sign in as rvaca
//   2-5  Settings › Journal › "Sections" (Press › "Series", Server › "Sections"), "Create Section" ("Add
//        Series"), one space as the title, the other required boxes filled, "Save"
//   6-9  Settings › Workflow › "Submission" › "Components", "Add a Component", one space as "Name", "Save"
// Each "Save" records the answer, whether the window stays open, the messages under the boxes and in the
// window, and the notices at the top right.
// WALK=neighbour runs alone (fix in and out): the same windows with a real title / name ("u17b section",
// "u17b series", "u17b component") must save and close.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u17b PROBE_AGENT=u17b node bin/probe.js all shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17b-3_5 PROBE_AGENT=u17b node bin/probe.js all shared/playwright/checks/issues/section-or-component-name-of-spaces-raw-code/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
// Per app: the settings tab and its add link, the window's form, the boxes the steps fill besides the title,
// and the components list's title.
const APP = {
    ojs: {tab: 'Sections', add: 'Create Section', formId: 'sectionForm', other: {'abbrev[en]': 'U17B'}, word: 'section', list: 'Article Components'},
    omp: {tab: 'Series', add: 'Add Series', formId: 'seriesForm', other: {path: 'u17b'}, word: 'series', list: 'Monograph Components'},
    ops: {tab: 'Sections', add: 'Create Section', formId: 'sectionForm', other: {'abbrev[en]': 'U17B', path: 'u17b'}, word: 'section', list: 'Preprint Components'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page);
    };
    const noticeSel = '.app__notifications .pkpNotification';
    const markNotices = () =>
        page.evaluate((sel) => document.querySelectorAll(sel).forEach((n) => n.setAttribute('data-u17b-seen', '1')), noticeSel);
    // The notices shown since the last mark, waited for up to `ms`.
    const freshNotices = async (ms) => {
        const fresh = page.locator(`${noticeSel}:not([data-u17b-seen])`);
        await fresh.first().waitFor({state: 'visible', timeout: ms}).catch(() => null);
        return (await fresh.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    };
    // What the window shows after a refusal: open or not, the messages under its boxes and its own error list.
    const windowState = (formId) =>
        page.evaluate((id) => {
            const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const form = document.querySelector(`form#${id}`);
            if (!form || !visible(form)) return {windowOpen: false};
            const under = [...form.querySelectorAll('label.error')].filter(visible).map((l) => ({for: l.getAttribute('for'), text: l.textContent.trim()}));
            const inForm = [...form.querySelectorAll('#formErrors li, .notifyFormError, .pkp_form_error')]
                .filter(visible)
                .map((e) => e.textContent.replace(/\s+/g, ' ').trim());
            return {windowOpen: true, under, inForm};
        }, formId);
    // A "Save" the server answers: the answer, then what the window and the top right show.
    const saveAndRead = async (win, formId) => {
        await markNotices();
        const response = await win.save();
        const notices = await freshNotices(10_000);
        const state = await windowState(formId);
        return {status: response.status(), ...state, notices};
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));

        // Sections [OMP: Series]
        const tab = new SectionsTab(page, app.contextPath, {tab: a.tab, addLabel: a.add, formId: a.formId});
        await step(`2 Settings › ${a.tab}`, async () => {
            await tab.goto();
            return {heading: (await tab.heading().innerText().catch(() => null)), rows: await tab.rows().count()};
        });
        let win = null;
        await step(`3 ${a.add}`, async () => {
            win = await tab.openAdd();
            return {heading: await win.heading().innerText().catch(() => null)};
        });
        const title = MODE === 'neighbour' ? `u17b ${a.word}` : ' ';
        await step(`4 title ${JSON.stringify(title)} and the other required boxes`, async () => {
            await win.type('title[en]', title);
            for (const [box, value] of Object.entries(a.other)) await win.box(box).fill(value);
            return {title, ...a.other};
        });
        await step('5 save', () => saveAndRead(win, a.formId));
        record(name(MODE === 'neighbour' ? 'n5-section' : '5-section'), await screen(page));
        if (MODE !== 'neighbour') {
            // Leave the refused window (nothing was saved) and read any notice that shows late.
            await step('5a cancel the window', async () => {
                await markNotices();
                await win.cancelLink().click().catch(() => null);
                await page.locator(`form#${a.formId}`).waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                return {lateNotices: await freshNotices(3_000)};
            });
        }
        await step(`5b ${a.tab} rows`, async () => {
            await tab.goto();
            return (await tab.titleCells().allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
        });

        // Components
        const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: a.list});
        await step('6 Settings › Workflow › Submission › Components', async () => {
            await settings.goto('Components');
            return {rows: await settings.components.rows().count()};
        });
        let cwin = null;
        await step('7 Add a Component', async () => {
            cwin = await settings.components.openAdd();
            return {heading: await cwin.heading().innerText().catch(() => null)};
        });
        const cname = MODE === 'neighbour' ? 'u17b component' : ' ';
        await step(`8 name ${JSON.stringify(cname)}`, () => cwin.typeName(cname));
        await step('9 save', () => saveAndRead(cwin, 'genreForm'));
        record(name(MODE === 'neighbour' ? 'n9-component' : '9-component'), await screen(page));
        if (MODE !== 'neighbour') {
            await step('9a cancel the window', async () => {
                await markNotices();
                await cwin.cancelLink().click().catch(() => null);
                await page.locator('form#genreForm').waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                return {lateNotices: await freshNotices(3_000)};
            });
        }
        await step('9b component names', async () => {
            await settings.goto('Components');
            return settings.components.names();
        });
    } finally {
        record(name(MODE === 'neighbour' ? 'neighbour-facts' : 'facts'), facts);
        await close();
    }
});
