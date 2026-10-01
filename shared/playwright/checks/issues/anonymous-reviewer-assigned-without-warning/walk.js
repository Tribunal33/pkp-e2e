// Issue report docs/issues/U35-A11-anonymous-reviewer-assigned-without-warning.md
// (U35 A11): an editor choosing, in "Assign Participant", a person who
// reviews the submission anonymously gets no warning, and "OK" assigns them.
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS (submission 12, Review) and
// OMP (submission 17, Internal Review); OPS has no review stage:
//   phudson: "Edit Profile" › "Roles", tick "Author", "Save", sign out;
//   dbarnes: the submission, "Assign", role "Author", "Search" "Hudson",
//   "Paul Hudson" (the warning is expected here), "OK".
// Also reads, for Evidence, the reviewer list the window's script receives
// (the add-participant response) and the stage assignment in the database.
// 3.5 (PKP_E2E_LINE=stable-3_5_0) has the same profile, workflow and window.
// Run: PROBE_FEATURE=issues-w29 PROBE_AGENT=w29 node bin/probe.js all shared/playwright/checks/issues/anonymous-reviewer-assigned-without-warning/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w29 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w29-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 12},
    omp: {sid: 17},
};
const REVIEWER = {name: 'Paul Hudson', username: 'phudson'};
const WARNING = 'The participant you selected has been assigned to conduct an anonymous review.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const c = CASE[app.name];
    if (!c) {
        fact('skipped', 'no review stage');
        record('facts', facts);
        return;
    }
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {ProfilePage} = require('../../../pages/ProfilePage.js');

    const {page, close} = await launch(app);
    const formData = [];
    page.on('response', async (r) => {
        if (/add-participant/.test(r.url())) {
            const body = await r.text().catch(() => '');
            const m = body.match(/anonymousReviewerIds:\s*(\[[^\]]*\])/);
            formData.push({status: r.status(), anonymousReviewerIds: m ? m[1].replace(/\\/g, '') : null});
        }
    });
    try {
        // 1.-2. the reviewer takes "Author" in "Edit Profile" › "Roles"
        await signIn(page, REVIEWER.username);
        const profile = new ProfilePage(page, app.contextPath);
        await profile.goto('roles');
        fact('step1.roleBoxes', await profile.currentContextRoleLabels());
        await profile.roleBox('Author').check();
        await profile.save();
        record('step2-profile-saved', await screen(page));
        await signOut(page);

        // 3. dbarnes opens the submission (its current, review stage)
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        record('step3-workflow', await screen(page));

        // 4. "Assign", role "Author", "Search" "Hudson"
        const win = await panel.openAssign();
        await win.chooseRole('Author');
        await win.search('Hudson');
        fact('step4.people', await win.peopleNames());
        fact('step4.windowData', formData);

        // 5. "Paul Hudson": the warning is expected
        await win.choosePerson(REVIEWER.name);
        const warning = page.getByText(WARNING);
        const shown = await warning.first().waitFor({state: 'visible', timeout: 5_000}).then(() => true, () => false);
        const s5 = await screen(page);
        record('step5-chosen', s5);
        await shot(page, `step5-chosen-${RUN}`);
        fact('step5.warningShown', shown);
        if (shown) {
            const dialog = page.getByRole('dialog').filter({hasText: WARNING}).last();
            fact('step5.warningText', flat(await dialog.innerText(), 800));
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page);
        }

        // 6. "OK"
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
        await win.root.getByRole('button', {name: 'OK', exact: true}).click();
        const res = await saved;
        await idle(page);
        await sleep(1000);
        const s6 = await screen(page);
        record('step6-ok', s6);
        await shot(page, `step6-ok-${RUN}`);
        fact('step6.response', {status: res.status()});
        fact('step6.notices', s6.notices);
        fact('step6.assigned', sql(app,
            `select ug.user_group_id || ':' || coalesce((select setting_value from user_group_settings s where s.user_group_id=ug.user_group_id and setting_name='name' and locale='en'),'') ` +
            `from stage_assignments sa join users u on u.user_id=sa.user_id join user_groups ug on ug.user_group_id=sa.user_group_id ` +
            `where sa.submission_id=${c.sid} and u.username='${REVIEWER.username}'`));
        fact('review', sql(app,
            `select ra.review_method || '|' || ra.declined || '|' || ra.stage_id from review_assignments ra join users u on u.user_id=ra.reviewer_id ` +
            `where ra.submission_id=${c.sid} and u.username='${REVIEWER.username}'`));
    } finally {
        record('facts', facts);
        await close();
    }
});
