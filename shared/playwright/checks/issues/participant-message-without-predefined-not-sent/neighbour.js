// Neighbour check for the fix of docs/issues/U35-A3-OMP1-participant-message-without-predefined-not-sent.md:
// what the fix must leave alone, walked with the fix in and out. Signed in as
// dbarnes on a dataset fleet (PKP's default test dataset), freshly reset:
//   1. "Notify" with the predefined message "Assign Editor" chosen and the text
//      kept: the message goes out under that message's name, not the stage's
//      "Discussion (…)" (the fix's fallback applies to the blank entry only).
//   2. "Notify" with the list blank and "Message" empty: still refused, nothing sent.
// Run: PROBE_FEATURE=issues-w25 PROBE_AGENT=w25 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/participant-message-without-predefined-not-sent/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w25 --dataset 3 --reset)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// A row on the submission's current stage whose list offers "Assign Editor" (OMP: Production of submission 4).
const CASE = {
    ojs: {sid: 4, name: 'David Buskins', email: 'dbuskins@mailinator.com'},
    omp: {sid: 4, name: 'Graham Cox', email: 'gcox@mailinator.com'},
    ops: {sid: 1, name: 'David Buskins', email: 'dbuskins@mailinator.com'},
};
const CHOSEN = {ojs: 'Assign Editor', omp: 'Assign Editor', ops: 'Assign Editor'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const stamp = Date.now().toString(36);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const openNotify = async () => {
            const panel = new SP.ParticipantsPanel(page, app.contextPath);
            await panel.goto(c.sid);
            await panel.chooseAction(c.name, 'Notify');
            const win = new SP.NotifyWindow(page);
            await win.expectOpen();
            return win;
        };

        // 1. A predefined message chosen: sent under its own name.
        {
            const win = await openNotify();
            const opts = await win.templateOptions();
            const label = opts.find((x) => x === CHOSEN[app.name]);
            fact('chosen.list', opts);
            if (app.name === 'ops') {
                // A preprint server's "Assign Editor" fills nothing (U35 OPS2): choose it and type.
                const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 30_000});
                await win.templateSelect().selectOption({label});
                await fetched;
                await idle(page);
            } else {
                await win.chooseTemplate(label);
            }
            const text = `u35w25 chosen ${stamp}`;
            await win.typeMessage(text);
            const res = await win.pressNotify();
            await idle(page);
            await sleep(1500);
            const s = await screen(page);
            fact('chosen.response', res.status());
            fact('chosen.windowOpen', (await win.root.count()) > 0 && (await win.root.isVisible().catch(() => false)));
            fact('chosen.notices', s.notices);
            const m = await app.mail.find({to: c.email, contains: text, timeoutMs: 15_000}).catch(() => null);
            fact('chosen.mailSubject', m ? m.Subject : null);
            fact('chosen.discussionTitle', sql(app, `select title from edit_tasks where assoc_id=${c.sid} order by edit_task_id desc limit 1`));
            record('chosen-after', s);
        }

        // 2. List blank, "Message" empty: still refused.
        {
            const win = await openNotify();
            const res = await win.pressNotify().catch(() => null);
            await idle(page);
            await sleep(1500);
            const s = await screen(page);
            fact('empty.response', res ? {status: res.status(), body: flat(await res.text().catch(() => ''), 300)} : 'no request (refused in the browser)');
            fact('empty.windowOpen', (await win.root.count()) > 0 && (await win.root.isVisible().catch(() => false)));
            fact('empty.notices', s.notices);
            fact('empty.formText', flat(s.text.dialog, 600));
            record('empty-after', s);
        }
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
