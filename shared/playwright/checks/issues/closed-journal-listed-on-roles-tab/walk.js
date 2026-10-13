// Kept walk of issue report docs/issues/U03-A4-closed-journal-listed-on-roles-tab.md (U03 A4).
// On PKP's default test dataset, through the screens; the kit builds nothing. Fact keys follow
// the report's steps:
//   1-2  `admin` creates "u03rf Open Journal" (u03rfopen) and "u03rf Closed Journal" (u03rfclosed)
//        on Administration › Hosted Journals (Presses, Servers), both public
//   3    u03rfclosed's Settings › Users & Roles › Site Access Options: manager-only registration
//   4-5  `dbarnes`: the Profile page in u03rfclosed, "Roles"
//   6    the Profile page in publicknowledge, "Roles", the fold opened
//   7    `admin`: the site-level Profile page, "Roles"
//   8    (reach) signed out: the site-wide Register page
//
// `neighbour` as argument walks, after the same steps 1-3, only what a fix must leave alone or
// shows on its own instead:
//   n1  publicknowledge's own tab keeps its boxes
//   n2  ticking "Reader" under the open journal in the fold and "Save" still grants the role
//   n3  the site-wide Register page still offers the two open journals with their boxes
//   n4  (reach) u03rfopen closed as well: u03rfclosed's own tab, where publicknowledge is the
//       only other journal accepting registrations
//
// `roleloss` as argument takes steps 1-3 and 9 (u03rfopen closed, publicknowledge the one journal
// open), then the report's "Saving the closed journal's Roles tab" group:
//   11  signed out: publicknowledge's Register page, a newcomer registers ("Reader")
//   12  publicknowledge's Profile, "Roles", "Author" ticked, "Save"
//   13  u03rfclosed's Profile, "Roles", "Save" with nothing touched
//   14  publicknowledge's Profile, "Roles": which boxes are still ticked
//   15  `admin`: publicknowledge's Settings › Users & Roles, the newcomer's row
//
// `noroles` as argument takes the report's "A journal open to registrations that offers no role":
//   16  `admin` creates "u03rf Open Journal" (u03rfopen) as in step 1, left open to registration
//   17  u03rfopen's Settings › Users & Roles › Roles: "Allow user self-registration" unticked on
//       "Reader" and "Reviewer" (OMP "External Reviewer"; OPS has no reviewer role)
//   18  signed out: the site-wide Register page
//   19  `admin`: the site-level Profile page, "Roles"
//   20  `dbarnes`: publicknowledge's Profile, "Roles", the fold opened
//   21  `admin`: the same unticked on "Author" (OMP also "Chapter Author"); the site-level
//       Profile page, "Roles"
//   22  `dbarnes`: publicknowledge's Profile, "Roles", the fold's link and list
//   23  signed out: the site-wide Register page
// and, as a control the fix must leave alone, publicknowledge's own Register page (its reviewer
// opt-in, read from the same group lists).
//
// `lossscope` as argument takes steps 1-3 and 9, then which roles the Save of step 13 ends when the
// user is a reviewer the dataset gave roles (`shellier`: Reviewer, a self-registering group, and
// Layout Editor, which is not) with a review not yet answered (OJS submission 20); the report's
// steps 24 to 26:
//   s1  `shellier`: publicknowledge's Profile, "Roles"; the review page of submission 20
//   s2  u03rfclosed's Profile, "Roles", "Save" with nothing touched
//   s3  publicknowledge's Profile, "Roles"; the review page again; the user's rows in user_user_groups
// `lossnoroles` takes steps 16-17 and 21's untick (u03rfopen open, self-registration off on every
// role), then s1-s3 with u03rfopen in place of u03rfclosed (the control after the report's Observed).
//
// Reset first:  npm run fleet-prep -- --feature issues-u03f --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u03f PROBE_AGENT=u03f node bin/probe.js all shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/walk.js [neighbour | roleloss | noroles]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u03f-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog, sql} = require('../../../probe');
const L = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const roleloss = process.argv.slice(2).includes('roleloss');
const noroles = process.argv.slice(2).includes('noroles');
const lossscope = process.argv.slice(2).includes('lossscope');
const lossnoroles = process.argv.slice(2).includes('lossnoroles');

