// PR review of pkp/pkp-lib#12897 (ui-library#979, the sciflow 0.0.3 → 0.1.1 editor), third round,
// the second round's S3: a Body Text saved by the 0.0.3 editor with an in-text citation opens with
// "Unsaved Changes" under the 0.1.1 editor. Walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), OJS only, submission 5 "Genetic transformation of
// forest trees" (Production), publication 6, as dbarnes.
//
// PHASE=seed, on the build BEFORE the PR (OJS main):
//   1. the version's references set to two entries (REST PUT of `citationsRaw` from the signed-in page,
//      the same field "References" edits; setup only);
//   2. "Body Text": two paragraphs typed, the second reference dragged from "References" into the
//      second paragraph (a citation), "Save";
//   3. reload: the badge and the stored document.
// PHASE=open, on the build AT the PR head (no reset between):
//   1. "Body Text" opened: the badge, the panel's states and the stored document as loaded;
//   2. "Save", reload: the badge again, and the stored document after the save.
//
// Reset first:  npm run fleet-prep -- --feature pr12897r3 --dataset --apps ojs --reset
// Run:          PHASE=seed|open PROBE_FEATURE=pr12897r3 PROBE_AGENT=s3 node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-12897/s3-citation-unsaved.js
// Facts: .reports/pr12897r3/s3/s3-facts-ojs.json
const {forEachApp, launch, signIn, shot, record} = require('../../../probe');
const L = require('../../issues/body-text-opens-with-unsaved-changes/lib');

const PHASE = process.env.PHASE || 'seed';
const SUB = 5;
const PUB = 6;
const REFS = [
    'Alpha, A. (2020). First S3 reference title. Journal of Tests, 1(1), 1-2.',
    'Beta, B. (2021). Second S3 reference title. Journal of Tests, 2(2), 3-4.',
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const fact = (k, v) => { record('s3-facts', {[k]: v}, {merge: true}); console.log('[s3]', PHASE, k, JSON.stringify(v).slice(0, 2500)); };
    const {page, close} = await launch(app);
    await L.watchPanel(page);
    const stored = [];
    page.on('response', async (r) => {
        if (/\/bodyText/.test(r.url())) {
            let body = null;
            try { body = (await r.text()).slice(0, 4000); } catch (e) { /* gone */ }
            stored.push({method: r.request().method(), status: r.status(), body});
        }
    });
    const api = (method, rel, data) => page.evaluate(async ({method, url, data}) => {
        const r = await fetch(url, {method: method === 'GET' ? 'GET' : 'POST', headers: {'X-Csrf-Token': pkp.currentUser.csrfToken, 'X-Http-Method-Override': method, 'Content-Type': 'application/json'}, body: data ? JSON.stringify(data) : undefined});
        return {status: r.status, body: (await r.text()).slice(0, 1500)};
    }, {method, url: app.url(`/index.php/${app.contextPath}/api/v1/${rel}`), data});
    const reopen = async () => { await L.openWorkflow(page, app, SUB); await L.openBodyText(page); };
    try {
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app, SUB);
        if (PHASE === 'seed') {
            const put = await api('PUT', `submissions/${SUB}/publications/${PUB}`, {citationsRaw: REFS.join('\n')});
            fact('seed.citationsPut', {status: put.status});
            await reopen();
            await L.typeInEditor(page, 'First paragraph of the S3 body.');
            await page.keyboard.press('Enter');
            await page.keyboard.type('Second paragraph citing ', {delay: 15});
            const refItems = () => page.locator('sciflow-reference-list li.reference-item');
            const out = {refs: await refItems().count()};
            for (let attempt = 0; attempt < 3 && !out.inserted; attempt++) {
                const src = await refItems().nth(1).boundingBox();
                const tgt = await page.locator('sciflow-editor [contenteditable] p').nth(1).boundingBox();
                if (!src || !tgt) { out[`try${attempt}`] = 'no box'; continue; }
                await page.mouse.move(src.x + 20, src.y + src.height / 2);
                await page.mouse.down();
                await page.mouse.move(src.x + 30, src.y + src.height / 2, {steps: 3});
                await page.mouse.move(tgt.x + tgt.width - 10, tgt.y + tgt.height / 2, {steps: 15});
                await L.sleep(200);
                await page.mouse.up();
                await L.sleep(1000);
                const html = await page.locator('sciflow-editor [contenteditable]').first().innerHTML();
                out[`try${attempt}`] = (html.match(/<cite[^>]*>[^<]*<\/cite>/g) || []);
                if (/<cite/.test(html)) out.inserted = attempt + 1;
            }
            fact('seed.drag', out);
            fact('seed.beforeSave', await L.bodyText(page));
            fact('seed.saveStatus', await L.pressSave(page));
            await shot(page, 's3-seed-01-saved');
            stored.length = 0;
            await reopen();
            fact('seed.reload', await L.bodyText(page));
            fact('seed.reloadStored', stored.filter((s) => s.method === 'GET'));
            await shot(page, 's3-seed-02-reload');
        } else {
            const t0 = Date.now();
            await L.openBodyText(page);
            fact('open.arrive', await L.bodyText(page));
            fact('open.panel', (await L.panelLog(page, t0)).ui);
            fact('open.loaded', stored.filter((s) => s.method === 'GET'));
            await shot(page, 's3-open-01-arrive');
            stored.length = 0;
            fact('open.saveStatus', await L.pressSave(page));
            fact('open.saved', stored.filter((s) => s.method !== 'GET').map((s) => ({status: s.status})));
            stored.length = 0;
            await reopen();
            fact('open.reload', await L.bodyText(page));
            fact('open.reloadStored', stored.filter((s) => s.method === 'GET'));
            await shot(page, 's3-open-02-reload');
        }
    } finally {
        await close();
    }
});
