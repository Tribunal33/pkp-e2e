// Issue report docs/issues/U53-A11-users-tab-french-raw-keys.md, joined by U42 A21: in French
// (Canada) the workflow's "References" page names each reference row's "…" button
// "##common.moreActions##" for a screen reader. Takes the report's "References" Steps on PKP's
// default test dataset (`main` only: stable-3_5_0 has the older free-text References box):
//   1-3  dbarnes, submission OJS 5 / OMP 4 / OPS 1, "Publication" ("Preprint") > "References",
//        one reference typed and "Add"; the row's "…" button read in English (the control)
//   4-5  the same page by its address with /fr_CA/: the row button's name
// Every code on the page is listed (rawKeys) for the record; the page's main-only texts
// (submission.citations.structured*, list.collapse) are outside the report.
// Run, on an install freshly loaded from the default dataset (it adds one reference):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/references.js
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {gotoWorkflow, openEntry, addReference} = require('../arxiv-id-loses-version/lib');

const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const REFERENCE = 'Ridge, A. (2021). Tide tables u42r9.';

/** The accessible names of the row's buttons and of the table's column headers. */
async function rowNames(page) {
    // The table by any label: in French its aria-label is itself a code.
    const row = page.locator('table[aria-label]:visible').first().locator('tbody tr').filter({hasText: 'Tide tables u42r9'}).first();
    await row.waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    const buttons = await row.locator('button').evaluateAll((bs) => bs.map((b) => ({
        aria: b.getAttribute('aria-label'), text: b.innerText.trim(), visible: !!(b.offsetWidth || b.offsetHeight),
    })));
    const headers = await page.locator('table[aria-label]:visible').first().locator('thead th')
        .evaluateAll((ths) => ths.map((th) => th.innerText.trim() || th.getAttribute('aria-label') || th.textContent.trim()));
    const tableLabel = await page.locator('table[aria-label]:visible').first().getAttribute('aria-label').catch(() => null);
    const more = await row.getByRole('button', {name: /moreActions|More Actions|Plus d'actions/}).count();
    return {buttons, headers, tableLabel, moreActionsButtons: more};
}

forEachApp(async (app) => {
    if (app.line && app.line !== 'main') { console.log(`[u42a21 ${app.name}] ${app.line}: no structured References page`); return; }
    if (!app.dataset) throw new Error('references.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, submission: SUBMISSION[app.name]};
    const fact = (k, v) => { facts[k] = v; console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await gotoWorkflow(page, app, SUBMISSION[app.name]);
        fact('step2-heading', await openEntry(page, 'References'));
        fact('step3-add', await addReference(page, REFERENCE));
        await idle(page);
        const enUrl = page.url();
        fact('step3-url', enUrl.replace(/^https?:\/\/[^/]+/, ''));
        fact('step3-en-names', await rowNames(page));
        record('a21-step3-en', await screen(page));

        const frUrl = enUrl.replace(`/${app.contextPath}/en/`, `/${app.contextPath}/fr_CA/`);
        const resp = await page.goto(frUrl.includes('/fr_CA/') ? frUrl : app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?${new URL(enUrl).searchParams}`));
        await idle(page);
        await page.locator('table[aria-label]:visible').first().waitFor({timeout: 30_000}).catch(() => {});
        await idle(page);
        fact('step4-url', {status: resp && resp.status(), url: page.url().replace(/^https?:\/\/[^/]+/, '')});
        record('a21-step4-fr', await screen(page));
        await shot(page, 'a21-step4-fr');
        fact('step5-fr-names', await rowNames(page));
        const keys = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
        fact('step5-fr-codes', Array.isArray(keys) ? [...new Set(keys.map((x) => x.split(' @ ')[0]))] : keys);
        fact('step5-fr-codes-where', Array.isArray(keys) ? keys.filter((k) => k.startsWith('##common.moreActions##')) : keys);
    } finally {
        await close();
    }
    record('u42a21-facts', facts);
});