/** Per-app role names for the `noroles` group: unticked at step 16, then at step 20. */
const NOROLES = {
    ojs: {first: ['Reader', 'Reviewer'], then: ['Author']},
    omp: {first: ['Reader', 'External Reviewer'], then: ['Author', 'Chapter Author']},
    ops: {first: ['Reader'], then: ['Author']},
};

async function setup(app, page, fact) {
    const s = L.scratchNames(app);
    await signIn(page, 'admin'); // 1
    fact('1-create-open', {status: await L.createJournal(page, app, s.open).catch((e) => `error: ${String(e).slice(0, 300)}`)});
    fact('2-create-closed', {status: await L.createJournal(page, app, s.closed).catch((e) => `error: ${String(e).slice(0, 300)}`)}); // 2
    fact('3-close', await L.closeRegistration(page, app, s.closed.path)); // 3
    record('03-site-access', await screen(page));
    await signOut(page);
    return s;
}

function namesOf(app, s) {
    return [app.name === 'ojs' ? 'Journal of Public Knowledge' : app.name === 'omp' ? 'Public Knowledge Press' : 'Public Knowledge Preprint Server', s.open.name, s.closed.name];
}

async function steps(app, page, fact) {
    const s = await setup(app, page, fact);
    const names = namesOf(app, s);
    await signIn(page, 'dbarnes'); // 4

    let profile = await L.openRoles(page, s.closed.path); // 5
    fact('5-closed-own', await L.readRoles(page, names));
    record('05-closed-own', await screen(page));
    await shot(page, '05-closed-own');

    profile = await L.openRoles(page, app.contextPath); // 6
    fact('6-fold-press', await L.openFold(page, profile));
    fact('6-publicknowledge-fold', await L.readRoles(page, names));
    record('06-publicknowledge-fold', await screen(page));
    await shot(page, '06-publicknowledge-fold');

    // 7: as `admin`, since the site-level address forwards a user with roles in one journal
    // only (dbarnes) to that journal's profile (ProfileHandler::profile()).
    await signOut(page);
    await signIn(page, 'admin');
    profile = await L.openRoles(page, null);
    fact('7-site-level', {url: page.url(), ...(await L.readRoles(page, names))});
    record('07-site-level', await screen(page));
    await shot(page, '07-site-level');

    await signOut(page); // 8
    fact('8-site-register', await L.readSiteRegister(page, app, names));
    record('08-site-register', await screen(page));
    await shot(page, '08-site-register');
}

async function neighbourChecks(app, page, fact) {
    const s = await setup(app, page, fact);
    const names = namesOf(app, s);
    await signIn(page, 'dbarnes');

    let profile = await L.openRoles(page, app.contextPath); // n1
    fact('n1-publicknowledge-own', await L.readRoles(page, names));

    fact('n2-fold-press', await L.openFold(page, profile)); // n2
    const box = profile.contextRoleBox(s.open.name, 'Reader');
    fact('n2-box', {count: await box.count()});
    if (await box.count()) {
        await box.check();
        await profile.save().catch((e) => fact('n2-save-error', String(e).slice(0, 300)));
        profile = await L.openRoles(page, app.contextPath);
        await L.openFold(page, profile);
        fact('n2-after-save', await L.readRoles(page, names));
        record('n2-after-save', await screen(page));
    }

    await signOut(page); // n3
    fact('n3-site-register', await L.readSiteRegister(page, app, names));
    await page.goto(app.url(`/index.php/${app.contextPath}${app.line && /3_[34]/.test(app.line) ? '' : '/en'}/user/register`));
    fact('n3-own-register-reviewer', await page.evaluate(() => [...document.querySelectorAll('#reviewerOptinGroup label')].map((l) => l.innerText.trim())));

    await signIn(page, 'admin'); // n4
    fact('n4-close-open', await L.closeRegistration(page, app, s.open.path));
    await signOut(page);
    await signIn(page, 'dbarnes');
    await L.openRoles(page, s.closed.path);
    fact('n4-closed-own-one-other', await L.readRoles(page, names));
    record('n4-closed-own-one-other', await screen(page));
    await shot(page, 'n4-closed-own-one-other');
}

