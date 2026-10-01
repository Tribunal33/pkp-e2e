// Issue report walk: docs/issues/U21-A8-auto-assigned-editor-never-assigned-second-journal.md
// (spec U21 register A8). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its `admin`, `dbuskins`, an author (`ccorino`, OMP `aclark`) and its
// context `publicknowledge`. Everything else is created on screen, names
// tagged u21w33; the kit builds nothing. Step numbers are the report's:
//   1-2  admin: Administration › Hosted … › "Create …" path `u21w33`, English,
//        enabled publicly
//   3    admin: the u21w33 row › "Settings wizard" › "Users": dbuskins ›
//        "Edit User", the editor role ticked ("Section editor", "Series
//        editor", "Moderator"), "OK"
//   4    admin: u21w33 › Settings › Sections ("Articles" › "Edit"; OMP "Add
//        Series" "u21w33 Series"): dbuskins ticked under "Editorial
//        Assignments", "Save"
//   5    author: Profile › "Roles" › "Register with other …": "Author" in u21w33
//   6    author: "u21w33 Tide Tables" through the submission wizard in u21w33
//   7    mailboxes of dbuskins and admin (Mailpit, this run's messages only)
//   8    dbuskins: u21w33's dashboard, the submission's workflow (participants)
// CONTROL (the default, CONTROL=0 skips it): steps 6–8 on publicknowledge,
// whose "Articles" section ("Library & Information Studies" series,
// "Preprints" section) the dataset assigns to dbuskins: "u21w33 Control Tides".
// NEIGHBOUR=1 (the fix's neighbour check): step 4 ticks no one; the
// submission must arrive with no editor and the manager's "needs an editor"
// email must go out, as before the fix.
// Besides the screens it reads, from the database, the submission's stage
// assignments and the section's configured editors (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w33 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-w33 PROBE_AGENT=w33 node bin/probe.js all shared/playwright/checks/issues/auto-assigned-editor-never-assigned-second-journal/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w33-3_5 PROBE_AGENT=w33 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w33/facts[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u21w33';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const PDF = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files/article.pdf');
const L = {
    ojs: {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', name: `${TAG} Second Journal`, initials: 'U21W33',
        role: 'Section editor', tab: 'Sections', addLabel: 'Create Section', section: 'Articles', newSection: null,
        controlSection: 'Articles', author: 'ccorino', wizardUsersTab: 'Users'},
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', name: `${TAG} Second Press`, initials: 'U21W33',
        role: 'Series editor', tab: 'Series', addLabel: 'Add Series', section: `${TAG} Series`, newSection: `${TAG} Series`,
        controlSection: 'Library & Information Studies', author: 'aclark', wizardUsersTab: 'Users'},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', name: `${TAG} Second Server`, initials: 'U21W33',
        role: 'Moderator', tab: 'Sections', addLabel: 'Create Section', section: 'Preprints', newSection: null,
        controlSection: 'Preprints', author: 'ccorino', wizardUsersTab: 'Users'},
};
const EDITOR = 'dbuskins';
const EDITOR_NAME = 'David Buskins';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const A = L[app.name];
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';
    const neighbour = !!process.env.NEIGHBOUR;
    const control = process.env.CONTROL !== '0';
    const started = new Date(Date.now() - 2000);
    const facts = {line, dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, startedAt: started.toISOString()};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const T_ = app.contextTables;
    const ctxId = (p) => sql(app, `select ${T_.id} from ${T_.table} where path = '${p}'`);
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try {
            const s = await screen(page);
            record(name, s);
            await shot(page, name).catch(() => {});
            return s;
        } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const errors = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => errors.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', (r) => { if (r.status() >= 400) errors.push({who, kind: 'http', text: `${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
    };
    // This run's messages to one address whose subject matches.
    const mails = async (to, subjectRe) => {
        const r = await app.mail._search({to});
        return (r.messages || [])
            .filter((m) => new Date(m.Created) >= started)
            .filter((m) => !subjectRe || subjectRe.test(m.Subject))
            .map((m) => ({subject: m.Subject, created: m.Created}));
    };

    const ctx = TAG;
    const editorAssignedRe = /You have been assigned as an? (editor|moderator) on a submission to/;
    const needsEditorRe = /A new submission needs an editor to be assigned/;

    try {
        // Steps 1-4: admin.
        {
            const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
            const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
            const {SectionsTab} = require('../../../pages/SectionsPages.js');
            const {page, close} = await launch(app);
            watch(page, 'admin');
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'admin');
                // Step 2: the second context.
                await page.goto(app.url(`/index.php/index${loc}/admin/contexts`));
                await idle(page);
                const hosted = new HostedJournalsPage(page, A);
                const win = await hosted.openCreate();
                await win.type(win.title('en'), A.name);
                if (await win.initials('en').count()) await win.type(win.initials('en'), A.initials);
                await win.type(win.contactName, `${TAG} Contact`);
                await win.type(win.contactEmail, `${TAG}@mailinator.com`);
                await win.country.selectOption({label: 'Canada'});
                await win.type(win.path, ctx);
                if (await win.languageBoxes.count()) {
                    await win.setBox(win.languageBox('en'), true);
                    if (await win.primaryChoice('en').count()) await win.primaryChoice('en').check();
                }
                const enable = await win.enableBox.count();
                if (enable) await win.setBox(win.enableBox.first(), true);
                await rec(page, 's2-create-filled');
                const r = await win.pressSave();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page); await pause(500);
                await rec(page, 's2-created');
                fact('step 2 create', {status: r.status(), enableBoxOnCreate: !!enable, contextId: ctxId(ctx),
                    userGroups: sql(app, `select count(*) || ' groups, ids ' || min(user_group_id) || '-' || max(user_group_id) from user_groups where context_id = (select ${T_.id} from ${T_.table} where path = '${ctx}')`)});

                // Step 3: dbuskins gets the editor role in the new context.
                await page.goto(app.url(`/index.php/index${loc}/admin/contexts`));
                await idle(page);
                const hc = new HostedContextsPage(page, {hostedLabel: A.hosted});
                await hc.openSettingsWizard(ctx);
                await rec(page, 's3-settings-wizard');
                const grid = await hc.openWizardTab(A.wizardUsersTab);
                await grid.search({text: EDITOR, includeNoRole: true});
                await rec(page, 's3-users-search');
                await grid.chooseAction(EDITOR, 'Edit User');
                const edit = new UserDetailsWindow(page, 'Edit User');
                await edit.expectOpen();
                await rec(page, 's3-edit-user');
                const box = edit.roleBox(A.role);
                fact('step 3 role box', {label: A.role, count: await box.count()});
                await box.check();
                await edit.pressOk();
                await pause(1000); await idle(page);
                await rec(page, 's3-edit-user-saved');
                fact('step 3 roles', sql(app, `select string_agg(s.setting_value, ', ') from user_user_groups uug join user_groups g using (user_group_id) join user_group_settings s on s.user_group_id = g.user_group_id and s.setting_name = 'name' and s.locale = 'en' where uug.user_id = (select user_id from users where username = '${EDITOR}') and g.context_id = (select ${T_.id} from ${T_.table} where path = '${ctx}')`));

                // Step 4: the section's "Editorial Assignments".
                const tab = new SectionsTab(page, ctx, {tab: A.tab, addLabel: A.addLabel, locale: loc.replace('/', '')});
                await tab.goto();
                await rec(page, 's4-sections');
                const sw = A.newSection ? await tab.openAdd() : await tab.openEdit(A.section);
                if (A.newSection) { await sw.type('title[en]', A.newSection); await sw.type('path', TAG); }
                const assignLabel = `Assign ${EDITOR_NAME} as ${A.role}`;
                const assign = sw.checkbox(assignLabel);
                fact('step 4 assignment boxes', await sw.assignmentBoxes().evaluateAll((els) => els.map((e) => ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || e.name).replace(/\s+/g, ' ').trim())));
                if (!neighbour) await assign.check();
                await rec(page, 's4-section-filled');
                const saved = await sw.saveAndClose();
                await idle(page);
                await rec(page, 's4-section-saved');
                fact('step 4 save', {status: saved.status(), ticked: !neighbour, editorsCell: flat(await tab.editorsCell(A.section).innerText().catch(() => null)),
                    configured: sql(app, `select string_agg(u.username || '@group' || s.user_group_id, ', ') from subeditor_submission_group s join users u using (user_id) where s.context_id = (select ${T_.id} from ${T_.table} where path = '${ctx}')`)});
                await signOut(page);
            } finally { await close(); }
        }

        // Steps 5-6: the author registers with the new context and submits; the control submission.
        const submitted = {};
        {
            const {ProfilePage} = require('../../../pages/ProfilePage.js');
            const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
            const {page, close} = await launch(app);
            watch(page, A.author);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, A.author);
                // Step 5.
                const profile = new ProfilePage(page, app.contextPath);
                await profile.goto('roles');
                if (!(await profile.isOtherContextsOpen().catch(() => false))) await profile.toggleOtherContexts();
                await pause(500);
                const authorBox = profile.contextRoleBox(A.name, 'Author');
                await authorBox.check();
                await rec(page, 's5-roles-filled');
                await profile.save();
                await idle(page); await pause(500);
                await rec(page, 's5-roles-saved');
                fact('step 5 roles', sql(app, `select string_agg(s.setting_value, ', ') from user_user_groups uug join user_groups g using (user_group_id) join user_group_settings s on s.user_group_id = g.user_group_id and s.setting_name = 'name' and s.locale = 'en' where uug.user_id = (select user_id from users where username = '${A.author}') and g.context_id = (select ${T_.id} from ${T_.table} where path = '${ctx}')`));

                // Step 6 (and the control on publicknowledge).
                const submit = async (target, title, section, label) => {
                    await page.goto(app.url(`/index.php/${target}${loc}/submission`));
                    await idle(page);
                    const iframe = page.locator('iframe.tox-edit-area__iframe').first();
                    await waitForEditorReady(page, await editorIdOf(iframe));
                    const body = iframe.contentFrame().locator('body');
                    await body.click();
                    await body.fill(title);
                    const radio = page.getByRole('radio', {name: section, exact: true});
                    if (await radio.isVisible().catch(() => false)) await radio.check();
                    // publicknowledge offers two submission languages.
                    const english = page.getByRole('radio', {name: 'English', exact: true});
                    if (await english.isVisible().catch(() => false)) await english.check();
                    for (const box of await page.getByRole('checkbox').all()) {
                        if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
                    }
                    await rec(page, `${label}-start`);
                    await page.getByRole('button', {name: 'Begin Submission'}).click();
                    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
                    const id = Number(new URL(page.url()).searchParams.get('id'));
                    await idle(page);
                    let uploaded = false;
                    const current = page.locator('.pkpSteps__step__label--current');
                    const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                    for (let i = 0; i < 9; i++) {
                        const step = flat(await current.innerText().catch(() => ''));
                        if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
                        if (/Upload Files$/.test(step) && !uploaded) {
                            if (app.name === 'ops') {
                                const {addGalleyFile} = require(path.join(__dirname, '../../../../../apps/ops/playwright/pages/SubmissionWizardPages.js'));
                                await addGalleyFile(page, {label: 'PDF', file: PDF});
                            } else {
                                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                                const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                                await genre.waitFor({timeout: T});
                                const g = flat(await genre.innerText());
                                await genre.click();
                                await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: g}).first().waitFor({timeout: T});
                            }
                            uploaded = true;
                        }
                        if (/Details$/.test(step)) {
                            const abs = page.locator('iframe[id^="titleAbstract-abstract-control-en"]').first();
                            if (await abs.count()) {
                                await waitForEditorReady(page, 'titleAbstract-abstract-control-en');
                                const b = page.frameLocator('#titleAbstract-abstract-control-en_ifr').locator('body');
                                await b.click();
                                await b.fill('Tides follow the moon.');
                            }
                        }
                        // OMP: the series is chosen on "For the Editors".
                        const seriesRadio = page.getByRole('radio', {name: section, exact: true});
                        if (await seriesRadio.isVisible().catch(() => false)) await seriesRadio.check();
                        const relation = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
                        if (await relation.isVisible().catch(() => false)) await relation.check();
                        await cont.click();
                        await page.waitForFunction((prev) => {
                            const el = document.querySelector('.pkpSteps__step__label--current');
                            return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
                        }, step, {timeout: T}).catch(() => {});
                        await idle(page);
                    }
                    await pause(1000);
                    for (const box of await page.getByRole('checkbox').all()) {
                        if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
                    }
                    await rec(page, `${label}-review`);
                    await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
                    const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
                    await dialog.waitFor({timeout: T});
                    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
                    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
                    await idle(page);
                    await rec(page, `${label}-complete`);
                    const sectionCol = app.name === 'omp' ? 'series_id' : 'section_id';
                    return {id, section: sql(app, `select ${sectionCol} from publications where publication_id = (select current_publication_id from submissions where submission_id = ${id})`)};
                };
                submitted.own = await submit(ctx, `${TAG} Tide Tables`, A.section, 's6');
                fact('step 6 submitted', submitted.own);
                if (control) {
                    submitted.control = await submit(app.contextPath, `${TAG} Control Tides`, A.controlSection, 'c6');
                    fact('control 6 submitted', submitted.control);
                }
                await signOut(page);
            } finally { await close(); }
        }

        // Step 7: the mailboxes (the job runner sends on web requests; give it a moment).
        await pause(4000);
        const assignedToEditor = await mails(`${EDITOR}@mailinator.com`, editorAssignedRe);
        const needsToAdmin = await mails('pkpadmin@mailinator.com', needsEditorRe);
        fact('step 7 mail', {
            toDbuskinsEditorAssigned: assignedToEditor,
            toAdminNeedsEditor: needsToAdmin,
        });
        const stage = (id) => sql(app, `select string_agg(u.username || ' as ' || (select setting_value from user_group_settings where user_group_id = sa.user_group_id and setting_name = 'name' and locale = 'en'), ', ' order by sa.stage_assignment_id) from stage_assignments sa join users u using (user_id) where sa.submission_id = ${id}`);
        fact('step 7 stage assignments (db)', {own: stage(submitted.own.id), control: submitted.control ? stage(submitted.control.id) : null});

        // Step 8: dbuskins's dashboard and the workflow.
        {
            const {page, close} = await launch(app);
            watch(page, EDITOR);
            page.setDefaultTimeout(T);
            try {
                await signIn(page, EDITOR);
                const look = async (target, id, title, label) => {
                    await page.goto(app.url(`/index.php/${target}${loc}/dashboard/editorial`));
                    await idle(page); await pause(1500);
                    const dash = await rec(page, `${label}-dashboard`);
                    const dashText = dash && dash.text ? String(dash.text.main || '') : '';
                    const r = await page.goto(app.url(`/index.php/${target}${loc}/dashboard/editorial?workflowSubmissionId=${id}`));
                    await idle(page); await pause(2000);
                    const wf = await rec(page, `${label}-workflow`);
                    const dialog = wf && wf.text ? String(wf.text.dialog || '') : '';
                    return {dashboardListsIt: dashText.includes(title), dashboardHead: flat(dashText, 400), workflowStatus: r ? r.status() : null,
                        workflowParticipants: flat((dialog.match(/participants[\s\S]{0,300}/i) || [""])[0], 300), workflowListsEditor: dialog.includes(EDITOR_NAME), workflowText: flat(dialog || (wf && wf.text && wf.text.main), 600)};
                };
                fact('step 8 dbuskins own', await look(ctx, submitted.own.id, `${TAG} Tide Tables`, 's8'));
                if (submitted.control) fact('control 8 dbuskins', await look(app.contextPath, submitted.control.id, `${TAG} Control Tides`, 'c8'));
                await signOut(page);
            } finally { await close(); }
        }
        // The admin's view of the new submission's participants (what the managers see).
        {
            const {page, close} = await launch(app);
            watch(page, 'admin');
            try {
                await signIn(page, 'admin');
                await page.goto(app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${submitted.own.id}`));
                await idle(page); await pause(2000);
                const wf = await rec(page, 's8-admin-workflow');
                const dialog = wf && wf.text ? String(wf.text.dialog || '') : '';
                const m = dialog.match(/participants[\s\S]{0,400}/i);
                fact('step 8 admin workflow participants', flat(m ? m[0] : dialog, 500));
                await signOut(page);
            } finally { await close(); }
        }
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('errors', errors);
        record('facts', facts);
    }
});
