// U56 A2: on a journal and a press "Manage Emails" lists the three ORCID emails under code names
// ("orcidCollectAuthorId", "orcidRequestAuthorAuthorization", "orcidRequestUpdateScope"), last in the list,
// and their "Edit Template" "Name" box reads the same code.
// The report's steps through the screens, on PKP's default dataset (every app; a preprint server lists no ORCID email):
//   steps  as rvaca (the context's manager): Settings › Workflow › "Emails" › "Add and edit templates"; the list read
//          to its end; `ORCID` searched (Enter); each row found opened with "Edit", "Name" and "Subject" read, closed
//          with the back arrow.
//   nb     (the fix's neighbour, run alone with the fix in and out, each on the stable-3_5_0 dataset upgraded to main):
//          the whole list (names, order, count) and every stored default template's name, subject and body hash
//          (SQL), so the two runs show the fix changes the three ORCID names and nothing else; and "Edit" on the first
//          ORCID row and on "Submission Acknowledgement", "Name" read.
//
//   PROBE_FEATURE=issues-u56b PROBE_AGENT=u56b node bin/probe.js all shared/playwright/checks/issues/orcid-emails-listed-under-code-names/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u56b-3_5 in front; STEPS=nb runs the neighbour alone,
//   STEPS=wayround the way round: the first ORCID row's "Name" typed over ("ORCID Author iD Request u56b"), "Save", list and box read again.)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const E = require('../preprint-emails-list-misses-sent-emails/lib.js');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const CODES = ['orcidCollectAuthorId', 'orcidRequestAuthorAuthorization', 'orcidRequestUpdateScope'];

/** Where the list leaves alphabetical order (case-insensitive), as the neighbouring pairs out of place. */
function outOfOrder(names) {
    const out = [];
    for (let i = 1; i < names.length; i++) {
        if (names[i - 1].localeCompare(names[i], 'en', {sensitivity: 'base'}) > 0) out.push([names[i - 1], names[i]]);
    }
    return out;
}

/** "Edit" on the list's row `i`; "Name" and "Subject" of the window it opens, then the back arrow. */
async function openRow(page, m, i, label) {
    const row = m.rows().nth(i);
    const name = flat(await row.locator('.listPanel__itemTitle').innerText());
    await row.getByRole('button', {name: /^Edit/}).click();
    const tpl = m.templateWindow();
    const several = page.getByRole('dialog', {name, exact: true});
    await Promise.race([
        tpl.locator('input[name^="name"]').first().waitFor({timeout: 30_000}),
        several.getByRole('heading', {name: 'Templates', exact: true}).waitFor({timeout: 30_000}),
    ]).catch(() => {});
    await idle(page);
    const out = {row: name};
    if (await tpl.isVisible().catch(() => false)) {
        out.window = flat(await tpl.getByRole('heading').first().innerText().catch(() => ''), 80);
        out.nameBox = await m.nameBox('en').inputValue().catch(() => null);
        out.subjectBox = await m.subjectBox('en').inputValue().catch(() => null);
        record(`${label}-edit-${i}`, await screen(page));
        await m.closeWindow(tpl);
    } else if (await several.isVisible().catch(() => false)) {
        out.window = name;
        out.templates = (await m.templateRowsRead(several).catch(() => [])).slice(0, 6);
        record(`${label}-edit-${i}`, await screen(page));
        await m.closeWindow(several);
    } else {
        out.window = null;
    }
    return out;
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'main'};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const only = (process.env.STEPS || 'steps').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (!only.includes(name)) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        log(name, JSON.stringify(facts[name]).slice(0, 1500));
    };
    const {page, close} = await launch(app);
    try {
        await step('steps', async () => {
            await signIn(page, 'rvaca');
            const {m, via} = await E.openManageEmails(page, app);
            const names = await m.rowNames();
            record('list', await screen(page));
            const out = {
                via,
                count: names.length,
                lastFive: names.slice(-5),
                codeRows: CODES.map((c) => ({name: c, index: names.indexOf(c)})),
                orcidWords: names.filter((n) => /orcid/i.test(n)),
                outOfOrder: outOfOrder(names),
            };
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            const found = await m.rowsRead();
            out.search = {rows: found.map((r) => ({name: r.name, description: flat(r.description, 160)})), noItems: await m.noItems().isVisible().catch(() => false)};
            record('search-orcid', await screen(page));
            out.opened = [];
            for (let i = 0; i < found.length; i++) out.opened.push(await openRow(page, m, i, 'steps'));
            out.stored = sql(app, "select email_key, locale, name from email_templates_default_data where email_key like 'ORCID%' order by 1, 2").split('\n');
            await signOut(page);
            return out;
        });

        await step('nb', async () => {
            await signIn(page, 'rvaca');
            const {m} = await E.openManageEmails(page, app);
            const names = await m.rowNames();
            record('nb-list', {names});
            const out = {count: names.length, names, outOfOrder: outOfOrder(names)};
            out.stored = sql(app, 'select email_key, locale, name, md5(subject), md5(body) from email_templates_default_data order by 1, 2').split('\n');
            out.version = sql(app, "select major||'.'||minor||'.'||revision||'.'||build from versions where current = 1 and product_type = 'core'");
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            const found = await m.rowsRead();
            out.orcidRows = found.map((r) => r.name);
            out.opened = [];
            if (found.length) out.opened.push(await openRow(page, m, 0, 'nb'));
            await m.search('Submission Acknowledgement');
            await idle(page);
            await page.waitForTimeout(500);
            const ack = (await m.rowNames()).indexOf('Submission Acknowledgement');
            if (ack >= 0) out.opened.push(await openRow(page, m, ack, 'nb'));
            record('nb-facts', out);
            await signOut(page);
            return out;
        });

        // The way round (run alone, STEPS=wayround): the first ORCID row's "Name" typed over and saved.
        await step('wayround', async () => {
            await signIn(page, 'rvaca');
            const {m} = await E.openManageEmails(page, app);
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            const before = (await m.rowsRead()).map((r) => r.name);
            if (!before.length) return {skipped: 'no ORCID row'};
            const row = m.rows().first();
            await row.getByRole('button', {name: /^Edit/}).click();
            await m.nameBox('en').waitFor({timeout: 30_000});
            const out = {row: before[0], nameBefore: await m.nameBox('en').inputValue()};
            await m.nameBox('en').fill('ORCID Author iD Request u56b');
            await m.templateSaveButton().click();
            await idle(page);
            await page.waitForTimeout(800);
            out.footer = flat(await m.templateFooter().innerText().catch(() => ''), 120);
            out.windowOpen = await m.templateWindow().isVisible().catch(() => false);
            record('wayround-saved', await screen(page));
            await m.goto();
            await m.search('ORCID');
            await idle(page);
            await page.waitForTimeout(500);
            out.listAfter = (await m.rowsRead()).map((r) => r.name);
            out.reopened = await openRow(page, m, 0, 'wayround');
            out.stored = sql(app, "select t.email_key, s.locale, s.setting_value from email_templates t join email_templates_settings s on s.email_id = t.email_id where t.email_key like 'ORCID%' and s.setting_name = 'name'").split('\n');
            await signOut(page);
            return out;
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
