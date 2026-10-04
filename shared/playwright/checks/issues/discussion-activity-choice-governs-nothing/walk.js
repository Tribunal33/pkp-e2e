// U05 A1 issue walk (docs/issues/U05-A1-discussion-activity-choice-governs-nothing.md): the
// "Discussion activity." row's boxes on the profile's Notifications tab govern nothing; a reply in
// a discussion reaches the participants as a "Discussion added." task and email, worded like the
// opening.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md), main or 3.5:
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/walk.js [control]
// Reset the fleet first (the walk changes two users' choices and adds a discussion). No assertions:
// each step is recorded with screen(); the `facts` record holds the reads (boxes, mailboxes, Tasks rows).
//
// Steps (per app: lib.js WORDS):
//  1-2. emailOff (mfritz; OPS dbuskins) ticks "Do not send me an email…" under "Discussion activity.".
//  3-4. allowOff (sberardo; OMP dkennepohl) unticks "Enable these types…" under "Discussion activity.".
//  5-6. dbarnes adds "Reference check u05c" at the stage with both ticked ("Add discussion" on 3.5).
//  7.   dbarnes adds a message to it ("Add New Message"; "Add Message" on 3.5).
//  8-9. emailOff's and allowOff's "Tasks" windows and mailboxes.
// `control` (alone, on a fresh fleet; the fix must leave it alone): emailOff unticks "Enable…"
//  under "Discussion added."; dbarnes adds "Scope check u05c" with emailOff ticked, then "Edit"s it
//  and ticks allowOff. emailOff gets nothing; allowOff gets the "started a discussion" row and email.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NEIGHBOUR = process.argv.slice(2).includes('control');
const NAME = NEIGHBOUR ? 'Scope check u05c' : 'Reference check u05c';
const OPENING = 'Please check the references.';
const REPLY = 'One more: check the DOIs too.';

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const is35 = app.line === 'stable-3_5_0';
    const t0 = Date.now() - 2000;
    const facts = {app: app.name, line: app.line || 'main', mode: NEIGHBOUR ? 'control' : 'walk', submission: w.id, emailOff: w.emailOff, allowOff: w.allowOff};
    const {page, close} = await launch(app);
    const T = require('../../../pages/TasksDiscussionsPages.js');
    const panel = is35 ? null : new T.TasksDiscussionsPanel(page, app.contextPath, {title: `${w.stage} Tasks & Discussions`});
    const open = async () => (is35 ? L.openWorkflow35(page, app, w) : panel.gotoEditorial(w.id, w.menuKey));
    const readUser = async (username, label) => {
        await signIn(page, username);
        // The reader-side home is where a copyeditor or an author lands; "Dashboard" carries "Tasks".
        await page.goto(app.url(`/index.php/${app.contextPath}${app.line === 'stable-3_5_0' || !app.line || app.line === 'main' ? '/en' : ''}/submissions`));
        await idle(page);
        record(`${label}-dashboard`, await screen(page));
        const tasks = await L.readTasks(page, NAME, `${label}-tasks`);
        await shot(page, `${label}-tasks`).catch(() => {});
        await signOut(page);
        return {tasks, mail: await L.mailbox(app, username, NAME, t0)};
    };
    try {
        if (!NEIGHBOUR) {
            // 1-4. The two participants switch off "Discussion activity.", each one box.
            await signIn(page, w.emailOff);
            facts.emailOffRow = await L.setRow(page, app, L.ACTIVITY, {email: true}, '01-email-off-ticked');
            await signOut(page);
            await signIn(page, w.allowOff);
            facts.allowOffRow = await L.setRow(page, app, L.ACTIVITY, {allow: false}, '02-allow-off-unticked');
            await signOut(page);
        } else {
            // N1. emailOff switches off "Discussion added." ("Enable…" unticked).
            await signIn(page, w.emailOff);
            facts.emailOffAddedRow = await L.setRow(page, app, L.ADDED, {allow: false}, 'n01-added-off');
            await signOut(page);
        }

        // 5-6. dbarnes opens the discussion.
        await signIn(page, w.writer);
        await open();
        const people = NEIGHBOUR ? [w.emailOff] : [w.emailOff, w.allowOff];
        if (is35) {
            const names = NEIGHBOUR ? [w.emailOffName] : [w.emailOffName, w.allowOffName];
            facts.add = await L.addQuery35(page, {participantNames: names, subject: NAME, message: OPENING});
        } else {
            const add = await panel.openAdd();
            await add.nameField().fill(NAME);
            for (const u of people) await add.tick(u);
            await add.typeMessage(OPENING);
            record('03-add-window', await screen(page));
            const answer = await add.saveAndAnswer();
            facts.add = {status: answer.status()};
            await idle(page);
            await panel.reland();
        }
        record('04-panel-after-add', await screen(page));
        facts.afterOpening = {emailOffMail: await L.waitForMail(page, app, NEIGHBOUR ? w.writer : w.emailOff, NAME, 1, t0, {tries: 5})};

        if (!NEIGHBOUR) {
            // 7. dbarnes adds a message.
            if (is35) {
                facts.reply = await L.reply35(page, {subject: NAME, message: REPLY});
            } else {
                const win = await panel.openItem(NAME);
                await win.addNewMessage();
                await win.typeReply(REPLY);
                record('05-reply-typed', await screen(page));
                const answered = page.waitForResponse((r) => /\/tasks\/\d+\/notes?$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 30000});
                await win.pressSave();
                facts.reply = {status: (await answered).status()};
                await L.sleep(1000);
                facts.replyMessages = await win.messages().allInnerTexts().then((a) => a.map((t) => L.flat(t, 160))).catch(() => null);
                record('06-discussion-after-reply', await screen(page));
                await win.close().catch(() => {});
                await panel.reland();
            }
            // Let the mail go out: dbarnes's own copy of the reply (pkp-e2e U37 A3) or emailOff's.
            await L.waitForMail(page, app, w.emailOff, NAME, 2, t0, {tries: 4});
        } else {
            // N2. "Edit" ticks allowOff.
            const win = await panel.openEdit(NAME);
            await win.tick(w.allowOff);
            const answer = await win.saveAndAnswer();
            facts.edit = {status: answer.status()};
            await idle(page);
            await panel.reland();
            record('n05-after-edit', await screen(page));
            await L.waitForMail(page, app, w.allowOff, NAME, 1, t0, {tries: 5});
        }
        await signOut(page);

        // 8-9. What each participant got.
        facts.emailOffGot = await readUser(w.emailOff, '07-email-off');
        facts.allowOffGot = await readUser(w.allowOff, '08-allow-off');
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
        await shot(page, 'error-screen').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts)}`);
        await close();
    }
});
