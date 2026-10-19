// U21 claim check H19 (housekeeping 2026-10-19, incidentals row "which role a user without a
// submitting role is enrolled in"). On PKP's default test dataset (a dataset fleet, freshly
// reset), OJS and OMP main:
//   1. a user with no submitting role presses "Begin Submission" on "Make a Submission";
//   2. another such user's session sends the same POST /api/v1/submissions the screen sends;
//   3. rvaca opens Settings > Users & Roles > Roles, "Author" > "Edit", "OK" unchanged;
//      a third user begins a submission;
//   4. rvaca changes "Consider role in masthead list" on "Author" and changes it back;
//      a fourth user begins one and a fifth sends the API call;
//   5. OMP: the same change and change-back on "Chapter Author"; a sixth user begins one.
// After each phase rvaca reads the users' "Roles" cell on Settings > Users & Roles > Users.
// The storage position (ctid) of the author-role rows is read as evidence beside each phase.
//   PROBE_FEATURE=issues-cc19g PKP_E2E_DATASET=8 PROBE_AGENT=cc19g PROBE_RUN=r1 node bin/probe.js ojs shared/playwright/checks/U21/H19/h19.js
// Reset the fleet before each run (it enrols the users): npm run fleet-prep -- --feature issues-cc19g --dataset 8 --reset
const {forEachApp, launch, signIn, signOut, screen, record, idle, note, sql, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const MASTHEAD = 'Consider role in masthead list';

/** Users with no submitting role in the dataset, per app, in the order the phases take them. */
const USERS = {
    ojs: {u1: 'jjanssen', a1: 'phudson', u2: 'amccrae', u3: 'agallego', a2: 'cturner'},
    omp: {u1: 'jjanssen', a1: 'phudson', u2: 'amccrae', u3: 'agallego', a2: 'alzacharia', u4: 'gfavio'},
};
const STAGES = {
    ojs: ['Submission', 'Review', 'Copyediting', 'Production'],
    omp: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'],
};

function storage(app) {
    try {
        return sql(app, "select ug.user_group_id || ':' || coalesce(s.setting_value, '') || ':' || ug.ctid::text || ':selfreg=' || ug.permit_self_registration from user_groups ug left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where ug.context_id = 1 and ug.role_id = 65536").split('\n');
    } catch (e) {
        return String(e.message || e).slice(0, 200);
    }
}

/** Evidence only: the groups the user holds in the context. */
function held(app, username) {
    try {
        return sql(app, `select string_agg(coalesce(s.setting_value, ug.user_group_id::text), ', ' order by ug.user_group_id) from user_user_groups uug join users u on u.user_id = uug.user_id join user_groups ug on ug.user_group_id = uug.user_group_id left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username = '${username}' and ug.context_id = 1`);
    } catch (e) {
        return String(e.message || e).slice(0, 200);
    }
}

async function openStart(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
}

const submitAsSet = (page) => page.getByRole('group', {name: /^Submit As\b/});

async function readStartPage(page) {
    const set = submitAsSet(page);
    const submitAs = (await set.count()) ? flat(await set.innerText()) : null;
    const nav = await page.locator('.app__body > nav').count();
    return {submitAs, sideNav: nav > 0};
}

async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

async function fillStart(page, title) {
    await typeRich(page, 'startSubmission-title-control', title);
    const sec = page.getByRole('radio', {name: 'Articles', exact: true});
    if (await sec.count()) await sec.check();
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
        const b = page.getByRole('checkbox', {name});
        if (await b.count()) await b.check();
    }
}

/** "Begin Submission": the POST's status and body, then the wizard's id and current step, or the form's error. */
async function pressBegin(page) {
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/submissions(\?|$)/.test(r.url()), {timeout: T});
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    const followUp = [];
    const onResp = (x) => { if (/\/api\/v1\/submissions\/\d+/.test(x.url())) followUp.push(`${x.request().headers()['x-http-method-override'] || x.request().method()} ${x.status()} ${x.url().replace(/^.*\/api\/v1/, '')}`); };
    page.on('response', onResp);
    const r = await posted;
    const sent = (() => { try { return r.request().postDataJSON() || {}; } catch (e) { return {}; } })();
    const out = {status: r.status(), sent, id: null, step: null, error: null, url: null};
    if (r.status() >= 400) {
        out.answer = await r.json().catch(() => null);
        await idle(page);
        out.error = flat(await page.locator('.pkpFieldError, .pkpFormError, [role="alert"]').allInnerTexts().catch(() => null));
    } else {
        try {
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
            out.id = Number(new URL(page.url()).searchParams.get('id'));
            out.step = flat(await page.locator('.pkpSteps__step__label--current').innerText());
        } catch (e) {
            out.error = 'wizard did not open: ' + String(e.message || e).split('\n')[0];
        }
    }
    await idle(page).catch(() => {});
    page.off('response', onResp);
    out.followUp = followUp;
    out.url = page.url();
    return out;
}

