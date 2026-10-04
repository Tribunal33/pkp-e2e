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
// Reset first:  npm run fleet-prep -- --feature issues-u03f --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u03f PROBE_AGENT=u03f node bin/probe.js all shared/playwright/checks/issues/closed-journal-listed-on-roles-tab/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u03f-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, signOut, screen, shot, record, serverLog, sql} = require('../../../probe');
const L = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const roleloss = process.argv.slice(2).includes('roleloss');

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

    await signIn(page, 'admin'); // n4
    fact('n4-close-open', await L.closeRegistration(page, app, s.open.path));
    await signOut(page);
    await signIn(page, 'dbarnes');
    await L.openRoles(page, s.closed.path);
    fact('n4-closed-own-one-other', await L.readRoles(page, names));
    record('n4-closed-own-one-other', await screen(page));
    await shot(page, 'n4-closed-own-one-other');
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
    const name = neighbour ? 'neighbour-facts' : roleloss ? 'roleloss-facts' : 'walk-facts';
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
        else await steps(app, page, fact);
    } catch (error) {
        fact('error', String(error.stack || error).slice(0, 1500));
        throw error;
    } finally {
        fact('serverLog', log.since(from));
        await close();
    }
});
