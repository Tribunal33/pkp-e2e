// Issue report docs/issues/U35-A16-discussion-email-opt-out-ignored.md (U35 A16):
// a person who ticked "Do not send me an email for these types of
// notifications." on the "Discussion added." row of Profile › Notifications
// still receives the email of a message sent to them from the "Participants"
// panel's "Notify" or "Assign". Takes the report's Steps through the screens
// on a dataset fleet (PKP's default test dataset), freshly reset, on OJS, OMP
// and OPS:
//   Opt out: the notified person, then minoue, tick the box on "Discussion added.", "Save".
//   Notify:  dbarnes, the person's "More Actions" › "Notify", predefined message, "Message", "Notify".
//   Assign:  dbarnes, "Assign", role, "Search", Minoti Inoue, predefined message, "Message", "OK".
//   Read:    each mailbox; each person's "Tasks" window.
// Also reads (for Evidence) the database: the person's email setting, the
// discussion's notice row and the discussion itself.
// 3.5 (PKP_E2E_LINE=stable-3_5_0) has the same Profile tab, workflow and windows.
// Run: PROBE_FEATURE=issues-w30 PROBE_AGENT=w30 node bin/probe.js all shared/playwright/checks/issues/discussion-email-opt-out-ignored/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w30 --dataset 3 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w30-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEW_QUERY = 0x1000021;

const CASE = {
    ojs: {
        sid: 4, template: 'Discussion (Submission)',
        notify: {name: 'David Buskins', username: 'dbuskins'},
        assign: {role: 'Section editor', name: 'Minoti Inoue', username: 'minoue'},
    },
    omp: {
        sid: 4, template: 'Discussion (Production)',
        notify: {name: 'Graham Cox', username: 'gcox'},
        assign: {role: 'Series editor', name: 'Minoti Inoue', username: 'minoue'},
    },
    ops: {
        sid: 1, template: 'Discussion (Production)',
        notify: {name: 'David Buskins', username: 'dbuskins'},
        assign: {role: 'Moderator', name: 'Minoti Inoue', username: 'minoue'},
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const c = CASE[app.name];
    const ctx = app.contextPath;
    const stamp = Date.now().toString(36);
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const uid = (u) => `(select user_id from users where username='${u}')`;
    const dbFacts = (u, text) => ({
        emailSetting: sql(app, `select count(*) from notification_subscription_settings where user_id=${uid(u)} and setting_name='blocked_emailed_notification' and setting_value='${NEW_QUERY}'`),
        newQueryNotices: sql(app, `select count(*) from notifications where user_id=${uid(u)} and type=${NEW_QUERY}`),
        notesWithMessage: sql(app, `select count(*) from notes where contents like '%${text}%'`),
    });
    const mailFor = async (u, text) => {
        const m = await app.mail.find({to: `${u}@mailinator.com`, contains: text, timeoutMs: 20_000}).catch(() => null);
        return m ? {subject: m.Subject, from: m.From && m.From.Name} : null;
    };

    const {page, close} = await launch(app);
    try {
        // ---- Opting out (steps 1-2) ----
        for (const u of [c.notify.username, c.assign.username]) {
            await signIn(page, u);
            const profile = new ProfilePage(page, ctx);
            await profile.goto('notifications');
            const row = profile.notificationRow('Discussion added.');
            const pair = profile.notificationPair('notificationNewQuery');
            fact(`optout.${u}.rowText`, flat(await row.innerText()));
            fact(`optout.${u}.before`, {allow: await pair.allow.isChecked(), email: await pair.email.isChecked()});
            await pair.email.check();
            await profile.save();
            await profile.goto('notifications');
            fact(`optout.${u}.after`, {allow: await pair.allow.isChecked(), email: await pair.email.isChecked()});
            await shot(page, `optout-${u}-${RUN}`);
            await signOut(page);
        }

        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, ctx);

        // ---- Notify (steps 3-5) ----
        const notifyText = `u35w30 notify ${stamp}`;
        {
            await panel.goto(c.sid);
            const win = await panel.openNotify(c.notify.name);
            fact('notify.list', await win.templateOptions());
            await win.chooseTemplate(c.template);
            await win.typeMessage(notifyText);
            const res = await win.pressNotify();
            fact('notify.response', {status: res.status()});
            await win.expectClosed();
            await idle(page);
            record('notify-after', await screen(page));
        }

        // ---- Assign (steps 6-7) ----
        const assignText = `u35w30 assign ${stamp}`;
        {
            await panel.reland();
            const win = await panel.openAssign();
            await win.chooseRole(c.assign.role);
            await win.search('Inoue');
            await win.choosePerson(c.assign.name);
            fact('assign.list', await win.templateOptions());
            await win.chooseTemplate(c.template);
            await win.typeMessage(assignText);
            await win.ok();
            await idle(page);
            record('assign-after', await screen(page));
        }
        await signOut(page);

        // ---- Reading (steps 8-9) ----
        for (const [k, u, text] of [['notify', c.notify.username, notifyText], ['assign', c.assign.username, assignText]]) {
            fact(`${k}.mail`, await mailFor(u, text));
            fact(`${k}.db`, dbFacts(u, text));
            await signIn(page, u);
            await page.goto(app.url(`/index.php/${ctx}/en/submissions`));
            await idle(page);
            const tasks = new TasksPanel(page);
            await tasks.open();
            const rows = await tasks.rowTexts();
            fact(`${k}.tasksRows`, rows.filter((r) => /started a discussion/.test(r)).slice(0, 4));
            record(`${k}-tasks`, await screen(page));
            await shot(page, `${k}-tasks-${RUN}`);
            await tasks.close();
            await signOut(page);
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
