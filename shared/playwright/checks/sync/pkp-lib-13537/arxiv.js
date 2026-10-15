// PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536), the regression reader's S3: an old-style
// arXiv ID with a subject class ("arXiv:math.AG/0309136") is picked out of the text as
// "math.AG/0309136", which the citation schema's arxiv rule refuses, so "Edit citation" cannot be saved
// until the editor clears a box they never typed in. Walked the same way at the PR's base and its head,
// as `dbarnes` on PKP's default dataset for `main`, on the submission of
// ../../issues/citation-author-row-kept-after-close/lib.js SUBMISSION, through the screens:
//   1. lookup off (as the dataset arrives): References "Add" OFF_REF.
//   2. Settings › Workflow › "Metadata": "Enable references structuring and metadata lookup", "Save".
//   3. References "Add" ON_REF (the lookup's first step picks the identifiers out at once: the control,
//      the path both sides share).
//   4. For each of the two: the row's "Edit", the "Arxiv" box read, "Title" filled, "Save": the answer's
//      status and the messages under the boxes.
// Reset first:  npm run fleet-prep -- --feature sync-13536 --dataset 1 --reset
// Run:          PROBE_FEATURE=sync-13536 PROBE_AGENT=pr13537 PROBE_RUN=<base|head> node bin/probe.js <app|all> shared/playwright/checks/sync/pkp-lib-13537/arxiv.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, sql, outDir} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const OFF_REF = 'pr13537x Doe, A. Moduli spaces off. 2003. arXiv:math.AG/0309136';
const ON_REF = 'pr13537y Roe, R. Moduli spaces on. 2003. arXiv:math.AG/0309137';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('arxiv.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN || 'run';
    const facts = {app: app.name, run};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const {page, close} = await launch(app);
    const stored = (word) => sql(app, `select coalesce(string_agg(cs.setting_name || '=' || cs.setting_value, ' ' order by cs.setting_name), '-') from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name in ('arxiv', 'processingStatus', 'title') where c.raw_citation like '${word} %'`);
    const editAndSave = async (key, text) => {
        const refs = (await L.openPublicationPage(page, app, 'References')).pg;
        const panel = await refs.edit(text);
        const arxiv = await panel.field('Arxiv').inputValue();
        await panel.field('Title').fill('Moduli spaces');
        const answer = page.waitForResponse((r) => /\/citations\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 30_000});
        await panel.saveButton().click();
        const r = await answer;
        await page.waitForTimeout(500);
        const errors = await panel.dialog().locator('.pkpFieldError').allInnerTexts().catch(() => []);
        await panel.dialog().screenshot({path: path.join(outDir(), `arxiv-${key.split(' ')[0]}-${run}-${app.name}.png`)}).catch(() => {});
        fact(key, {arxivBox: arxiv, status: r.status(), body: L.flat(await r.text(), 300), errors, open: await panel.dialog().isVisible(), stored: stored(text.split(' ')[0])});
        if (await panel.dialog().isVisible()) await panel.close();
    };

    try {
        await signIn(page, 'dbarnes');
        let refs = (await L.openPublicationPage(page, app, 'References')).pg;
        await refs.add(OFF_REF);
        fact('1 lookup off: Add', stored('pr13537x'));
        fact('2 lookup on', await L.tickMetadata(page, app, ['lookup']));
        refs = (await L.openPublicationPage(page, app, 'References')).pg;
        await refs.add(ON_REF);
        await page.waitForTimeout(1000);
        fact('3 lookup on: Add (control)', stored('pr13537y'));
        await editAndSave('4a Edit, Save: the reference added with lookup off', 'pr13537x');
        await editAndSave('4b Edit, Save: the reference added with lookup on (control)', 'pr13537y');
    } catch (e) {
        fact('error', L.flat(e.message, 400));
    } finally {
        fs.writeFileSync(path.join(outDir(), `arxiv-facts-${run}-${app.name}.json`), JSON.stringify(facts, null, 2));
        await close();
    }
});
