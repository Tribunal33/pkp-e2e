// Kept walk for docs/issues/U30-A4-request-author-response-typed-address-returns-nowhere.md (spec U30, register A4).
// On PKP's default test dataset (a dataset fleet), as dbarnes:
//   OJS submission 10 (Review round 1, both reviews in): the control, "Request Response" on the "Author Response"
//   table and "Cancel"; then the "Request Author Response" page by its typed address: "Cancel", "Submit Request"
//   and the sent dialog's control, Escape on the dialog.
//   OMP submission 16 (External Review round 1, one review in; a press shows no "Author Response" table): the
//   typed address, the same three.
//   OPS: the typed address with stageId=3 (a preprint server has no review stage): what shows.
// Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u30c node bin/probe.js all \
//     shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial (OJS): the page reached through "Request
// Response" (its address carries `ret`) still returns to the round it came from on "Cancel" and through the sent
// dialog's "View Submission Summary".
// Each "Submit Request" sends the request email; the author's mailbox is counted by subject since the walk began.
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const SUBJECT = 'Request For Author Response To Reviewer Feedback';
const CASES = {
    ojs: {id: 10, stage: 'Review', round: 8, author: 'jnovak', table: true},
    omp: {id: 16, stage: 'External Review', round: 18, author: 'mpower', table: false},
    ops: {id: 1, stage: null, round: 1, author: 'ccorino', table: false},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U30 A4 walk (${app.name}, ${facts.line}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const typed = (round) => app.url(`/index.php/${app.contextPath}/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=${round}&submissionId=${c.id}`);
    const since = new Date();
    const {page} = await launch(app);
    await signIn(page, 'dbarnes');

    if (app.name === 'ops') {
        if (MODE !== 'steps') return;
        await step('ops-typed', async () => {
            await page.goto(typed(c.round));
            return K.waitLoaded(page);
        });
        record('a4-summary', facts);
        return;
    }

    if (MODE === 'neighbour') {
        if (!c.table) return; // a press has no "Request Response": nothing reaches the page with `ret`
        await step('n1-open', () => K.openRound(page, app, c.id, c.stage));
        await step('n2-request-response', async () => {
            await new (K.P().AuthorResponseTable)(page).requestResponseButton().click();
            return K.waitLoaded(page);
        });
        await step('n3-cancel', () => K.cancel(page, 'nb-n3-cancel'));
        await step('n4-request-response-again', async () => {
            await K.openRound(page, app, c.id, c.stage);
            await new (K.P().AuthorResponseTable)(page).requestResponseButton().click();
            return K.waitLoaded(page);
        });
        await step('n5-submit', () => K.submit(page, 'nb-n5-sent'));
        await step('n6-view-submission-summary', () => K.pressDialogControl(page, 'View Submission Summary', 'nb-n6-after'));
        record('a4-neighbour', facts);
        return;
    }

    // the round id, read from the address bar with the round chosen in the workflow menu
    const opened = await step('s2-open-round', () => K.openRound(page, app, c.id, c.stage));
    const round = (opened && opened.roundId) || c.round;
    facts.roundUsed = round;

    if (c.table) {
        await step('s3-control-request-response', async () => {
            await new (K.P().AuthorResponseTable)(page).requestResponseButton().click({timeout: K.T});
            return K.waitLoaded(page);
        });
        await step('s4-control-cancel', () => K.cancel(page, 's4-control-cancel'));
    }

    await step('s5-typed-address', async () => {
        await page.goto(typed(round));
        return K.waitLoaded(page);
    });
    if (!facts['s5-typed-address'] || !facts['s5-typed-address'].page) {
        record('a4-summary', facts); // no request page on this line
        return;
    }
    await step('s6-cancel', () => K.cancel(page, 's6-cancel'));

    await step('s7-typed-again-submit', async () => {
        await page.goto(typed(round));
        const loaded = await K.waitLoaded(page);
        return {loaded, sent: await K.submit(page, 's7-sent')};
    });
    const ctl = ((facts['s7-typed-again-submit'] || {}).sent || {}).controls || [];
    const label = (ctl.find((x) => x.label && x.label !== 'Close') || {}).label || 'View Submission';
    const pressed = await step('s7b-press-control', () => K.pressDialogControl(page, label, 's7b-after-control'));
    if (pressed && pressed.moved) {
        // the control took the page away (a fix applied): the Escape step needs the dialog once more
        await step('s8-typed-third-submit', async () => {
            await page.goto(typed(round));
            await K.waitLoaded(page);
            return K.submit(page, 's8-sent');
        });
    }
    await step('s8-escape', () => K.escapeDialog(page, 's8-escape'));

    await K.sleep(3000);
    await step('mails', async () => {
        const host = new URL(app.baseURL).host;
        const to = `${c.author}@mailinator.com`;
        await app.mail.find({to, subject: SUBJECT, since}).catch(() => null);
        return {thisInstall: await app.mail.count({to, subject: SUBJECT, contains: host, since}), anyInstall: await app.mail.count({to, subject: SUBJECT, since})};
    });
    record('a4-summary', facts);
});
