// Issue report docs/issues/U17-OMP7-series-issn-help-which-identifying.md (U17 OMP7): the paragraph above a
// series' ISSN boxes reads "…an eight-digit number which identifying periodical publications…". Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), OMP only (no other app has the window):
//   1    sign in as rvaca
//   2-3  Settings › Press, tab "Series"
//   4-5  "Add Series": the paragraph under "ISSN"
//   6    "Cancel", then "Library & Information Studies" › "Edit": the same paragraph
// WALK=neighbour runs alone (fix in and out): in the "Add Series" window the paragraph's link "ISSN
// International Centre" still goes to https://www.issn.org, and the help under "Order of monographs" is
// unchanged. Nothing is saved.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17h --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u17h PROBE_AGENT=u17h node bin/probe.js omp shared/playwright/checks/issues/series-issn-help-which-identifying/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17h-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17h-3_5 PROBE_AGENT=u17h node bin/probe.js omp shared/playwright/checks/issues/series-issn-help-which-identifying/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') return;
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const tidy = (t) => t.replace(/\s+/g, ' ').trim();

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
    const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    const form = page.locator('form#seriesForm');
    // The ISSN section: the paragraph (the fbvFormSection's description) and the two boxes' labels.
    const issnSection = () => form.locator('.section').filter({has: page.locator('[name="onlineIssn"]')}).first();
    const readIssn = async () => {
        const section = issnSection();
        const paragraph = section.locator('label.description').first();
        return {
            paragraph: tidy(await paragraph.innerText()),
            section: tidy(await section.innerText()),
        };
    };
    let win = null;

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
        await step('2-3 Settings › Press, "Series"', async () => {
            await series.goto();
            return {rows: (await series.titleCells().allInnerTexts()).map(tidy)};
        });
        await step('4 Add Series', async () => {
            win = await series.openAdd();
            return {heading: tidy(await win.heading().innerText().catch(() => ''))};
        });
        if (MODE !== 'neighbour') {
            await step('5 the paragraph under "ISSN" (Add Series)', readIssn);
            record('add-series', await screen(page));
            await step('6a Cancel', async () => {
                await win.cancelLink().click();
                await form.waitFor({state: 'hidden', timeout: 10_000});
            });
            await step('6b "Library & Information Studies" › Edit', async () => {
                win = await series.openEdit('Library & Information Studies');
                return {heading: tidy(await win.heading().innerText().catch(() => ''))};
            });
            await step('6c the paragraph under "ISSN" (Edit)', readIssn);
            record('edit-series', await screen(page));
        } else {
            await step('N1 the paragraph\'s link', async () => {
                const link = issnSection().getByRole('link', {name: 'ISSN International Centre', exact: true});
                return {count: await link.count(), href: await link.getAttribute('href'), target: await link.getAttribute('target')};
            });
            await step('N2 the help under "Order of monographs"', async () => {
                const section = form.locator('.section').filter({has: page.locator('[name="sortOption"]')}).first();
                return tidy(await section.innerText());
            });
            record('neighbour', await screen(page));
        }
        await step('end Cancel', async () => {
            if (await form.isVisible().catch(() => false)) {
                await win.cancelLink().click();
                await form.waitFor({state: 'hidden', timeout: 10_000});
            }
        });
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
