// U24 OPS3: on a preprint server an unfinished submission is labelled
// "Production" (the stage bubble of the workflow panel and of the list rows)
// where a journal or press says "Incomplete".
// Report: docs/issues/U24-OPS3-preprint-draft-labelled-production.md
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet):
// the dataset's author (ccorino; OMP aclark) begins a submission "u24d draft"
// and leaves the wizard; the author's My Submissions row, the manager
// dbarnes's "Active submissions" row (found by the search box) and the
// workflow panel opened by its address are read for the stage label and its
// colour. OPS has the fault; OJS and OMP are the control.
//
// WALK=steps (default) takes the steps; WALK=nb is the neighbour check for a
// fix trial and creates nothing: dbarnes opens the dataset's submitted
// submissions, one per state, and their panel's bubble must read as before.
// WALK=act (OPS only) answers what the manager can do with a draft's panel:
// after steps 1-2, dbarnes opens the panel and presses "Post the preprint";
// the window that opens, its buttons and, when "Post" is offered and pressed,
// the bubble afterwards are recorded.
//
//   PROBE_FEATURE=issues-u24d PROBE_AGENT=u24d node bin/probe.js all \
//     shared/playwright/checks/issues/preprint-draft-labelled-production/walk.js
'use strict';
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {beginSubmission, flat, T} = require('../wizard-refused-save-hangs-saving/lib.js');

const MODE = process.env.WALK || 'steps';
const TITLE = 'u24d draft';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};
// The neighbour's submissions: the dataset's own, one per state (dataset.md).
const NEIGHBOURS = {
    ojs: [4, 7, 3, 5, 17, 18],
    omp: [3, 6, 2, 1, 4, 5],
    ops: [1, 2, 4],
};

/** The stage bubble inside a scope: its label and the colour class of its dot. */
async function bubble(scope) {
    const dot = scope.locator('span[class*="bg-stage-"]').first();
    if (!(await dot.waitFor({timeout: 15_000}).then(() => true).catch(() => false))) return null;
    const colour = ((await dot.getAttribute('class')) || '').split(/\s+/).find((c) => c.startsWith('bg-stage-'));
    const label = flat(await dot.locator('xpath=following-sibling::span[1]').innerText());
    return {label, colour};
}

const row = (page) => page.getByRole('row').filter({hasText: TITLE});

/** A row's facts: its stage bubble and the buttons it offers. */
async function readRow(page) {
    const r = row(page).first();
    if (!(await r.waitFor({timeout: 15_000}).then(() => true).catch(() => false))) return {listed: false};
    return {
        listed: true,
        stage: await bubble(r),
        buttons: (await r.getByRole('button').allInnerTexts()).map((x) => flat(x)).filter(Boolean),
        links: (await r.getByRole('link').allInnerTexts()).map((x) => flat(x)).filter(Boolean),
    };
}

/** The workflow panel opened by its dashboard address: its bubble and header buttons. */
async function readPanel(page, app, lang, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}${lang}/dashboard/editorial?workflowSubmissionId=${id}`));
    const dlg = page.getByRole('dialog').first();
    await dlg.waitFor({timeout: T});
    await idle(page);
    const stage = await bubble(dlg);
    return {stage};
}

forEachApp(async (app) => {
    const lang = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const snap = async (name) => {
        record(`pdlp-${MODE}-${name}`, await screen(page));
        await shot(page, `pdlp-${MODE}-${name}`).catch(() => {});
    };
    try {
        if (MODE === 'act' && app.name !== 'ops') return;
        if (MODE === 'nb') {
            await signIn(page, 'dbarnes');
            facts.neighbours = {};
            for (const id of NEIGHBOURS[app.name]) {
                try {
                    facts.neighbours[id] = (await readPanel(page, app, lang, id)).stage;
                } catch (e) {
                    facts.neighbours[id] = {error: flat(e.message, 200)};
                }
            }
            await snap('last-panel');
            return;
        }
        // 1-2. the author begins a submission and leaves the wizard
        const author = AUTHOR[app.name];
        facts.author = author;
        await signIn(page, author);
        const id = await beginSubmission(page, app, {title: TITLE, section: SECTION[app.name]});
        facts.id = id;
        await snap('01-wizard');
        if (MODE === 'act') {
            await signOut(page);
            await signIn(page, 'dbarnes');
            facts.panel = await readPanel(page, app, lang, id);
            const dlg0 = page.getByRole('dialog').first();
            facts.offered = (await dlg0.getByRole('button').allInnerTexts()).map((x) => flat(x)).filter(Boolean);
            const publish = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()), {timeout: 20_000}).catch(() => null);
            await dlg0.getByRole('button', {name: 'Post the preprint', exact: true}).click({timeout: T});
            await idle(page);
            await page.waitForTimeout(2000);
            const top = page.getByRole('dialog').last();
            facts.postWindow = flat(await top.innerText(), 900);
            facts.postWindowButtons = (await top.getByRole('button').allInnerTexts()).map((x) => flat(x)).filter(Boolean);
            await snap('05-post-window');
            const post = top.getByRole('button', {name: 'Post', exact: true});
            facts.postOffered = (await post.count()) > 0 && !(await post.first().isDisabled());
            if (facts.postOffered) {
                await post.first().click();
                const r = await publish;
                facts.publish = r ? `${r.request().method()} ${r.status()}` : null;
                await idle(page);
                await page.waitForTimeout(1500);
                await snap('06-after-post');
                facts.after = await readPanel(page, app, lang, id);
                facts.afterHead = flat((await screen(page)).text.dialog, 300);
            }
            return;
        }
        // 3. My Submissions
        await page.goto(app.url(`/index.php/${app.contextPath}${lang}/dashboard/mySubmissions`));
        await idle(page);
        facts.authorRow = await readRow(page);
        await snap('02-my-submissions');
        // 4. the manager's "Active submissions", searched for the title
        await signOut(page);
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}${lang}/dashboard/editorial?currentViewId=active`));
        await idle(page);
        const box = page.getByRole('searchbox', {name: /Search submissions, ID/});
        await box.waitFor({timeout: T});
        await box.click();
        await box.pressSequentially(TITLE, {delay: 25});
        await box.press('Enter');
        await idle(page);
        facts.editorRow = await readRow(page);
        await snap('03-active-submissions');
        // 5. the workflow panel by its address
        facts.panel = await readPanel(page, app, lang, id);
        const s = await screen(page);
        facts.panelHead = flat(s.text && s.text.dialog, 300);
        await snap('04-panel');
    } catch (e) {
        facts.error = flat(e.message, 400);
        await snap('error').catch(() => {});
        throw e;
    } finally {
        record(`pdlp-${MODE}-facts`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
