// Issue report docs/issues/U48-A1-jats-make-available-offered-then-refused.md (U48 A1): on a version's
// "JATS XML" page an assigned Layout Editor whose "Permissions" box is unticked is offered "Make
// available with publication", and "Confirm" is refused. Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), OJS only (the page is a journal's):
//   1-3  `gcox` (Layout Editor on submission 5, "Permissions" unticked in the dataset): open
//        submission 5, Publication › "JATS XML"
//   4    what the box's heading row offers
//   5-6  tick "Make available with publication" › "Confirm"; the "Error" window, "OK"; the box
//   7    reload, "JATS XML" again; the box
// WALK=neighbour runs alone (fix in and out): steps 1-7 as `dbuskins` (Section editor on submission
// 5, "Permissions" ticked in the dataset); the box must stay offered and the tick must hold.
// A fix that greys the box is recorded, not thrown on: step 5 presses only an enabled box.
//
// Reset first:  npm run fleet-prep -- --feature issues-u48r3 --dataset 3 --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r3 PROBE_AGENT=u48r3 node bin/probe.js ojs shared/playwright/checks/issues/jats-make-available-offered-then-refused/walk.js
// 3.5, 3.4, 3.3: not walked; they have no "Make available with publication" box (the report's Affects, read in the code).
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {sleep, errorWindow, pressAndAnswer, openPage, boxState} = require('./lib');

const MODE = process.env.WALK || 'walk';
const SID = 5;
const isVisibility = (r) => /\/jats\/visibility/.test(r.url()) && r.request().method() !== 'GET';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `u48r3-jats-${s}${run}`;
    const who = MODE === 'neighbour' ? 'dbuskins' : 'gcox';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, who};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath);
    const jats = new JatsPage(page, frame);
    const openJats = async () => {
        await frame.gotoEditorial(SID);
        await idle(page).catch(() => {});
        const r = await openPage(frame, 'JATS XML');
        await jats.ready().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        return r;
    };

    try {
        // 1-3
        await signIn(page, who);
        fact('3 JATS XML reached', await openJats());
        // 4
        fact('4 buttons', await jats.buttonLabels());
        fact('4 box', await boxState(jats));
        record(name('04-page'), await screen(page));
        // 5-6
        const before = await boxState(jats);
        if (before.present && !before.disabled) {
            let windowText = null;
            const answer = await pressAndAnswer(page, isVisibility, async () => {
                const dialog = await jats.pressMakePublic(!before.checked);
                windowText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
                await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
            });
            fact('5 window', windowText);
            fact('5 save answer', answer);
            fact('6 error window', await errorWindow(page));
            await idle(page).catch(() => {});
            await sleep(800);
            fact('6 box after', await boxState(jats));
            record(name('06-after-confirm'), await screen(page));
        } else {
            fact('5 box not pressed', before);
        }
        // 7
        await page.reload();
        await idle(page).catch(() => {});
        fact('7 JATS XML reached again', await openJats());
        fact('7 box after reload', await boxState(jats));
        record(name('07-after-reload'), await screen(page));
        await signOut(page);
    } finally {
        record(name('facts'), facts);
        await idle(page).catch(() => {});
        await close();
    }
});