async function noRoles(app, page, fact) {
    const s = L.scratchNames(app);
    const names = namesOf(app, s).slice(0, 2);
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await signIn(page, 'admin');
    fact('16-create-open', {status: await L.createJournal(page, app, s.open).catch((e) => `error: ${String(e).slice(0, 300)}`)});
    fact('17-untick', await L.turnOffSelfRegistration(page, app, s.open.path, NOROLES[app.name].first).catch((e) => ({error: String(e).slice(0, 400)})));
    record('17-roles', await screen(page));
    await signOut(page); // 18
    fact('18-site-register', await L.readSiteRegister(page, app, names));
    record('18-site-register', await screen(page));
    await shot(page, '18-site-register');
    await signIn(page, 'admin'); // 19
    await L.openRoles(page, null);
    fact('19-site-level', {url: page.url(), ...(await L.readRoles(page, names))});
    record('19-site-level', await screen(page));
    await signOut(page);
    await signIn(page, 'dbarnes'); // 20
    let profile = await L.openRoles(page, app.contextPath);
    fact('20-fold-press', await L.openFold(page, profile));
    fact('20-publicknowledge-fold', await L.readRoles(page, names));
    record('20-publicknowledge-fold', await screen(page));
    await shot(page, '20-publicknowledge-fold');
    await signOut(page);
    await signIn(page, 'admin'); // 21
    fact('21-untick', await L.turnOffSelfRegistration(page, app, s.open.path, NOROLES[app.name].then).catch((e) => ({error: String(e).slice(0, 400)})));
    await L.openRoles(page, null);
    fact('21-site-level', {url: page.url(), ...(await L.readRoles(page, names))});
    record('21-site-level', await screen(page));
    await shot(page, '21-site-level');
    await signOut(page);
    await signIn(page, 'dbarnes'); // 22
    profile = await L.openRoles(page, app.contextPath);
    fact('22-fold-press', await L.openFold(page, profile));
    fact('22-publicknowledge-fold', await L.readRoles(page, names));
    record('22-publicknowledge-fold', await screen(page));
    await shot(page, '22-publicknowledge-fold');
    await signOut(page); // 23
    fact('23-site-register', await L.readSiteRegister(page, app, names));
    record('23-site-register', await screen(page));
    await shot(page, '23-site-register');
    // control: publicknowledge's own Register page and its reviewer opt-in
    await page.goto(app.url(`/index.php/${app.contextPath}${loc}/user/register`));
    fact('c-own-register', await page.evaluate(() => ({
        reviewer: [...document.querySelectorAll('#reviewerOptinGroup label')].map((l) => l.innerText.trim()),
        contextsList: !!document.querySelector('#contextOptinGroup'),
    })));
}

async function lossScope(app, page, fact, variant) {
    const s = L.scratchNames(app);
    let savePath;
    if (variant === 'closed') {
        await setup(app, page, fact); // 1-3
        await signIn(page, 'admin'); // 9
        fact('9-close-open', await L.closeRegistration(page, app, s.open.path));
        savePath = s.closed.path;
    } else {
        await signIn(page, 'admin'); // 16, 17, 21
        fact('16-create-open', {status: await L.createJournal(page, app, s.open).catch((e) => `error: ${String(e).slice(0, 300)}`)});
        fact('17-21-untick', await L.turnOffSelfRegistration(page, app, s.open.path, [...NOROLES[app.name].first, ...NOROLES[app.name].then]).catch((e) => ({error: String(e).slice(0, 400)})));
        savePath = s.open.path;
    }
    await signOut(page);
    const who = 'shellier';
    const rows = () => sql(app, `SELECT ug.user_group_id, ug.role_id, ug.permit_self_registration, uug.date_start, uug.date_end FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id = uug.user_group_id JOIN users u ON u.user_id = uug.user_id WHERE u.username = '${who}' ORDER BY 1`);
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const reviewPage = async () => {
        const r = await page.goto(app.url(`/index.php/${app.contextPath}${loc}/reviewer/submission/20`));
        await page.waitForLoadState('networkidle').catch(() => {});
        return {status: r && r.status(), url: page.url(), h1: ((await page.locator('h1').allInnerTexts().catch(() => [])) || []).slice(0, 3), text: L.flat(await page.locator('body').innerText().catch(() => ''), 300)};
    };
    await signIn(page, who);
    fact('s1-own-before', await L.ownRoleBoxes(page, app.contextPath));
    fact('s1-review-before', await reviewPage());
    fact('s1-db-before', rows());
    fact('s2-save', await L.saveRolesUnchanged(page, savePath));
    fact('s2-tab', await L.readRoles(page, namesOf(app, s)));
    record('s2-saved', await screen(page));
    fact('s3-own-after', await L.ownRoleBoxes(page, app.contextPath));
    fact('s3-review-after', await reviewPage());
    record('s3-review-after', await screen(page));
    await shot(page, 's3-review-after');
    fact('s3-db-after', rows());
}

