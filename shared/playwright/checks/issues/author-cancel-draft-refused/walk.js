// Issue report walk: docs/issues/U21-OPS3-author-cancel-draft-refused.md
// (spec U21 register OPS3). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-3  the Author (ccorino; OMP aclark) starts "u21w36 Draft To Cancel"
//   4-5  wizard footer "Cancel", dialog "Cancel submission", "OK"
//   6-9  if the draft survived: "My Submissions" > "More Actions" >
//        "Delete Incomplete Submissions", tick the draft, "Delete Incomplete
//        Submissions", dialog "Confirm"; if it did not (OJS, OMP, or the fix
//        in), the Author starts "u21w36 Second Draft" and deletes that instead
// NEIGHBOUR=1 (the fix's neighbour check): the Author starts "u21w36 Manager
// Cancels", then rvaca (manager) opens that draft's wizard address and cancels
// it ("Submission cancelled" expected with and without the fix); and the
// Author's own submitted submission's wizard address offers no "Cancel".
// The kit builds nothing. Besides the screens it reads, from the database,
// whether each draft still exists and the Author's stage assignment (Evidence).
//
// Reset first:  npm run fleet-prep -- --feature issues-w36 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-w36 PROBE_AGENT=w36 node bin/probe.js all shared/playwright/checks/issues/author-cancel-draft-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w36-3_5 PROBE_AGENT=w36 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w36/w36-{facts,neighbour}[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const TAG = 'u21w36';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
// The Author's own submitted submission in the dataset (dataset.md).
const SUBMITTED = {ojs: 2, omp: 1, ops: 1};
const SECTION = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};
const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `w36-${neighbour ? 'n' : 's'}${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const traffic = [];
    const watch = (page, who) => {
        page.on('pageerror', (e) => traffic.push({who, kind: 'pageerror', text: flat(e.message, 300)}));
        page.on('response', async (r) => {
            const m = r.request().headers()['x-http-method-override'] || r.request().method();
            if (m === 'DELETE' || r.status() >= 400) {
                let body = '';
                try { body = flat(await r.text(), 300); } catch (e) { /* navigated */ }
                traffic.push({who, kind: 'http', text: `${r.status()} ${m} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`, body});
            }
        });
    };
    const exists = (id) => sql(app, `select count(*) from submissions where submission_id = ${id}`).trim() === '1';
    const author = AUTHOR[app.name];

    // Steps 1-3: the start screen, "Begin Submission"; returns the draft's id.
    async function startDraft(page, title, label) {
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/submission`));
        await idle(page);
        const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
        const iframe = page.locator('iframe.tox-edit-area__iframe').first();
        await waitForEditorReady(page, await editorIdOf(iframe));
        const body = iframe.contentFrame().locator('body');
        await body.click();
        await body.fill(title);
        const radio = page.getByRole('radio', {name: SECTION[app.name], exact: true});
        if (await radio.isVisible().catch(() => false)) await radio.check();
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
        return id;
    }

    // Steps 4-5 (or the manager's neighbour): footer "Cancel", dialog, "OK".
    async function cancelInWizard(page, id, label) {
        const footer = page.locator('.submissionWizard__footer');
        const step = flat(await page.locator('.pkpSteps__step__label--current').innerText().catch(() => ''));
        const cancel = footer.getByRole('button', {name: 'Cancel', exact: true});
        const offered = await cancel.isVisible().catch(() => false);
        await rec(page, `${label}-wizard`);
        if (!offered) return {step, offered};
        await cancel.click();
        const dialog = page.getByRole('dialog').filter({hasText: 'Cancel submission'}).last();
        await dialog.waitFor({timeout: T});
        const dialogText = flat(await dialog.innerText());
        await rec(page, `${label}-dialog`);
        const resp = page.waitForResponse((r) => /\/_submissions(\/\d+|\?)/.test(r.url()), {timeout: 20_000}).catch(() => null);
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await resp;
        await page.waitForURL(/cancelled/, {timeout: 10_000}).catch(() => {});
        await idle(page);
        await pause(1500);
        const after = await rec(page, `${label}-after-ok`);
        return {
            step, offered, dialogText,
            response: r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 300)} : null,
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            heading: flat(await page.locator('h1').first().innerText().catch(() => '')),
            dialogStillOpen: await dialog.isVisible().catch(() => false),
            screen: flat(after && after.text && after.text.main, 600),
            notices: after && after.notices,
            draftExists: exists(id),
        };
    }

    // Steps 6-9: "My Submissions", "More Actions" > "Delete Incomplete Submissions".
    async function deleteFromMySubmissions(page, id, title, label) {
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/dashboard/mySubmissions`));
        await idle(page);
        const listed = await page.getByText(title).first().isVisible({timeout: 15_000}).catch(() => false);
        await rec(page, `${label}-list`);
        await page.getByRole('button', {name: 'More Actions'}).first().click();
        const item = page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'});
        await item.waitFor({timeout: T});
        await item.click();
        await idle(page);
        // The draft's row (main names the box after the title; 3.5 only describes it by it).
        const box = page.getByRole('row').filter({hasText: title}).getByRole('checkbox');
        await box.first().waitFor({state: 'attached', timeout: T});
        await box.first().check({force: true}); // the input is sr-only; its drawn box sits over it
        await rec(page, `${label}-ticked`);
        await page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true}).click();
        const dialog = page.getByRole('dialog').filter({hasText: 'Confirm Delete of Incomplete Submissions'}).last();
        await dialog.waitFor({timeout: T});
        const dialogText = flat(await dialog.innerText());
        const resp = page.waitForResponse((r) => /\/_submissions(\?|$)/.test(r.url()) && (r.request().headers()['x-http-method-override'] || r.request().method()) === 'DELETE', {timeout: 20_000}).catch(() => null);
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const r = await resp;
        await idle(page);
        await pause(1500);
        const after = await rec(page, `${label}-after-confirm`);
        const dialogs = [];
        for (const d of await page.getByRole('dialog').all()) {
            if (await d.isVisible().catch(() => false)) dialogs.push(flat(await d.innerText(), 400));
        }
        await page.reload();
        await idle(page);
        const stillListed = await page.getByText(title).first().isVisible({timeout: 10_000}).catch(() => false);
        await rec(page, `${label}-reloaded`);
        return {
            listedBefore: listed, dialogText,
            response: r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 300)} : null,
            openDialogsAfter: dialogs, notices: after && after.notices,
            listedAfterReload: stillListed, draftExists: exists(id),
        };
    }

    try {
        if (neighbour) {
            let id;
            {
                const {page, close} = await launch(app);
                watch(page, author);
                page.setDefaultTimeout(T);
                try {
                    await signIn(page, author);
                    id = await startDraft(page, `${TAG} Manager Cancels`, 'n-author');
                    fact('n author started draft', id);
                    // The Author's own submitted submission: its wizard address.
                    await page.goto(app.url(`/index.php/${app.contextPath}${loc}/submission?id=${SUBMITTED[app.name]}`));
                    await idle(page);
                    const s = await rec(page, 'n-author-submitted-wizard');
                    fact('n author submitted submission wizard address', {
                        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                        cancelOffered: await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Cancel', exact: true}).isVisible().catch(() => false),
                        heading: flat(await page.locator('h1').first().innerText().catch(() => '')),
                        text: flat(s && s.text && s.text.main, 300),
                    });
                    await signOut(page);
                } finally { await close(); }
            }
            const {page, close} = await launch(app);
            watch(page, 'rvaca');
            page.setDefaultTimeout(T);
            try {
                await signIn(page, 'rvaca');
                await page.goto(app.url(`/index.php/${app.contextPath}${loc}/submission?id=${id}`));
                await idle(page);
                fact('n rvaca cancels the author\'s draft', await cancelInWizard(page, id, 'n-rvaca'));
                await signOut(page);
            } finally { await close(); }
            return;
        }

        const {page, close} = await launch(app);
        watch(page, author);
        page.setDefaultTimeout(T);
        try {
            await signIn(page, author);
            const title = `${TAG} Draft To Cancel`;
            const id = await startDraft(page, title, 'author');
            fact('steps 1-3 draft started', {id, url: page.url().replace(/^https?:\/\/[^/]+/, '')});
            fact('author stage assignment (Evidence)', sql(app, `select string_agg(u.username || ' in ' || (select setting_value from user_group_settings where user_group_id = sa.user_group_id and setting_name = 'name' and locale = 'en') || ' (group stages ' || coalesce((select string_agg(stage_id::text, ',' order by stage_id) from user_group_stage where user_group_id = sa.user_group_id), '') || ')', '; ') from stage_assignments sa join users u using (user_id) where sa.submission_id = ${id}`));
            fact('submission stage and progress (Evidence)', sql(app, `select stage_id || ' | ' || submission_progress from submissions where submission_id = ${id}`));
            fact('steps 4-5 author cancels in the wizard', await cancelInWizard(page, id, 'author'));
            let delId = id;
            let delTitle = title;
            if (!exists(id)) {
                delTitle = `${TAG} Second Draft`;
                delId = await startDraft(page, delTitle, 'author2');
                fact('second draft started (the first was cancelled)', delId);
            }
            fact('steps 6-9 author deletes from My Submissions', await deleteFromMySubmissions(page, delId, delTitle, 'author-dash'));
            await signOut(page);
        } finally { await close(); }
    } catch (e) {
        fact('walk error', flat(e.stack || e.message, 800));
    } finally {
        fact('traffic', traffic);
        record(neighbour ? 'w36-neighbour' : 'w36-facts', facts);
    }
});
