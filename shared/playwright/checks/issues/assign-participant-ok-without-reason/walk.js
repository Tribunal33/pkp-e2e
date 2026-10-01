// Issue report docs/issues/U35-A4-assign-participant-ok-without-reason.md
// (U35 A4): "OK" on "Assign Participant" with nobody chosen, or with a
// person from the previous role's list, assigns nobody and gives no reason.
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS (submission 4), OMP
// (submission 8) and OPS (submission 1):
//   dbarnes: the submission, "Assign", "OK" (nobody chosen);
//   then role "Section editor" (OMP "Series editor", OPS "Moderator"),
//   "Search", "Minoti Inoue", role "Author" without "Search", "OK".
// Records, for each "OK", the save's answer, the window as redrawn (role,
// people, any error text) and whether Minoti Inoue holds a stage
// assignment on the submission afterwards.
// Run: PROBE_FEATURE=issues-w32 PROBE_AGENT=w32 node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-without-reason/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w32 --dataset 3 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w32-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 4, editorRole: 'Section editor'},
    omp: {sid: 8, editorRole: 'Series editor'},
    ops: {sid: 1, editorRole: 'Moderator'},
};
const PERSON = {name: 'Minoti Inoue', username: 'minoue'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const c = CASE[app.name];
    const SP = require('../../../pages/StageParticipantsPages.js');
    const assignments = () => sql(app,
        `select sa.stage_assignment_id || ':' || sa.user_group_id from stage_assignments sa join users u on u.user_id=sa.user_id ` +
        `where sa.submission_id=${c.sid} and u.username='${PERSON.username}'`);
    const rowCount = () => sql(app, `select count(*) from stage_assignments where submission_id=${c.sid}`);

    // Press "OK" and read the window as the answer leaves it.
    const pressOk = async (page, win, label) => {
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
        await win.root.getByRole('button', {name: 'OK', exact: true}).click();
        const res = await saved;
        const body = await res.text().catch(() => '');
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
        await idle(page);
        await sleep(1000);
        const open = await win.roleSelect().isVisible().catch(() => false);
        const s = await screen(page);
        record(`${label}`, s);
        await shot(page, `${label}-${RUN}`);
        const errors = open
            ? await win.root.locator('.error, .pkp_form_error, label.error, [class*="Error"]').evaluateAll((els) =>
                els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean))
            : [];
        fact(`${label}.response`, {status: res.status(), jsonStatus: json && json.status,
            contentLength: json && json.content ? json.content.length : 0,
            events: json && json.events ? json.events.map((e) => e.name) : null,
            mentionsUserRequired: /must select a user/i.test(body)});
        fact(`${label}.windowOpen`, open);
        if (open) {
            fact(`${label}.role`, await win.selectedRole());
            fact(`${label}.people`, await win.peopleNames());
            fact(`${label}.chosen`, await win.root.locator('input[name="userId"]:checked').count());
        }
        fact(`${label}.errorTexts`, errors);
        fact(`${label}.notices`, s.notices);
        fact(`${label}.dialogText`, flat(s.text.dialog, 600));
        fact(`${label}.minoueAssignments`, assignments());
        fact(`${label}.assignmentRows`, rowCount());
    };

    const {page, close} = await launch(app);
    try {
        fact('before.minoueAssignments', assignments());
        fact('before.assignmentRows', rowCount());

        // 1. dbarnes opens the submission
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        record('step1-workflow', await screen(page));

        // 2. "Assign"
        const win = await panel.openAssign();
        fact('step2.roles', await win.roleOptions());
        fact('step2.firstRole', await win.selectedRole());
        fact('step2.people', await win.peopleNames());
        record('step2-assign', await screen(page));

        // 3. "OK" with nobody chosen
        await pressOk(page, win, 'step3-ok-nobody');

        // 4. the editor role, "Search"
        await win.chooseRole(c.editorRole);
        await win.search();
        fact('step4.people', await win.peopleNames());

        // 5. "Minoti Inoue"
        await win.choosePerson(PERSON.name);
        fact('step5.chosen', await win.person(PERSON.name).locator('input[name="userId"]').isChecked());

        // 6. role "Author", no "Search"
        await win.chooseRole('Author');
        fact('step6.role', await win.selectedRole());
        fact('step6.people', await win.peopleNames());
        fact('step6.chosenStill', await win.person(PERSON.name).locator('input[name="userId"]').isChecked().catch(() => null));
        record('step6-author-no-search', await screen(page));

        // 7. "OK"
        await pressOk(page, win, 'step7-ok-previous-role');

        // the panel, landed afresh
        await panel.reland();
        await panel.rows().first().waitFor({timeout: 30_000}).catch(() => {});
        fact('after.rows', await panel.rowLines());
    } finally {
        record('facts', facts);
        await close();
    }
});
