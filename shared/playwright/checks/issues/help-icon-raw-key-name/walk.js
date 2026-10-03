// Issue report docs/issues/U08-A1-help-icon-raw-key-name.md (U08 A1): the report's Steps to reproduce,
// walked through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// as the dataset's `dbarnes` (Journal editor) and an Author (`ccorino`; `aclark` on OMP), on its own context
// `publicknowledge`. Helpers: lib.js. The kit builds nothing.
//
// WALK_MODE=steps (default):
//   1. dbarnes signs in: the page it lands on
//   2. the header's "i" icon: its accessible name, address and target; the bell's name (the control)
//   3. the bell pressed: the "Tasks" window's strip, its "i" icon's name; the window closed
//   4. initials > "Change Language" > "français": the header's "i" icon and bell again
//   5. the Author, in a fresh browser: signs in, the "i" icon's name on the page they land on
// WALK_MODE=neighbour (runs alone; the fix must leave these as they are):
//   N1 dbarnes on the Dashboard, in English and in French: every named control in the header (role and name),
//      and every raw key on the whole page except the help icon's
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u08g --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u08g PROBE_AGENT=u08g node bin/probe.js all shared/playwright/checks/issues/help-icon-raw-key-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 … fleet-prep -- --feature issues-u08g-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08g-3_5 PROBE_AGENT=u08g node bin/probe.js all <this file>
// Neighbour:    WALK_MODE=neighbour PROBE_RUN=nb-out … (and nb-in with the fix applied)
// Facts: .reports/<feature>/u08g/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, rawKeys, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            const v = {failed: String(e).split('\n')[0].slice(0, 300)};
            fact(`${name} FAILED`, v);
            return v;
        }
    };
    const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

    // Every named control in the header (role and name), for the neighbour check.
    const headerControls = async (page) => {
        const aria = await L.header(page).ariaSnapshot();
        return aria.split('\n').map((l) => l.trim()).filter((l) => /^- (link|button)\b/.test(l)).map((l) => l.replace(/:$/, ''));
    };

    try {
        if (MODE === 'steps') {
            let {page, close} = await launch(app);
            await signIn(page, 'dbarnes', {contextPath: ctx});
            await idle(page);
            fact('1 dbarnes signed in', {address: rel(page.url()), title: await page.title()});
            await snap(page, '1-dbarnes-signed-in');

            fact('2 header help', await step('2 header help', () => L.readHelp(L.header(page))));
            fact('2 header bell', await step('2 header bell', () => L.readBell(L.header(page))));
            fact('2 raw keys', await rawKeys(page));

            const strip = await step('3 tasks window', async () => {
                const dialog = await L.openTasksWindow(page);
                await snap(page, '3-tasks-window');
                const help = await L.readHelp(dialog);
                const bell = await L.readBell(dialog);
                const keys = await rawKeys(page, {scope: '[role="dialog"]'});
                await L.closeWindow(page, dialog);
                return {help, bell, rawKeys: keys};
            });
            fact('3 tasks window strip', strip);

            await step('4 change language', () => L.changeLanguage(page, 'français', 'fr_CA'));
            fact('4 french page', {address: rel(page.url()), title: await page.title()});
            fact('4 header help (fr)', await step('4 header help', () => L.readHelp(L.header(page))));
            fact('4 header bell (fr)', await step('4 header bell', () => L.readBell(L.header(page))));
            await snap(page, '4-french');
            await close();

            const author = app.name === 'omp' ? 'aclark' : 'ccorino';
            ({page, close} = await launch(app));
            await signIn(page, author, {contextPath: ctx});
            await idle(page);
            fact(`5 ${author} signed in`, {address: rel(page.url()), title: await page.title()});
            fact(`5 ${author} header help`, await step('5 header help', () => L.readHelp(L.header(page))));
            await snap(page, `5-${author}`);
            await close();
        } else {
            const {page, close} = await launch(app);
            await signIn(page, 'dbarnes', {contextPath: ctx});
            await idle(page);
            const otherKeys = async () => (await rawKeys(page)).filter((k) => !k.startsWith('##common.help##'));
            fact('N1 en header controls', await step('N1 en controls', () => headerControls(page)));
            fact('N1 en help', await step('N1 en help', () => L.readHelp(L.header(page))));
            fact('N1 en other raw keys', await otherKeys());
            await step('N1 change language', () => L.changeLanguage(page, 'français', 'fr_CA'));
            fact('N1 fr header controls', await step('N1 fr controls', () => headerControls(page)));
            fact('N1 fr help', await step('N1 fr help', () => L.readHelp(L.header(page))));
            fact('N1 fr other raw keys', await otherKeys());
            await snap(page, 'N1-french');
            await close();
        }
    } finally {
        record('facts', facts);
    }
});
