// Helpers of walk.js (issue report docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md):
// a second journal, press or server created on screen, the Native XML Plugin page of any context,
// and a submission's "Contributors" page. Requiring this file runs nothing.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/** Administration › Hosted Journals (Presses, Servers) › "Create …", filled and saved. Returns the save's status. */
async function createContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

const NAME = (a) => `COALESCE((SELECT setting_value FROM author_settings WHERE author_id = ${a}.author_id AND setting_name = 'givenName' AND locale = 'en'), '') || ' ' || COALESCE((SELECT setting_value FROM author_settings WHERE author_id = ${a}.author_id AND setting_name = 'familyName' AND locale = 'en'), '')`;

/** Whether the install keeps contributor roles (main); 3.5 and older keep a user group per author. */
const hasContributorRoles = (app) => sql(app, "SELECT count(*) FROM information_schema.tables WHERE table_name = 'contributor_roles'") === '1';

/** Each contributor of a submission's current publication: seq, name, roles (identifier#id@context; 3.5: group name#id@context). */
function storedRoles(app, subId) {
    if (!hasContributorRoles(app)) {
        return sql(app, `SELECT a.seq || ' ' || ${NAME('a')} || ': ' || COALESCE((SELECT setting_value FROM user_group_settings WHERE user_group_id = a.user_group_id AND setting_name = 'name' AND locale = 'en'), '?') || '#' || a.user_group_id || '@ctx' || (SELECT context_id FROM user_groups WHERE user_group_id = a.user_group_id) FROM submissions s JOIN authors a ON a.publication_id = s.current_publication_id WHERE s.submission_id = ${subId} ORDER BY a.seq`).split('\n').filter(Boolean);
    }
    return sql(app, `SELECT a.seq || ' ' || COALESCE((SELECT setting_value FROM author_settings WHERE author_id = a.author_id AND setting_name = 'givenName' AND locale = 'en'), '') || ' ' || COALESCE((SELECT setting_value FROM author_settings WHERE author_id = a.author_id AND setting_name = 'familyName' AND locale = 'en'), '') || ': ' || COALESCE(string_agg(cr.contributor_role_identifier || '#' || cr.contributor_role_id || '@ctx' || cr.context_id, ','), 'none') FROM submissions s JOIN authors a ON a.publication_id = s.current_publication_id LEFT JOIN credit_contributor_roles c ON c.contributor_id = a.author_id LEFT JOIN contributor_roles cr ON cr.contributor_role_id = c.contributor_role_id WHERE s.submission_id = ${subId} GROUP BY a.author_id, a.seq ORDER BY a.seq`).split('\n').filter(Boolean);
}

/** The workflow of a submission in a context › "Contributors"; returns the window's text. */
async function readContributors(page, app, ctx, subId) {
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${subId}`));
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(1500);
    await dialog.getByRole('link', {name: 'Contributors', exact: true}).or(dialog.getByRole('button', {name: 'Contributors', exact: true})).first().click();
    await idle(page).catch(() => {});
    await sleep(2000);
    return flat(await dialog.innerText().catch(() => null), 2500);
}

module.exports = {T, sleep, flat, WORDS, createContext, hasContributorRoles, storedRoles, readContributors};
