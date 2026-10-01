// Issue report docs/issues/U35-OPS2-ops-assign-editor-message-empty.md
// (U35 OPS2): on a preprint server, choosing "Assign Editor" in the
// "Assign Participant" window's predefined messages leaves "Message" as it
// was. Takes the report's Steps through the screens on a dataset fleet
// (PKP's default test dataset), freshly reset, signed in as dbarnes, on the
// Production stage of OPS submission 1 (OJS submission 5 and OMP submission
// 4 as the control), assigning Minoti Inoue:
//   "Assign", role, "Search", person; "Assign Editor"; "Discussion
//   (Production)"; "Assign Editor" again; "OK"; then the mailbox.
// 3.5 (PKP_E2E_LINE=stable-3_5_0) has the same workflow and window.
// Run: PROBE_FEATURE=issues-w27 PROBE_AGENT=w27 node bin/probe.js all shared/playwright/checks/issues/ops-assign-editor-message-empty/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w27 --dataset 3 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w27-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 5, role: 'Section editor'},
    omp: {sid: 4, role: 'Series editor'},
    ops: {sid: 1, role: 'Moderator'},
};
// 3.5's preprint server names the letter "Editor Assigned"
const LETTER = (app) => (app.name === 'ops' && app.line && /3_5/.test(String(app.line.name || app.line)) ? 'Editor Assigned' : 'Assign Editor');
const PERSON = {name: 'Minoti Inoue', username: 'minoue', email: 'minoue@mailinator.com'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const started = new Date();

    const {page, close} = await launch(app);
    const requests = [];
    page.on('response', (r) => {
        const m = r.url().match(/(fetch-template-body|save-participant)/);
        if (m) requests.push({op: m[1], status: r.status()});
    });
    try {
        // 1. dbarnes opens the submission
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        record('workflow', await screen(page));

        // 2.-3. "Assign", the role, the person
        const win = await panel.openAssign();
        await win.chooseRole(c.role);
        await win.search('Inoue');
        await win.choosePerson(PERSON.name);
        fact('list', await win.templateOptions());

        // choose a predefined message, wait for its request, read "Message"
        const choose = async (label, step) => {
            const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: T});
            await win.templateSelect().selectOption({label});
            const res = await fetched;
            await idle(page);
            await sleep(800);
            const body = await res.text().catch(() => '');
            fact(`${step}.response`, {status: res.status(), body: flat(body, 300)});
            fact(`${step}.message`, flat(await win.messageText(), 300));
            const s = await screen(page);
            record(step, s);
            await shot(page, `${step}-${RUN}`);
            return s;
        };

        // 4. "Assign Editor"
        await choose(LETTER(app), 'step4-assign-editor');
        // 5. "Discussion (Production)"
        await choose('Discussion (Production)', 'step5-discussion');
        // 6. "Assign Editor" again
        await choose(LETTER(app), 'step6-assign-editor-again');

        // 7. "OK"
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
        await win.root.getByRole('button', {name: 'OK', exact: true}).click();
        const res = await saved;
        await idle(page);
        await sleep(1500);
        const s = await screen(page);
        record('step7-ok', s);
        await shot(page, `step7-ok-${RUN}`);
        fact('step7.response', {status: res.status(), body: flat(await res.text().catch(() => ''), 200)});
        fact('step7.windowOpen', (await win.root.count()) > 0 && (await win.root.isVisible().catch(() => false)));
        fact('step7.notices', s.notices);
        fact('step7.assigned', sql(app, `select count(*) from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${c.sid} and u.username='${PERSON.username}'`));

        // the email Minoti Inoue receives
        // (Mailpit is shared by every fleet of the machine: keep only what arrived after this walk began)
        await sleep(3000);
        const m = await app.mail.find({to: PERSON.email, timeoutMs: 20_000}).catch(() => null);
        const fresh = m && new Date(m.Created) >= started ? m : null;
        fact('mail', fresh ? {subject: fresh.Subject, snippet: flat(fresh.Snippet, 500)} : null);
        fact('requests', requests);
    } finally {
        record('facts', facts);
        await close();
    }
});
