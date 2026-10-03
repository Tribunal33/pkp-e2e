// Kept walk for docs/issues/U30-A1-author-response-request-leaves-no-trace.md (spec U30, register A1).
// On PKP's default test dataset (a dataset fleet), OJS: dbarnes sends "Request Response" on submission 10's
// ready Review round and reads the "Author Response" table again; dbuskins, another editor of the
// submission, reads the same table and sends a second request; the author jnovak reads the "Notifications"
// list and the "Author Response" card; the author's mailbox is counted; dbarnes reads the "Activity Log". Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u30a node bin/probe.js ojs \
//     shared/playwright/checks/issues/author-response-request-leaves-no-trace/walk.js
// (`all` works too: a press shows no "Author Response" table and a preprint server has no review; both are skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: submission 13 (ready, never asked) still
// reads "Ready to invite author" with the button enabled; submission 7 (reviews outstanding) still reads
// "Awaiting reviews" with the button greyed; on submission 10, after one request and the author's response,
// the table reads "A response was submitted by John Novak" with the button greyed.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const SUBJECT = 'Request For Author Response To Reviewer Feedback';
const CASES = {
    ojs: {ready: 10, author: {user: 'jnovak', name: 'John Novak'}, colleague: 'dbuskins', readyOther: 13, awaiting: 7},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) return; // OMP shows no "Author Response" table (spec U30 OMP1); OPS has no review stage
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.ready};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U30 A1 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const mailbox = `${c.author.user}@mailinator.com`;
    const {page} = await launch(app);
    const since = new Date();
    await signIn(page, 'dbarnes');

    if (MODE === 'neighbour') {
        await step('n1-ready-never-asked', async () => {
            await K.openEditorial(page, app, c.readyOther);
            return K.readTable(page, 'nb-n1-table');
        });
        await step('n2-awaiting-reviews', async () => {
            await K.openEditorial(page, app, c.awaiting);
            return K.readTable(page, 'nb-n2-table');
        });
        await step('n3-request', async () => {
            await K.openEditorial(page, app, c.ready);
            return K.sendRequest(page, app, c.ready, 'nb-n3-request');
        });
        await signIn(page, c.author.user);
        await step('n4-author-before', () => K.authorView(page, app, c.ready, 'nb-n4-author'));
        await step('n4-submit', () => K.submitResponse(page, c.author.name, 'u30a neighbour: our response to the reviews.'));
        await signIn(page, 'dbarnes');
        await step('n5-after-response', async () => {
            await K.openEditorial(page, app, c.ready);
            return K.readTable(page, 'nb-n5-table');
        });
        record('a1-neighbour', facts);
        return;
    }

    await step('s3-table-before', async () => {
        await K.openEditorial(page, app, c.ready);
        return K.readTable(page, 's3-table');
    });
    await step('s4-first-request', () => K.sendRequest(page, app, c.ready, 's4-request'));
    await step('s6-table-after-send', () => K.readTable(page, 's6-table'));
    await signOut(page);
    await signIn(page, c.colleague);
    await step('s8-colleague-table', async () => {
        await K.openEditorial(page, app, c.ready);
        return K.readTable(page, 's8-table');
    });
    await step('s9-second-request', () => K.sendRequest(page, app, c.ready, 's9-request'));
    await step('s10-table-after-second', () => K.readTable(page, 's10-table'));
    await signIn(page, c.author.user);
    await step('s11-author', () => K.authorView(page, app, c.ready, 's11-author'));
    await K.sleep(3000);
    await step('s12-mails', async () => {
        // every fleet of the slot mails one Mailpit: this fleet's mails carry its own address in the button's link
        const host = new URL(app.baseURL).host;
        await app.mail.find({to: mailbox, subject: SUBJECT, since}).catch(() => null);
        return {
            thisInstall: await app.mail.count({to: mailbox, subject: SUBJECT, contains: host, since}),
            anyInstall: await app.mail.count({to: mailbox, subject: SUBJECT, since}),
        };
    });
    await signIn(page, 'dbarnes');
    await step('s13-activity-log', async () => {
        await K.openEditorial(page, app, c.ready);
        return K.requestLogRows(page, 's13-activity-log');
    });
    record('a1-summary', facts);
});
