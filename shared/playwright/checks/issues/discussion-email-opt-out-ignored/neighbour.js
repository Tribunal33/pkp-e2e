// Neighbour check for docs/issues/U35-A16-discussion-email-opt-out-ignored.md
// (U35 A16): the fix must stop the email only for a person who chose "Do
// not send me an email…" on "Discussion added.". Here the person did not:
// dbarnes sends a predefined message from "Notify" to the submission's
// author, whose Notifications tab is as the dataset left it, and the email
// must still arrive, with the discussion and the author's Tasks row.
// Walked with the fix in and out, on a freshly reset dataset fleet.
// Run: PROBE_FEATURE=issues-w30 PROBE_AGENT=w30 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/discussion-email-opt-out-ignored/neighbour.js
const {forEachApp, launch, signIn, signOut, record, idle, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEW_QUERY = 0x1000021;

const CASE = {
    ojs: {sid: 4, template: 'Discussion (Submission)', author: {name: 'Craig Montgomerie', username: 'cmontgomerie'}},
    omp: {sid: 4, template: 'Discussion (Production)', author: {name: 'Bart Beaty', username: 'bbeaty'}},
    ops: {sid: 1, template: 'Discussion (Production)', author: {name: 'Carlo Corino', username: 'ccorino'}},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const u = c.author.username;
    const stamp = Date.now().toString(36);
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const uid = `(select user_id from users where username='${u}')`;
    const {page, close} = await launch(app);
    try {
        fact('emailSettingBefore', sql(app, `select count(*) from notification_subscription_settings where user_id=${uid} and setting_name='blocked_emailed_notification' and setting_value='${NEW_QUERY}'`));
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        const text = `u35w30 neighbour ${stamp}`;
        const win = await panel.openNotify(c.author.name);
        await win.chooseTemplate(c.template);
        await win.typeMessage(text);
        const res = await win.pressNotify();
        fact('notify.response', {status: res.status()});
        await win.expectClosed();
        await idle(page);
        await signOut(page);
        const m = await app.mail.find({to: `${u}@mailinator.com`, contains: text, timeoutMs: 20_000}).catch(() => null);
        fact('mail', m ? {subject: m.Subject, from: m.From && m.From.Name} : null);
        fact('db', {
            newQueryNotices: sql(app, `select count(*) from notifications where user_id=${uid} and type=${NEW_QUERY}`),
            notesWithMessage: sql(app, `select count(*) from notes where contents like '%${text}%'`),
        });
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
