// Issue report docs/issues/U37-A4-find-template-discussion-task-error.md (U37 A4):
// a "Find Template" search holding "discussion" or "task" in the "Add" window
// of a stage's "Tasks & Discussions" panel. Takes the report's Steps through
// the screens on a dataset fleet (PKP's default test dataset), freshly reset,
// on OJS, OMP and OPS:
//   1. sign in as dbarnes; 2. open the submission at Production;
//   3. "Production Tasks & Discussions" › "Add";
//   4. "Find Template": "discussion", Enter; 5. "Discussion (Production)", Enter;
//   6. "task", Enter.
// Control and neighbour check (the searches the fix must leave alone, and the
// type word doing its job): "Production", Enter (narrows by the word); the
// clear control (the whole list back); and, with the fix in, "task" reading
// "No items found." without an error since no installed template is a task.
// Records each search's list, the "Error" window's text and every
// editTaskTemplates answer (status and the start of its body).
// Run: PROBE_FEATURE=issues-w56 PROBE_AGENT=w56 node bin/probe.js all shared/playwright/checks/issues/find-template-discussion-task-error/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w56 --dataset 4 --reset)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The submission at Production in each app's dataset.
const CASE = {ojs: {sid: 5}, omp: {sid: 4}, ops: {sid: 1}};
const PANEL = 'Production Tasks & Discussions';
const SEARCHES = [
    {step: '4', text: 'discussion'},
    {step: '5', text: 'Discussion (Production)'},
    {step: '6', text: 'task'},
    {step: 'control', text: 'Production'},
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {TasksDiscussionsPanel, ItemWindow} = require('../../../pages/TasksDiscussionsPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const {page, close} = await launch(app);
    const answers = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/editTaskTemplates/.test(u)) return;
        let body = '';
        try { body = await r.text(); } catch (e) { body = '(no body)'; }
        answers.push({t: Date.now(), method: r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(body, 200)});
    });
    const since = (t0) => answers.filter((a) => a.t >= t0).map(({t, ...a}) => a);
    const errorWindow = () => page.getByRole('dialog').filter({hasText: /^\s*Error/}).last();

    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: PANEL});
        await panel.gotoEditorial(c.sid, 'workflow_5');
        // 3
        const win = await panel.openAdd();
        await idle(page); await sleep(800);
        const whole = await win.templateNames();
        fact('3 whole list', whole);
        record('3-add-window', await screen(page));
        await shot(page, '3-add-window');

        const box = win.findTemplate();
        for (const s of SEARCHES) {
            await box.fill('');
            await box.fill(s.text);
            const t0 = Date.now();
            await box.press('Enter');
            await idle(page); await sleep(1500);
            const err = errorWindow();
            const errOpen = await err.isVisible().catch(() => false);
            const errText = errOpen ? flat(await err.innerText()) : null;
            const label = `${s.step}-search-${s.text.replace(/\W+/g, '-').toLowerCase()}`;
            record(label, await screen(page));
            await shot(page, label);
            if (errOpen) {
                await err.getByRole('button', {name: 'OK', exact: true}).click();
                await err.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await sleep(300);
            }
            fact(`${s.step} search "${s.text}"`, {
                errorWindow: errText,
                list: await win.templateNames(),
                noItems: await win.noTemplatesLine().isVisible().catch(() => false),
                answers: since(t0),
            });
        }

        // Neighbour: the clear control brings the whole list back.
        const t0 = Date.now();
        await win.clearSearch().click();
        await idle(page); await sleep(1500);
        const after = await win.templateNames();
        fact('clear', {list: after, sameAsWhole: JSON.stringify(after) === JSON.stringify(whole), answers: since(t0)});
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