/** Evidence only: the stored title and the submitter's stage assignment group of a submission. */
function stored(app, id) {
    if (!id) return null;
    try {
        return sql(app, `select coalesce((select ps.setting_value from publications p join publication_settings ps on ps.publication_id = p.publication_id and ps.setting_name = 'title' and ps.locale = 'en' where p.submission_id = ${id} limit 1), '(no title)') || ' | assigned as ' || coalesce((select string_agg(coalesce(s.setting_value, sa.user_group_id::text), ', ') from stage_assignments sa left join user_group_settings s on s.user_group_id = sa.user_group_id and s.setting_name = 'name' and s.locale = 'en' where sa.submission_id = ${id}), '(none)')`);
    } catch (e) {
        return String(e.message || e).slice(0, 200);
    }
}

/**
 * The wizard after "Begin Submission": reload it (what shows after a reload), "Continue" to
 * "Details", a title typed, "Continue" again; the saves' answers and what the screen shows;
 * then leave for the dashboard with a change typed and unsaved (the dialogs on the way out).
 */
async function wizardTry(page, app, id, name) {
    const out = {saves: []};
    const onResp = (x) => { if (/\/api\/v1\/submissions\/\d+/.test(x.url()) && x.request().method() !== 'GET') out.saves.push(`${x.request().headers()['x-http-method-override'] || x.request().method()} ${x.status()} ${x.url().replace(/^.*\/api\/v1/, '')}`); };
    page.on('response', onResp);
    try {
        await page.reload();
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
        await idle(page).catch(() => {});
        const s0 = await screen(page);
        record(`${name}-after-begin-reload`, s0);
        out.headerAfterReload = flat((s0.text.header || '') + ' / ' + (s0.text.main || '').split('\n')[0], 200);
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await page.locator('.pkpSteps__step__label--current').filter({hasText: 'Details'}).waitFor({timeout: T});
        await idle(page).catch(() => {});
        await typeRich(page, 'titleAbstract-title-control-en', `${name} details title`);
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await page.waitForTimeout(1500);
        await idle(page).catch(() => {});
        const s1 = await screen(page);
        record(`${name}-details-continue`, s1);
        out.stepAfterContinue = flat(await page.locator('.pkpSteps__step__label--current').innerText().catch(() => null));
        out.noticesAfterContinue = s1.notices;
        out.errorsShown = flat((await page.locator('.pkpFormError, .pkpFieldError, .pkpNotification, [role="alert"]').allInnerTexts().catch(() => [])).join(' | '), 400);
        // leave with a change typed and unsaved
        await page.getByRole('button', {name: 'Back', exact: true}).click().catch(() => {});
        await page.locator('.pkpSteps__step__label--current').filter({hasText: 'Details'}).waitFor({timeout: 10_000}).catch(() => {});
        await typeRich(page, 'titleAbstract-title-control-en', `${name} unsaved`).catch((e) => { out.unsavedTypeError = String(e.message).split('\n')[0]; });
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
        await idle(page).catch(() => {});
        record(`${name}-left-wizard`, await screen(page));
    } catch (e) {
        out.error = String(e.message || e).split('\n')[0].slice(0, 300);
        record(`${name}-wizard-error`, await screen(page).catch(() => null));
    }
    page.off('response', onResp);
    return out;
}

/** The user's whole "Begin Submission" drive; records the start page and the page after. */
async function beginAs(page, app, username, name) {
    await signIn(page, username);
    await openStart(page, app);
    const start = await readStartPage(page);
    record(`${name}-start`, await screen(page));
    await fillStart(page, `${tag('cc19g')} ${name}`);
    const begin = await pressBegin(page);
    record(`${name}-after-begin`, await screen(page));
    let wizard = null;
    if (begin.id) wizard = await wizardTry(page, app, begin.id, name);
    await signOut(page);
    return {username, start, begin: {status: begin.status, sentUserGroupId: begin.sent.userGroupId ?? null, id: begin.id, step: begin.step, error: begin.error, answer: begin.answer, followUp: begin.followUp}, wizard, sentKeys: Object.keys(begin.sent), sent: begin.sent, held: held(app, username), stored: stored(app, begin.id)};
}

/**
 * The same POST the start page sends, from the user's own session on the start page
 * (apiBaseUrl and csrf token read from the page), with the body the screen sent earlier.
 */
async function apiAddAs(page, app, username, body, name) {
    await signIn(page, username);
    await openStart(page, app);
    record(`${name}-start`, await screen(page));
    const {api, csrf} = await page.evaluate(() => ({api: window.pkp && pkp.context && pkp.context.apiBaseUrl, csrf: window.pkp && pkp.currentUser && pkp.currentUser.csrfToken}));
    const payload = {...body, title: {en: `${tag('cc19g')} ${name}`}};
    delete payload.userGroupId;
    const r = await page.request.post(`${api}submissions`, {data: payload, headers: {'X-Csrf-Token': csrf}});
    const json = await r.json().catch(() => null);
    const out = {username, status: r.status(), id: json && json.id, answer: r.status() >= 400 ? json : undefined, held: held(app, username)};
    await signOut(page);
    return out;
}

