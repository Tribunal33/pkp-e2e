// U55 claim check, chunk C55 (housekeeping 2026-10-13; incidentals row 25):
// Settings › Users & Roles › "Notify" with "Copy" ticked and then unticked before
// "Save" › "Send Email". Does the manager still get a copy?
// Spec: docs/specs/U55-notify-users.md — Fields "Copy" row, Rule 5, Side effects
// bullet 1, register A3; footnotes b, c, k, f-a3.
//
// Seeds per app and run (tag prefix u55c55): a scratch context with bulk email on,
// a manager (mgr) and one Author (au). Then, as mgr, three sends to "Author":
//   untick  "Copy" ticked, then unticked
//   never   "Copy" never touched (control)
//   ticked  "Copy" ticked (control)
// Each send records the box's state, the "Send Email" window's total, the request's
// posted body and the answer; the queued jobs' user ids are read from the queue, the
// fleet's queue is drained (drainJobs) and each inbox is read in Mailpit.
//
//   bin/app-lock.sh shared <app> -- env PROBE_RUN=r1 PROBE_FEATURE=U55 PROBE_AGENT=ccC55 \
//     node bin/probe.js <app> shared/playwright/checks/U55/C55/c55.js
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, sql, drainJobs} =
    require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[c55]', new Date().toISOString().slice(11, 19), ...a);

function jobUserIds(app, needle) {
    const out = sql(app, `select payload from jobs where payload like '%${needle}%' order by id`);
    if (!out) return [];
    return out.split('\n').map((p) => {
        const m = p.match(/userIds\\?";a:\d+:\{([^}]*)\}/);
        return m ? (m[1].match(/i:\d+;i:(\d+);/g) || []).map((x) => parseInt(x.match(/i:\d+;i:(\d+);/)[1], 10)) : flat(p, 200);
    });
}

forEachApp(async (app) => {
    const {NotifyTab} = require('../../../pages/NotifyUsersPages.js');
    const t = tag('u55c55');
    const F = {app: app.name, line: app.line || 'main', ctx: t, sends: {}};
    const save = () => record('c55-facts', F);
    await app.api.createContext({tag: t, bulkEmails: true, users: [
        {username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
        {username: `${t}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'},
    ]});
    F.ids = {
        mgr: parseInt(sql(app, `select user_id from users where username = '${t}mgr'`), 10),
        au: parseInt(sql(app, `select user_id from users where username = '${t}au'`), 10),
    };
    F.emails = {
        mgr: sql(app, `select email from users where username = '${t}mgr'`),
        au: sql(app, `select email from users where username = '${t}au'`),
    };
    log(app.name, 'seeded', t, JSON.stringify(F.ids));
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const snap = async (name) => {
        record(`c55-${name}`, await screen(page).catch((e) => ({error: flat(e.message)})));
        await shot(page, `c55-${name}`).catch(() => {});
    };
    const tab = new NotifyTab(page, t);
    const subj = (k) => `${t} ${k}`;
    try {
        await signIn(page, `${t}mgr`, {contextPath: t});
        await tab.goto();
        await idle(page).catch(() => {});
        await snap('open');
        F.copyLabel = flat(await tab.copyField.innerText().catch(() => null));

        for (const k of ['untick', 'never', 'ticked']) {
            const o = F.sends[k] = {};
            try {
                if (k !== 'untick') {
                    await page.goto(tab.url());
                    await tab.open();
                }
                await tab.roleBox('Author').check();
                if (k === 'untick' || k === 'ticked') await tab.copyBox.check();
                o.copyAfterTick = await tab.copyBox.isChecked();
                if (k === 'untick') {
                    await tab.copyBox.uncheck();
                    o.copyAfterUntick = await tab.copyBox.isChecked();
                }
                await tab.subject.fill(subj(k));
                await tab.typeBody(`Body of ${k}.`);
                o.copyBeforeSave = await tab.copyBox.isChecked();
                // screen() only: a full-page shot taken here makes the next click on "Save"
                // miss on OJS and OMP (the window never opens; an automation artefact).
                record(`c55-${k}-filled`, await screen(page).catch((e) => ({error: flat(e.message)})));
                let win;
                try {
                    win = await tab.pressSubmit();
                } catch (e) {
                    // The first press opened no window: record the screen, press once more.
                    o.firstPressNoWindow = flat(e.message, 200);
                    record(`c55-${k}-nowindow`, await screen(page).catch((e2) => ({error: flat(e2.message)})));
                    win = await tab.pressSubmit();
                }
                await idle(page).catch(() => {});
                o.window = ((flat(await win.dialog.innerText()) || '').match(/You are about to send an email to .*?\?/) || [null])[0];
                await snap(`${k}-window`);
                const r = await win.sendAndWait();
                o.status = r.status();
                o.answer = flat(await r.text().catch(() => null), 300);
                o.posted = r.request().postData();
                o.copyParam = (new URLSearchParams(o.posted || '')).getAll('copy');
                await idle(page).catch(() => {});
                o.queued = flat(await tab.queuedLine.innerText().catch(() => null));
                await snap(`${k}-sent`);
                o.jobUserIds = jobUserIds(app, subj(k));
            } catch (e) {
                o.error = flat(e.stack, 1200);
                await shot(page, `c55-err-${k}`).catch(() => {});
            }
            log(app.name, k, JSON.stringify(o).slice(0, 600));
            save();
        }

        F.drain = await drainJobs(app).then((d) => ({passes: d.passes, counts: d.counts, out: flat(d.output, 400)})).catch((e) => ({error: flat(e.message)}));
        await sleep(3000);
        F.mail = {};
        for (const k of Object.keys(F.sends)) {
            F.mail[k] = {};
            for (const who of ['mgr', 'au']) {
                const res = await app.mail._search({to: F.emails[who], subject: subj(k)});
                F.mail[k][who] = (res.messages || []).map((m) => ({
                    subject: m.Subject,
                    to: (m.To || []).map((x) => x.Address),
                    cc: (m.Cc || []).map((x) => x.Address),
                    bcc: (m.Bcc || []).length,
                }));
            }
        }
        // The page after a reload (the form is empty again; nothing else to read).
        await page.reload();
        await idle(page).catch(() => {});
        await snap('reload');
    } catch (e) {
        F.error = flat(e.stack, 1500);
    } finally {
        F.dialogs = dialogs;
        save();
        await close();
    }
});
