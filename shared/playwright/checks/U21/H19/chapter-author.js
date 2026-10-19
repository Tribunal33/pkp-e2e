// U21 claim check H19, OMP follow-up: a user the "Begin Submission" fallback enrolled as
// "Chapter Author" (a press's author role without the Submission stage) opens their own draft
// and works the wizard: "Details", a title typed, "Continue", then "Review"; then a reload.
// Run after h19.js on the same fleet state (it leaves agallego and alzacharia enrolled that way
// with one draft each), twice, each under its own PROBE_RUN:
//   PROBE_FEATURE=issues-cc19g PKP_E2E_DATASET=8 PROBE_AGENT=cc19g PROBE_RUN=ca1 node bin/probe.js omp shared/playwright/checks/U21/H19/chapter-author.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const USERS = ['agallego', 'alzacharia'];

const draftOf = (app, u) => Number(sql(app, `select s.submission_id from submissions s join stage_assignments sa on sa.submission_id = s.submission_id join users u on u.user_id = sa.user_id where u.username = '${u}' and s.submission_progress <> '' order by s.submission_id desc limit 1`)) || null;
const groupOf = (app, id) => sql(app, `select coalesce(s.setting_value, sa.user_group_id::text) from stage_assignments sa left join user_group_settings s on s.user_group_id = sa.user_group_id and s.setting_name = 'name' and s.locale = 'en' where sa.submission_id = ${id}`);
const titleOf = (app, id) => sql(app, `select coalesce((select ps.setting_value from publications p join publication_settings ps on ps.publication_id = p.publication_id and ps.setting_name = 'title' and ps.locale = 'en' where p.submission_id = ${id} limit 1), '(no title)')`);

async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

const current = (page) => page.locator('.pkpSteps__step__label--current');
const footerLine = (page) => page.locator('.submissionWizard__lastSaved').innerText({timeout: 3000}).then(flat).catch(() => null);

async function buttons(page) {
    const out = {};
    for (const name of ['Save for Later', 'Submit', 'Back', 'Continue', 'Cancel']) {
        const b = page.getByRole('button', {name, exact: true});
        const n = await b.count();
        out[name] = n ? (await b.first().isDisabled()) ? 'disabled' : 'enabled' : 'absent';
    }
    return out;
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {app: app.name, run: process.env.PROBE_RUN || null, users: {}};
    const {page, close} = await launch(app);
    try {
        for (const u of USERS) {
            const id = draftOf(app, u);
            const f = {id, group: id && groupOf(app, id), titleBefore: id && titleOf(app, id), saves: []};
            facts.users[u] = f;
            if (!id) continue;
            const onResp = (x) => { if (/\/api\/v1\/submissions\/\d+/.test(x.url()) && x.request().method() !== 'GET') f.saves.push(`${x.request().headers()['x-http-method-override'] || x.request().method()} ${x.status()} ${x.url().replace(/^.*\/api\/v1/, '')}`); };
            page.on('response', onResp);
            await signIn(page, u);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/submission?id=${id}`));
            await current(page).waitFor({timeout: T});
            await idle(page);
            const s0 = await screen(page);
            record(`ca-${u}-open`, s0);
            f.open = {step: flat(await current(page).innerText()), dialog: s0.text.dialog, heading: flat((s0.text.main || '').split('\n').slice(0, 2).join(' / '), 200)};
            // on to "Details" ("Continue" from "Upload Files", where the draft opens)
            if (!/Details/.test(await current(page).innerText())) await page.getByRole('button', {name: 'Continue', exact: true}).click();
            await current(page).filter({hasText: 'Details'}).waitFor({timeout: T});
            await idle(page);
            await typeRich(page, 'titleAbstract-title-control-en', `ca ${u} ${facts.run}`);
            await page.getByRole('button', {name: 'Continue', exact: true}).click();
            await page.waitForTimeout(6500);
            await idle(page).catch(() => {});
            const s1 = await screen(page);
            record(`ca-${u}-details-continue`, s1);
            f.afterContinue = {step: flat(await current(page).innerText()), dialog: s1.text.dialog, footer: await footerLine(page), buttons: await buttons(page)};
            // press OK on the dialog when there is one, then go on to Review by the rail
            const ok = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true});
            if (await ok.count()) await ok.first().click();
            for (let i = 0; i < 4 && !/Review/.test(await current(page).innerText().catch(() => '')); i++) {
                await page.getByRole('button', {name: 'Continue', exact: true}).click().catch(() => {});
                await page.waitForTimeout(1500);
                const ok2 = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true});
                if (await ok2.count()) await ok2.first().click().catch(() => {});
            }
            await page.waitForTimeout(3000);
            await idle(page).catch(() => {});
            const s2 = await screen(page);
            record(`ca-${u}-review`, s2);
            f.review = {step: flat(await current(page).innerText().catch(() => null)), footer: await footerLine(page), buttons: await buttons(page), checking: await page.getByText('Checking your submission').count(), text: flat(s2.text.main, 900)};
            // after a reload
            await page.reload();
            await current(page).waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            const s3 = await screen(page);
            record(`ca-${u}-reload`, s3);
            f.reload = {step: flat(await current(page).innerText().catch(() => null)), dialog: s3.text.dialog, buttons: await buttons(page), heading: flat((s3.text.main || '').split('\n').slice(0, 2).join(' / '), 200)};
            f.titleAfter = titleOf(app, id);
            page.off('response', onResp);
            await signOut(page).catch(() => {});
        }
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1200);
        await screen(page).then((s) => record('ca-error-screen', s)).catch(() => {});
    } finally {
        record('ca-facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
