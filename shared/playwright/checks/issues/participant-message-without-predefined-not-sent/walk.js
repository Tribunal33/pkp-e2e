// Issue report docs/issues/U35-A3-OMP1-participant-message-without-predefined-not-sent.md
// (U35 A3, OMP1): a message typed in "Notify" or "Assign" with the
// predefined-message list left on its blank entry. Takes the report's Steps
// through the screens on a dataset fleet (PKP's default test dataset),
// freshly reset, on OJS, OMP and OPS, signed in as dbarnes:
//   Notify: row "More Actions" › "Notify", list blank, "Message" typed, "Notify".
//   Assign: "Assign", role, "Search", person, list blank, "Message" typed, "OK";
//           reload, the rows, the Activity Log.
//   Blank again: "Notify", a predefined message chosen, then the blank entry.
// OMP walks Notify and Assign on a press's Internal Review (submission 6),
// whose list holds only the blank entry, and the blank-again step on
// submission 4 (Production), row Graham Cox.
// 3.5 (PKP_E2E_LINE=stable-3_5_0) has the same workflow and windows.
// Also reads (for Evidence) the database: notes holding the message, the
// stage assignment, the Activity Log's participant lines.
// Run: PROBE_FEATURE=issues-w25 PROBE_AGENT=w25 node bin/probe.js all shared/playwright/checks/issues/participant-message-without-predefined-not-sent/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w25 --dataset 3 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w25-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {
        sid: 4, stage: 1,
        notify: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        assign: {role: 'Section editor', name: 'Minoti Inoue', username: 'minoue', email: 'minoue@mailinator.com'},
        again: {sid: 4, stage: 1, name: 'David Buskins'},
    },
    omp: {
        sid: 6, stage: 2,
        notify: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        assign: {role: 'Series editor', name: 'Stephanie Berardo', username: 'sberardo', email: 'sberardo@mailinator.com'},
        again: {sid: 4, stage: 5, name: 'Graham Cox'},
    },
    ops: {
        sid: 1, stage: 5,
        notify: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        assign: {role: 'Moderator', name: 'Minoti Inoue', username: 'minoue', email: 'minoue@mailinator.com'},
        again: {sid: 1, stage: 5, name: 'David Buskins'},
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const ctx = app.contextPath;
    const stamp = Date.now().toString(36);
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const notesWith = (text) => sql(app, `select count(*) from notes where contents like '%${text}%'`);
    const assigned = (sid, username) =>
        sql(app, `select count(*) from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${sid} and u.username='${username}'`);
    const addLog = (sid) =>
        sql(app, `select count(*) from event_log where assoc_id=${sid} and message='submission.event.participantAdded'`);
    const mailFor = async (to, text) => {
        const m = await app.mail.find({to, contains: text, timeoutMs: 15_000}).catch(() => null);
        return m ? {subject: m.Subject} : null;
    };

    const {page, close} = await launch(app);
    const sends = [];
    page.on('response', (r) => {
        if (/send-notification|save-participant|fetch-template-body/.test(r.url())) {
            sends.push({op: r.url().match(/(send-notification|save-participant|fetch-template-body)/)[1], status: r.status()});
        }
    });
    try {
        await signIn(page, 'dbarnes');

        // ---- the panel and its windows ----
        const open = async (sid) => {
            const panel = new SP.ParticipantsPanel(page, ctx);
            await panel.goto(sid); // every case is the submission's current stage
            return {panel};
        };
        const openNotify = async (o, name) => {
            await o.panel.chooseAction(name, 'Notify');
            const win = new SP.NotifyWindow(page);
            await win.expectOpen();
            return win;
        };
        const openAssign = async (o) => o.panel.openAssign();
        const stillOpen = async (root) => {
            await sleep(1500);
            return (await root.count()) > 0 && (await root.isVisible().catch(() => false));
        };

        // ---- Notify, the list left blank ----
        {
            const o = await open(c.sid);
            const win = await openNotify(o, c.notify.name);
            fact('notify.list', await win.templateOptions());
            const text = `u35w25 notify ${stamp}`;
            await win.typeMessage(text);
            const res = await win.pressNotify();
            await idle(page);
            const s = await screen(page);
            record('notify-after', s);
            await shot(page, `notify-after-${RUN}`);
            fact('notify.response', {status: res.status(), body: flat(await res.text().catch(() => ''), 200)});
            fact('notify.windowOpen', await stillOpen(win.root));
            fact('notify.messageKept', await win.messageText().catch(() => null));
            fact('notify.notices', s.notices);
            fact('notify.mail', await mailFor(c.notify.email, text));
            fact('notify.notesInDb', notesWith(text));
        }

        // ---- Assign, the list left blank ----
        {
            const o = await open(c.sid);
            const win = await openAssign(o);
            await win.chooseRole(c.assign.role);
            await win.search(c.assign.name.split(' ')[1]);
            await win.choosePerson(c.assign.name);
            fact('assign.list', await win.templateOptions());
            const text = `u35w25 assign ${stamp}`;
            await win.typeMessage(text);
            const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
            await win.root.getByRole('button', {name: 'OK', exact: true}).click();
            const res = await saved;
            await idle(page);
            const s = await screen(page);
            record('assign-after', s);
            await shot(page, `assign-after-${RUN}`);
            fact('assign.response', {status: res.status(), body: flat(await res.text().catch(() => ''), 200)});
            fact('assign.windowOpen', await stillOpen(win.root));
            fact('assign.notices', s.notices);
            // Reload: is the person listed?
            const o2 = await open(c.sid);
            {
                await o2.panel.row(c.assign.name).first().waitFor({timeout: 15_000}).catch(() => {});
                fact('assign.rowAfterReload', await o2.panel.row(c.assign.name).count());
                const log = await o2.panel.frame.openActivityLog();
                await idle(page);
                const logText = flat(await log.innerText(), 4000);
                fact('assign.activityLogNamesPerson', logText.includes(c.assign.name));
                record('assign-activity-log', await screen(page));
                await o2.panel.frame.closeActivityLog();
            }
            fact('assign.mail', await mailFor(c.assign.email, text));
            fact('assign.db', {
                assigned: assigned(c.sid, c.assign.username),
                notes: notesWith(text),
                participantAddedLines: addLog(c.sid),
            });
        }

        // ---- Blank entry chosen again after a predefined message ----
        {
            const o = await open(c.again.sid);
            const win = await openNotify(o, c.again.name);
            const opts = await win.templateOptions();
            fact('again.list', opts);
            const first = opts.find((x) => x);
            if (!first) {
                fact('again.skipped', 'no predefined message');
            } else {
                await win.chooseTemplate(first);
                const filled = await win.messageText();
                const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: T});
                await win.templateSelect().selectOption({index: 0});
                const res = await fetched;
                await idle(page);
                await sleep(500);
                fact('again.response', {status: res.status(), body: flat(await res.text().catch(() => ''), 200)});
                fact('again.textKept', (await win.messageText()) === filled);
                record('again-after', await screen(page));
            }
        }
        fact('requests', sends);
    } finally {
        record('facts', facts);
        await close();
    }
});
