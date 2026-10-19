// U21 claim check H19, OMP control: a user who holds "Chapter Author" and no other submitting
// role (given by the Site Administrator, as self-registration as Chapter Author would) presses
// "Begin Submission", types a title on "Details" and presses "Continue". Two users per run.
//   PROBE_FEATURE=issues-cc19g PKP_E2E_DATASET=8 PROBE_AGENT=cc19g PROBE_RUN=ch1 node bin/probe.js omp shared/playwright/checks/U21/H19/chapter-author-holder.js
// Needs a dataset fleet the users have not run on yet (skumar, cturner; ch2: svogt, mfritz via HOLDERS=svogt,mfritz).
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, tag} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const HOLDERS = (process.env.HOLDERS || 'skumar,cturner').split(',');

async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

/** As admin: Administration > "Hosted Presses" > the press's "Settings wizard", "Users", "Edit User", tick the role, "OK". */
async function giveRole(page, app, username, role) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: 'Hosted Presses'});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: username, includeNoRole: true});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    await win.roleBox(role).check();
    await win.pressOk();
    await win.expectClosed();
    await idle(page).catch(() => {});
    return (await grid.rowCells(username).catch(() => [])).join(' | ');
}

const held = (app, u) => sql(app, `select string_agg(coalesce(s.setting_value, ug.user_group_id::text), ', ' order by ug.user_group_id) from user_user_groups uug join users us on us.user_id = uug.user_id join user_groups ug on ug.user_group_id = uug.user_group_id left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where us.username = '${u}' and ug.context_id = 1`);
const assignedAs = (app, id) => sql(app, `select coalesce(s.setting_value, sa.user_group_id::text) from stage_assignments sa left join user_group_settings s on s.user_group_id = sa.user_group_id and s.setting_name = 'name' and s.locale = 'en' where sa.submission_id = ${id}`);

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {app: app.name, run: process.env.PROBE_RUN || null, users: {}};
    const {page, close} = await launch(app);
    try {
        for (const u of HOLDERS) {
            const f = {saves: []};
            facts.users[u] = f;
            await signIn(page, 'admin');
            f.row = await giveRole(page, app, u, 'Chapter Author');
            await signOut(page);
            f.held = held(app, u);
            const onResp = (x) => { if (/\/api\/v1\/submissions/.test(x.url()) && x.request().method() !== 'GET') f.saves.push(`${x.request().headers()['x-http-method-override'] || x.request().method()} ${x.status()} ${x.url().replace(/^.*\/api\/v1/, '')}`); };
            page.on('response', onResp);
            await signIn(page, u);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page);
            record(`ch-${u}-start`, await screen(page));
            f.submitAs = await page.getByRole('group', {name: /^Submit As\b/}).count();
            await typeRich(page, 'startSubmission-title-control', `${tag('cc19g')} ch ${u}`);
            const en = page.getByRole('radio', {name: 'English', exact: true});
            if (await en.count()) await en.check();
            for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
                const b = page.getByRole('checkbox', {name});
                if (await b.count()) await b.check();
            }
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
            await idle(page);
            f.id = Number(new URL(page.url()).searchParams.get('id'));
            f.assignedAs = assignedAs(app, f.id);
            await page.getByRole('button', {name: 'Continue', exact: true}).click();
            await page.locator('.pkpSteps__step__label--current').filter({hasText: 'Details'}).waitFor({timeout: T});
            await idle(page);
            await typeRich(page, 'titleAbstract-title-control-en', `ch ${u} details`);
            await page.getByRole('button', {name: 'Continue', exact: true}).click();
            await page.waitForTimeout(6500);
            await idle(page).catch(() => {});
            const s1 = await screen(page);
            record(`ch-${u}-details-continue`, s1);
            f.dialog = s1.text.dialog;
            f.footer = await page.locator('.submissionWizard__lastSaved').innerText({timeout: 3000}).then(flat).catch(() => null);
            page.off('response', onResp);
            await signOut(page).catch(() => {});
        }
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1200);
        await screen(page).then((s) => record('ch-error-screen', s)).catch(() => {});
    } finally {
        record('ch-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
