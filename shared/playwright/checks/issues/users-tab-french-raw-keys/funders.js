// Issue report docs/issues/U53-A11-users-tab-french-raw-keys.md, joined by U43 A14: in French
// (Canada) the workflow's "Funding" page names the funders list's hidden last column and each
// row's "…" button "##common.moreActions##" for a screen reader. Takes the report's "Funding" Steps
// on PKP's default test dataset (`main` only: stable-3_5_0 has no funders list):
//   11-12  dbarnes, submission OJS 5 / OMP 4 / OPS 1, "Publication" ("Preprint") > "Funding",
//          "Add Funder", the typed name "Fondation u43ir1" chosen, "Save"
//   13     the last column's and the row's "…" button's names in English (the control)
//   14     the same page by its address with /fr_CA/: the same two names
// Every code on the French page is listed (rawKeys) for the record; the list's own main-only texts
// (submission.funders*) are outside the report.
//
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               what the fix must leave alone, on the state `steps` left (no reset): the
//                    English page's two names and the French page's row menu ("Modifier",
//                    "Supprimer") and its submission.funders* codes. Saves nothing.
//
// The registry search is answered empty in the browser (no outside call); the typed-name choice
// does not depend on it. A name is read as Chromium's accessibility tree computes it.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/funders.js [steps|nb]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {axOf} = require('../role-stage-boxes-unnamed/lib.js');

const mode = process.argv[2] || 'steps';
const T = 30_000;
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const FUNDER = 'Fondation u43ir1';
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.line && app.line !== 'main') { console.log(`[u43a14 ${app.name}] ${app.line}: no funders list`); return; }
    if (!app.dataset) throw new Error('funders.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, mode, run: process.env.PROBE_RUN || null, submission: SUBMISSION[app.name]};
    const fact = (k, v) => { facts[k] = v; console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 2500)}`); };
    const part = async (name, fn) => { try { await fn(); } catch (e) { fact(`${name} error`, flat(e.message, 400)); } };

    const {page, close} = await launch(app);
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const sub = SUBMISSION[app.name];
    // The funders table by any name: in French its name is itself a code.
    const table = () => wf.dialog().locator('table[aria-label]:visible').filter({has: page.locator('thead')}).first();
    const row = () => table().locator('tbody tr').filter({hasText: FUNDER}).first();

    /** The table's name, its column headers' accessible names, and the funder row's buttons' names. */
    const names = async () => {
        await row().waitFor({state: 'visible', timeout: T}).catch(() => {});
        const out = {tableLabel: await table().getAttribute('aria-label').catch(() => null), headers: [], rowButtons: []};
        const ths = table().locator('thead th');
        for (let i = 0; i < (await ths.count()); i++) {
            const th = ths.nth(i);
            out.headers.push({text: flat(await th.textContent()), visible: flat(await th.innerText().catch(() => '')), ax: await axOf(page, th).catch((e) => e.message)});
        }
        const btns = row().locator('button');
        for (let j = 0; j < (await btns.count()); j++) out.rowButtons.push(await axOf(page, btns.nth(j)));
        out.rows = await table().locator('tbody tr').count();
        return out;
    };
    /** The row's "…" menu items, then Escape. */
    const menu = async () => {
        const btn = row().locator('td:last-child button').last();
        await btn.click();
        await sleep(400);
        const items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
        await page.keyboard.press('Escape');
        await sleep(300);
        return items;
    };
    /** Open the Funding page in English; returns its address. */
    const openFunding = async () => {
        await wf.gotoEditorial(sub);
        await wf.expectOpen(sub);
        await idle(page);
        await wf.expandLatestVersionNode().catch(() => {});
        await wf.select('Funding', `${group}: Funding`);
        await idle(page);
        await table().waitFor({timeout: T});
        return page.url();
    };
    const openFrench = async (enUrl) => {
        const frUrl = enUrl.replace(`/${app.contextPath}/en/`, `/${app.contextPath}/fr_CA/`);
        const resp = await page.goto(frUrl.includes('/fr_CA/') ? frUrl : app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?${new URL(enUrl).searchParams}`));
        await idle(page);
        await table().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return {status: resp && resp.status(), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
    };

    try {
        await signIn(page, 'dbarnes');
        let enUrl = null;
        await part('step11', async () => {
            enUrl = await openFunding();
            fact('step11-url', enUrl.replace(/^https?:\/\/[^/]+/, ''));
            fact('step11-rows-before', await table().locator('tbody tr').allInnerTexts().then((a) => a.map((t) => flat(t, 100))));
        });
        if (mode === 'steps') {
            await part('step12', async () => {
                await page.route('https://api.ror.org/**', (r) =>
                    r.fulfill({status: 200, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: '{"items":[]}'}));
                await wf.dialog().getByRole('button', {name: 'Add Funder', exact: true}).first().click();
                const panel = page.getByRole('dialog', {name: 'Add Funder'});
                await panel.waitFor({timeout: T});
                const search = panel.locator('input.pkpAutosuggest__input');
                await search.click();
                await search.pressSequentially(FUNDER, {delay: 15});
                await panel.locator('li.autosuggest__results-item').filter({hasText: FUNDER}).first().click();
                await panel.locator('input[name="name"]').first().waitFor({timeout: T});
                const answer = page.waitForResponse((r) => /\/funders(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await answer;
                await panel.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await row().waitFor({timeout: T});
                await idle(page);
                fact('step12-save', {status: r ? r.status() : null});
            });
        }
        await part('step13', async () => {
            fact('step13-en-names', await names());
            if (mode === 'nb') fact('nb-en-menu', await menu());
            record(`u43a14-step13-en${run}`, await screen(page));
        });
        await part('step14', async () => {
            fact('step14-url', await openFrench(enUrl));
            record(`u43a14-step14-fr${run}`, await screen(page));
            await shot(page, `u43a14-step14-fr${run}`);
            fact('step14-fr-names', await names());
            if (mode === 'nb') fact('nb-fr-menu', await menu());
            const keys = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
            fact('step14-fr-codes', Array.isArray(keys) ? [...new Set(keys.map((x) => x.split(' @ ')[0]))] : keys);
        });
    } finally {
        await close();
    }
    record(`u43a14-facts-${mode}${run}`, facts);
});