async function roleLoss(app, page, fact) {
    const s = await setup(app, page, fact);
    await signIn(page, 'admin'); // 9
    fact('9-close-open', await L.closeRegistration(page, app, s.open.path));
    await signOut(page);
    const who = {givenName: 'Una', familyName: 'Newcomer', username: 'u03rfnew'};
    const email = `${who.username}@mailinator.com`;
    fact('11-12-register-author', await L.registerAndTakeAuthor(page, app, who)); // 11, 12
    fact('12-publicknowledge-before', await L.ownRoleBoxes(page, app.contextPath));
    fact('12-db-before', sql(app, `SELECT ug.user_group_id, ug.role_id, uug.date_start, uug.date_end FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id = uug.user_group_id JOIN users u ON u.user_id = uug.user_id WHERE u.username = '${who.username}' ORDER BY 1`));
    fact('13-save', await L.saveRolesUnchanged(page, s.closed.path)); // 13
    fact('13-closed-own', await L.readRoles(page, namesOf(app, s)));
    record('13-closed-own-saved', await screen(page));
    await shot(page, '13-closed-own-saved');
    fact('14-publicknowledge-after', await L.ownRoleBoxes(page, app.contextPath)); // 14
    record('14-publicknowledge-after', await screen(page));
    await shot(page, '14-publicknowledge-after');
    fact('14-db-after', sql(app, `SELECT ug.user_group_id, ug.role_id, uug.date_start, uug.date_end FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id = uug.user_group_id JOIN users u ON u.user_id = uug.user_id WHERE u.username = '${who.username}' ORDER BY 1`));
    await signOut(page);
    await signIn(page, 'admin'); // 15
    fact('15-users-row', await L.usersRow(page, app, app.contextPath, email).catch((e) => ({error: String(e).slice(0, 300)})));
    record('15-users-row', await screen(page));
    await shot(page, '15-users-row');
}

forEachApp(async (app) => {
    const name = neighbour ? 'neighbour-facts' : roleloss ? 'roleloss-facts' : noroles ? 'noroles-facts' : lossscope ? 'lossscope-facts' : lossnoroles ? 'lossnoroles-facts' : 'walk-facts';
    const fact = (k, v) => {
        record(name, {[k]: v}, {merge: true});
        const shown = v && typeof v === 'object' && 'html' in v ? {...v, html: '…'} : v;
        console.log(`[${name}]`, app.name, k, JSON.stringify(shown).slice(0, 1500));
    };
    fact('run', {app: app.name, line: app.line || 'main', dataset: app.dataset});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (neighbour) await neighbourChecks(app, page, fact);
        else if (roleloss) await roleLoss(app, page, fact);
        else if (noroles) await noRoles(app, page, fact);
        else if (lossscope) await lossScope(app, page, fact, 'closed');
        else if (lossnoroles) await lossScope(app, page, fact, 'noroles');
        else await steps(app, page, fact);
    } catch (error) {
        fact('error', String(error.stack || error).slice(0, 1500));
        throw error;
    } finally {
        fact('serverLog', log.since(from));
        await close();
    }
});
