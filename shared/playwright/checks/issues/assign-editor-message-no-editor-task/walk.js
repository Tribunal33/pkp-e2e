// Issue report docs/issues/U35-A6-assign-editor-message-no-editor-task.md (U35 A6):
// assigning an editor from the "Participants" panel with the predefined
// message "Assign Editor" gives the new editor only the discussion's task, not
// "You have been assigned as an editor to the submission "{title}"." that
// "Request Copyedit" / "Ready for Production" give for their work. Takes the
// report's Steps through the screens on a dataset fleet (PKP's default test
// dataset), freshly reset, on OJS (Submission stage), OMP (Review) and OPS
// (Production), one "Assign Editor" template per stage:
//   Assign: dbarnes, "Assign", role, "Search" Inoue, Minoti Inoue, "Assign Editor"
//           ("Editor Assigned" on OPS 3.5), "Message", "OK".
//   Read:   minoue's mailbox; minoue's "Tasks" window.
// Also reads (for Evidence) the database: minoue's notices on the submission.
// neighbour.js runs the same steps with the stage's plain "Discussion (…)" message.
// On OPS main choosing "Assign Editor" leaves "Message" empty (its template fetch
// answers 500, U35 OPS2); the typed text is sent all the same.
// Run: PROBE_FEATURE=issues-w34 PROBE_AGENT=w34 node bin/probe.js all shared/playwright/checks/issues/assign-editor-message-no-editor-task/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w34 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w34-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');
const {waitForJQueryIdle} = require('../../../support/legacy.js');

const RUN = process.env.PROBE_RUN || 'main';
const NEIGHBOUR = process.env.A6_WALK === 'neighbour';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const EDITOR_ASSIGN = 0x1000027;

const CASE = {
    ojs: {sid: 4, role: 'Section editor', discussion: 'Discussion (Submission)'},
    omp: {sid: 16, role: 'Series editor', discussion: 'Discussion (Review)'},
    ops: {sid: 1, role: 'Moderator', discussion: 'Discussion (Production)'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const c = CASE[app.name];
    const ctx = app.contextPath;
    // "Assign Editor"; OPS 3.5 names the same template "Editor Assigned".
    const ASSIGN_EDITOR = /^(Assign Editor|Editor Assigned)$/;
    const tag = NEIGHBOUR ? 'neighbour' : 'walk';
    const stamp = Date.now().toString(36);
    const text = `u35w34 ${NEIGHBOUR ? 'discussion' : 'assign editor'} ${stamp}`;
    const facts = {app: app.name, line: app.line || 'main', run: RUN, mode: tag};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };

    const {page, close} = await launch(app);
    try {
        // ---- Assigning (steps 1-3) ----
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, ctx);
        await panel.goto(c.sid);
        const win = await panel.openAssign();
        await win.chooseRole(c.role);
        await win.search('Inoue');
        await win.choosePerson('Minoti Inoue');
        const options = await win.templateOptions();
        fact('templates', options);
        const template = NEIGHBOUR ? c.discussion : options.find((o) => ASSIGN_EDITOR.test(o));
        fact('template', template);
        // Choose the predefined message (not the page object's helper: on OPS main
        // the letter never arrives, so "Message" does not change, OPS2).
        const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 30_000});
        await win.templateSelect().selectOption({label: template});
        fact('templateFetch', (await fetched).status());
        await waitForJQueryIdle(page);
        fact('messageAfterChoice', flat(await win.messageText(), 200));
        await win.typeMessage(text);
        await win.ok();
        await idle(page);
        record(`${tag}-assigned`, await screen(page));
        await signOut(page);

        // ---- Reading (step 4) ----
        const m = await app.mail.find({to: 'minoue@mailinator.com', contains: stamp, timeoutMs: 20_000}).catch(() => null);
        fact('mail', m ? {subject: m.Subject, from: m.From && m.From.Name} : null);
        fact('db.notices', sql(app, `select type, level from notifications where user_id=(select user_id from users where username='minoue') and ((assoc_type=1048585 and assoc_id=${c.sid}) or type=${EDITOR_ASSIGN}) order by notification_id`));
        await signIn(page, 'minoue');
        await page.goto(app.url(`/index.php/${ctx}/en/submissions`));
        await idle(page);
        const tasks = new TasksPanel(page);
        await tasks.open();
        const rows = await tasks.rowTexts();
        fact('tasks.all', rows.slice(0, 8));
        fact('tasks.discussion', rows.filter((r) => r.includes(stamp)));
        fact('tasks.editorAssign', rows.filter((r) => /^You have been assigned as an editor to the submission/.test(r)));
        record(`${tag}-tasks`, await screen(page));
        await shot(page, `${tag}-tasks-${RUN}`);
        await tasks.close();
        await signOut(page);
    } finally {
        record(`${tag}-facts`, facts);
        await close();
    }
});
