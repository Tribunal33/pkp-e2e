// U05 chunk K1, remainder after k1.js: the Create Journal form (F11), the
// workflow panel heading after pressing a task (Rule 2c), the editorial
// header's "Edit Profile" entry, admin's count on a journal home (Rule 4),
// Settings › Users & Roles "Add User", the scratch Register page and the
// seeded journal's home. Reuses k1.js's contexts from k1-summary-<app>.json.
// Run: PROBE_FEATURE=U05 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U05/K1/k1-remainder.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, outDir, outFile} =
    require('../../../probe');

async function safeScreen(page) {
    try { return await screen(page); } catch (e) { return {url: page.url(), error: String(e.message).slice(0, 200)}; }
}
async function userNav(page) {
    return page.evaluate(() => {
        const wrap = document.querySelector('#navigationUserWrapper');
        return {text: wrap ? wrap.innerText.replace(/\s+/g, ' ').trim() : null,
            counts: [...document.querySelectorAll('.task_count')].map((e) => ({text: e.innerText.trim(), visible: e.getClientRects().length > 0})),
            links: wrap ? [...wrap.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})) : []};
    });
}

forEachApp(async (app) => {
    const prev = require(outFile(`k1-summary-${app.name}.json`));
    const t = prev.tag;
    const U = {m1: `${t}m1`, au: `${t}au`};
    const S = {app: app.name, tag: t, errors: {}};
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        // Signed out: the scratch journal's Register page and the seeded journal's home.
        await page.goto(app.url(`/index.php/${t}/user/register`)); await idle(page);
        const reg = await safeScreen(page);
        record(`r-register-${app.name}`, reg);
        S.register = {url: page.url(), title: reg.title, registerButton: await page.getByRole('button', {name: 'Register', exact: true}).count()};
        await page.goto(app.url(`/index.php/${app.contextPath}/index`)); await idle(page);
        const pk = await safeScreen(page);
        record(`r-seeded-home-${app.name}`, pk);
        S.seededHome = {url: page.url(), title: pk.title};

        // admin: the Create form, then a journal home.
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
        const create = page.getByRole('link', {name: /^Create (Journal|Press|Server)$/});
        S.createLabel = await create.first().innerText().catch(() => null);
        await create.first().click();
        try {
            // The form is a Vue side modal; its first visible text field is the form's (the grid page has none).
            const firstInput = page.locator('input[type="text"]:visible, textarea:visible').first();
            await firstInput.waitFor({state: 'visible', timeout: 30000});
            await idle(page);
            const cf = await safeScreen(page);
            record(`r-create-form-${app.name}`, cf);
            await shot(page, `r-create-form-${app.name}`);
            S.createForm = await firstInput.evaluate((el) => {
                const form = el.closest('form') || el.closest('[role="dialog"]') || document;
                return {
                    fields: [...form.querySelectorAll('.pkpFormField__heading, label, legend')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                    inputs: [...form.querySelectorAll('input, select, textarea')].map((e) => ({name: e.name, id: e.id, type: e.type})).filter((x) => x.name || x.id),
                };
            });
            await loc(page, 'the Create form first field', firstInput);
            await page.getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {});
        } catch (e) { S.errors.createForm = String(e.message).slice(0, 300); record(`r-create-form-failed-${app.name}`, await safeScreen(page)); await shot(page, `r-create-form-failed-${app.name}`).catch(() => {}); }
        await page.goto(app.url(`/index.php/${t}/index`)); await idle(page);
        S.adminJournalHome = await userNav(page);
        record(`r-admin-journal-home-${app.name}`, await safeScreen(page));
        await signOut(page);

        // M1: the header's user menu (hidden entries included), pressing an unread task, Users & Roles.
        await signIn(page, U.m1);
        await page.goto(app.url(`/index.php/${t}/dashboard/editorial`)); await idle(page);
        S.headerMenu = await page.evaluate(() => [...document.querySelectorAll('header a, header button')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
        await page.getByRole('button', {name: /^Tasks/}).first().click();
        const d = page.locator('[role="dialog"]:visible').last();
        await d.locator('tr.gridRow').first().waitFor({timeout: 15000});
        await idle(page);
        const unread = d.locator('tr.gridRow').filter({has: page.locator('div.task.unread')}).first();
        S.pressedRow = await unread.innerText().catch(() => null);
        await unread.locator('span.message').click();
        await page.waitForURL((u) => u.search.includes('workflowSubmissionId') || u.pathname.includes('authorizationDenied'), {timeout: 20000}).catch(() => {});
        const panelHeading = page.getByRole('heading', {name: U.au});
        S.panelHeadingSeen = await panelHeading.first().waitFor({timeout: 20000}).then(() => true).catch(() => false);
        await idle(page);
        const landed = await safeScreen(page);
        record(`r-after-press-${app.name}`, landed);
        await shot(page, `r-after-press-${app.name}`);
        S.landing = {url: page.url(), title: landed.title, headings: await page.locator('h1, h2').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).slice(0, 8))};
        await page.goto(app.url(`/index.php/${t}/management/settings/access`)); await idle(page);
        const ur = await safeScreen(page);
        record(`r-users-roles-${app.name}`, ur);
        S.usersRoles = {title: ur.title, addUser: await page.getByRole('link', {name: 'Add User', exact: true}).or(page.getByRole('button', {name: 'Add User', exact: true})).count()};
        await signOut(page);
    } catch (e) { S.errors.main = String(e.stack || e).slice(0, 800); } finally { await close(); }
    record(`k1-remainder-summary-${app.name}`, S);
    return S;
});
