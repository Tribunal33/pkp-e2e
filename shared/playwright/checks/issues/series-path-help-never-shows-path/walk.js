// Issue report docs/issues/U17-OMP8-series-path-help-never-shows-path.md (U17 OMP8): the help under a series'
// "Path" reads "The series's URL will be: …/catalog/series/Path" whatever path the series has. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), OMP only (no other app has the window):
//   1    sign in as rvaca
//   2    Settings › Press, tab "Series"
//   3-4  "History" › "Edit": the help under "Path" (the box holds "his")
//   5    clear "Path", type "history": the help again
//   6    "Save"
//   7    "History" › "Edit" again: the help under "Path"
// WALK=neighbour runs alone (fix in and out): "Add Series" still shows the sample ending in "Path", and the
// address the help gives on "History" › "Edit" is requested as a visitor would open it. Nothing is saved.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17i --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-u17i PROBE_AGENT=u17i node bin/probe.js omp shared/playwright/checks/issues/series-path-help-never-shows-path/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17i-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17i-3_5 PROBE_AGENT=u17i node bin/probe.js omp shared/playwright/checks/issues/series-path-help-never-shows-path/walk.js
const {forEachApp, launch, signIn, screen, record, idle, serverLog} = require('../../../probe');

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
    const tidy = (t) => String(t || '').replace(/\s+/g, ' ').trim();
    const log = serverLog(app);

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    const series = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    const form = page.locator('form#seriesForm');
    const pathBox = form.locator('input[name="path"]');
    // The "Path" box: its value, its title (the label tied to the box) and the help printed beside it in the
    // box's own wrapper ("The series's URL will be: …"), with the address the help gives.
    const readPath = async () => {
        const id = await pathBox.getAttribute('id');
        const title = id ? tidy(await form.locator(`label[for="${id}"]`).first().innerText().catch(() => '')) : null;
        const help = tidy(await pathBox.locator('xpath=..').innerText().catch(() => ''));
        return {box: await pathBox.inputValue(), title, help, address: (help.match(/https?:\/\/\S+/) || [null])[0]};
    };
    let win = null;
    const cancel = async () => {
        if (await form.isVisible().catch(() => false)) {
            await win.cancelLink().click().catch(() => null);
            await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
        }
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
        await step('2 Settings › Press, "Series"', async () => {
            await series.goto();
            return {rows: (await series.titleCells().allInnerTexts()).map(tidy)};
        });
        if (MODE !== 'neighbour') {
            await step('3 "History" › Edit', async () => {
                win = await series.openEdit('History');
                return {heading: tidy(await win.heading().innerText().catch(() => ''))};
            });
            await step('4 the help under "Path"', readPath);
            record('edit-history', await screen(page));
            await step('5 clear "Path", type "history"', async () => {
                await pathBox.fill('');
                await pathBox.pressSequentially('history');
                return readPath();
            });
            await step('6 Save', async () => {
                const from = log.mark();
                const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /update-series/.test(r.url()), {timeout: 20_000});
                await win.saveButton().click();
                const response = await answered;
                await form.waitFor({state: 'hidden', timeout: 10_000}).catch(() => null);
                return {status: response.status(), windowOpen: await form.isVisible().catch(() => false), serverLog: log.since(from)};
            });
            await step('7 "History" › Edit again: the help under "Path"', async () => {
                await series.goto();
                win = await series.openEdit('History');
                return readPath();
            });
            record('edit-history-saved', await screen(page));
        } else {
            await step('N1 Add Series: the help under "Path"', async () => {
                win = await series.openAdd();
                return readPath();
            });
            record('neighbour-add', await screen(page));
            await cancel();
            await step('N2 "History" › Edit: the help, and its address opened', async () => {
                win = await series.openEdit('History');
                const read = await readPath();
                let opened = null;
                if (read.address) {
                    const r = await page.request.get(read.address, {maxRedirects: 0}).catch((e) => ({error: String(e.message)}));
                    opened = r.error ? r : {status: r.status(), title: ((await r.text()).match(/<title>([^<]*)<\/title>/) || [null, null])[1]};
                    if (opened.title) opened.title = tidy(opened.title);
                }
                return {...read, opened};
            });
            record('neighbour-edit', await screen(page));
        }
        await step('end Cancel', cancel);
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
