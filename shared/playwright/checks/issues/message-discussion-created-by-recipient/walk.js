// Issue report docs/issues/U35-A5-message-discussion-created-by-recipient.md
// (U35 A5, U32 A9): a message sent from the "Participants" panel's "Assign" or
// "Notify" opens a discussion that the stage's discussions panel lists as
// "Created by: {the person it was sent to}", though the editor wrote and sent
// it. Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS, OMP and OPS:
//   Assign: dbarnes, the stage's "Participants" › "Assign", role, "Search",
//           the person, a predefined message, "Message", "OK".
//   Notify: dbarnes, a participant's "More Actions" › "Notify", a predefined
//           message, "Message", "Notify".
//   Read:   the stage's discussions panel rows; the assigned discussion's
//           window (participants, first entry); the recipient's "Tasks".
// On main the panel is "<Stage> Tasks & Discussions" ("Created by: …"); on
// 3.5 (PKP_E2E_LINE=stable-3_5_0) it is the "<Stage> Discussions" grid with
// its "From" column, and the discussion is titled with the email's subject.
// OPS assigns with "Discussion (Production)": "Assign Editor" leaves the
// message empty there on main (U35 OPS2, its own report).
// Also reads (for Evidence) each new discussion's stored creator and its
// first entry's author.
// Run: PROBE_FEATURE=issues-w33 PROBE_AGENT=w33 node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w33 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w33-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const COPYEDIT = {
    stage: 'Copyediting',
    assign: {role: 'Copyeditor', search: 'Vogt', name: 'Sarah Vogt', username: 'svogt', template: [/^Request Copyedit$/, /Copyedit/i]},
    notify: {name: 'Maria Fritz', username: 'mfritz', template: [/^Discussion \(Copyediting\)$/, /Copyedit/i]},
};
const CASE = {
    ojs: {sid: 3, ...COPYEDIT},
    omp: {sid: 7, ...COPYEDIT},
    ops: {
        sid: 1, stage: 'Production',
        assign: {role: 'Moderator', search: 'Inoue', name: 'Minoti Inoue', username: 'minoue', template: [/^Discussion \(Production\)$/, /Production/]},
        notify: {name: 'David Buskins', username: 'dbuskins', template: [/^Discussion \(Production\)$/, /Production/]},
    },
};

const pick = (options, res) => {
    for (const re of res) {
        const hit = options.find((o) => re.test(o));
        if (hit) return hit;
    }
    throw new Error(`no predefined message matches ${res.join(' | ')} in ${JSON.stringify(options)}`);
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const c = CASE[app.name];
    const ctx = app.contextPath;
    const onMain = !app.line || app.line === 'main';
    const stamp = Date.now().toString(36);
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };

    // The row of discussion `title` as the stage's panel shows it.
    const rowText = async (page, title) => {
        if (onMain) {
            const td = new TasksDiscussionsPanel(page, ctx, {title: `${c.stage} Tasks & Discussions`});
            await td.expectSettled();
            const n = await td.row(title).count();
            return {count: n, rows: (await td.row(title).allInnerTexts()).map((t) => flat(t))};
        }
        // 3.5 titles the discussion with the email's subject, not the template's
        // name ("Submission 3 is ready to be copyedited for JPKJPK"): every row.
        const grid = page.locator('.pkp_controllers_grid').filter({has: page.locator('thead', {hasText: 'From'})}).first();
        const rows = grid.locator('tr.gridRow');
        const n = await rows.count();
        return {count: n, headers: flat(await grid.locator('thead').first().innerText().catch(() => null)),
            rows: (await rows.allInnerTexts()).map((t) => flat(t))};
    };
    const stored = (title) => sql(app, `select coalesce(u.username, '-') || ' / head note: ' || coalesce(h.username, '-')
        from ${onMain ? 'edit_tasks' : 'queries'} t
        left join users u on u.user_id = ${onMain ? 't.created_by' : 'null'}
        left join lateral (select uu.username from notes n join users uu on uu.user_id = n.user_id
            where n.assoc_type = 1048586 and n.assoc_id = t.${onMain ? 'edit_task_id' : 'query_id'} order by n.note_id limit 1) h on true
        where t.assoc_type = 1048585 and t.assoc_id = ${c.sid} order by t.${onMain ? 'edit_task_id' : 'query_id'} desc limit 2`);

    const {page, close} = await launch(app);
    try {
        // ---- steps 1-2 ----
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, ctx);
        await panel.goto(c.sid);
        await panel.selectStage(c.stage);

        // ---- Assign with a message (steps 3-4) ----
        let assignTitle;
        {
            const win = await panel.openAssign();
            await win.chooseRole(c.assign.role);
            await win.search(c.assign.search);
            await win.choosePerson(c.assign.name);
            const options = await win.templateOptions();
            fact('assign.options', options);
            assignTitle = pick(options, c.assign.template);
            await win.chooseTemplate(assignTitle);
            await win.typeMessage(`u35w33 assign ${stamp}`);
            await win.ok();
            await idle(page);
        }

        // ---- Notify (step 5) ----
        let notifyTitle;
        {
            await panel.reland();
            const win = await panel.openNotify(c.notify.name);
            const options = await win.templateOptions();
            fact('notify.options', options);
            notifyTitle = pick(options, c.notify.template);
            await win.chooseTemplate(notifyTitle);
            await win.typeMessage(`u35w33 notify ${stamp}`);
            const res = await win.pressNotify();
            fact('notify.response', {status: res.status()});
            await win.expectClosed();
            await idle(page);
        }

        // ---- The discussions panel (step 6) ----
        await panel.reland();
        await idle(page);
        fact('panel.assign', {title: assignTitle, ...(await rowText(page, assignTitle))});
        fact('panel.notify', {title: notifyTitle, ...(await rowText(page, notifyTitle))});
        record(`panel-${RUN}`, await screen(page));
        await shot(page, `panel-${RUN}`);
        fact('db.newest', stored());

        // ---- The discussion's window (step 7, main only: the Vue window) ----
        if (onMain) {
            const td = new TasksDiscussionsPanel(page, ctx, {title: `${c.stage} Tasks & Discussions`});
            await td.nameButton(assignTitle).first().click();
            const win = new SP.DiscussionWindow(page, assignTitle);
            await win.expectOpen();
            await idle(page);
            fact('window.participants', await win.participantUsernames());
            fact('window.firstEntry', flat(await win.entries().first().innerText(), 300));
            record(`window-${RUN}`, await screen(page));
            await shot(page, `window-${RUN}`);
            await win.close();
        }
        await signOut(page);

        // ---- The recipient's Tasks (step 8) ----
        await signIn(page, c.assign.username);
        await page.goto(app.url(`/index.php/${ctx}/en/submissions`));
        await idle(page);
        const tasks = new TasksPanel(page);
        await tasks.open();
        fact('recipient.tasksRows', (await tasks.rowTexts()).filter((r) => /started a discussion/.test(r)).slice(0, 3).map((r) => flat(r, 200)));
        await shot(page, `tasks-${RUN}`);
        await tasks.close();
        await signOut(page);
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