/** As rvaca: Settings > Users & Roles > Users, each user's row by email, its "Roles" cell. */
async function readRoles(page, app, usernames, name) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    await signIn(page, 'rvaca');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    const out = {};
    for (const u of usernames) {
        await list.search(`${u}@mailinator.com`);
        await idle(page);
        const row = list.row(`${u}@mailinator.com`);
        out[u] = (await row.count()) ? await list.cellLines(list.rolesCell(row.first())) : 'no row';
    }
    record(`${name}-users-list`, await screen(page));
    await signOut(page);
    return out;
}

/** As rvaca: Settings > Users & Roles > Roles, a row's "Edit", optionally flipping the masthead option, "OK". */
async function saveRole(page, app, role, {flip}) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    await signIn(page, 'rvaca');
    const tab = new RolesTab(page, app.contextPath, {stages: STAGES[app.name]});
    await tab.goto();
    const listBefore = await tab.rowNames();
    const out = {role, flip, listBefore};
    try {
        let win = await tab.openEdit(role);
        record(`role-${role.replace(/\W+/g, '')}-${flip ? 'flip' : 'ok'}-window`, await screen(page));
        const box = win.optionBox(MASTHEAD);
        out.mastheadBefore = await box.isChecked();
        if (flip) await box.setChecked(!out.mastheadBefore);
        out.status1 = (await win.save()).status();
        if (flip) {
            win = await tab.openEdit(role);
            const box2 = win.optionBox(MASTHEAD);
            out.mastheadMid = await box2.isChecked();
            await box2.setChecked(out.mastheadBefore);
            out.status2 = (await win.save()).status();
        }
        await tab.reload();
        out.listAfterReload = await tab.rowNames();
        // read the option again after the reload
        win = await tab.openEdit(role);
        out.mastheadAfterReload = await win.optionBox(MASTHEAD).isChecked();
        await win.cancel();
    } catch (e) {
        out.error = String(e.message || e).split('\n')[0].slice(0, 300);
    }
    record(`role-${role.replace(/\W+/g, '')}-${flip ? 'flip' : 'ok'}-after`, await screen(page));
    await signOut(page);
    return out;
}

forEachApp(async (app) => {
    if (!USERS[app.name]) return;
    const U = USERS[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, phases: {}};
    const {page, close} = await launch(app);
    try {
        facts.storage0 = storage(app);
        // Phase 1: control, before any role is saved
        const p1 = {begin: await beginAs(page, app, U.u1, 'p1-begin')};
        p1.api = await apiAddAs(page, app, U.a1, p1.begin.sent, 'p1-api');
        p1.roles = await readRoles(page, app, [U.u1, U.a1], 'p1');
        facts.phases.p1 = p1;

        // Phase 2: "Author" > Edit > OK unchanged
        const p2 = {save: await saveRole(page, app, 'Author', {flip: false})};
        p2.storage = storage(app);
        p2.begin = await beginAs(page, app, U.u2, 'p2-begin');
        p2.roles = await readRoles(page, app, [U.u2], 'p2');
        facts.phases.p2 = p2;

        // Phase 3: "Author" masthead option changed and changed back
        const p3 = {save: await saveRole(page, app, 'Author', {flip: true})};
        p3.storage = storage(app);
        p3.begin = await beginAs(page, app, U.u3, 'p3-begin');
        p3.api = await apiAddAs(page, app, U.a2, p1.begin.sent, 'p3-api');
        p3.roles = await readRoles(page, app, [U.u3, U.a2], 'p3');
        facts.phases.p3 = p3;

        // Phase 4 (OMP): "Chapter Author" changed and changed back too
        if (U.u4) {
            const p4 = {save: await saveRole(page, app, 'Chapter Author', {flip: true})};
            p4.storage = storage(app);
            p4.begin = await beginAs(page, app, U.u4, 'p4-begin');
            p4.roles = await readRoles(page, app, [U.u4], 'p4');
            facts.phases.p4 = p4;
        }
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await screen(page).then((s) => record('error-screen', s)).catch(() => {});
    } finally {
        record('facts', facts);
        const brief = {};
        for (const [k, p] of Object.entries(facts.phases)) {
            brief[k] = {
                save: p.save && {status: [p.save.status1, p.save.status2], err: p.save.error},
                storage: p.storage,
                begin: p.begin && {u: p.begin.username, start: p.begin.start, ...p.begin.begin, held: p.begin.held, stored: p.begin.stored, wizard: p.begin.wizard},
                api: p.api && {u: p.api.username, status: p.api.status, id: p.api.id, held: p.api.held, answer: p.api.answer},
                roles: p.roles,
            };
        }
        console.log(JSON.stringify({app: app.name, run: facts.run, storage0: facts.storage0, brief, error: facts.error}, null, 1));
        await close();
    }
});
