// Issue report docs/issues/U13-OJS1-citation-formats-fail-outside-published-issue.md
// (U13 OJS1): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// journal `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: `rvaca` ticks "Citation Style Language" (Settings › Website
//      › Plugins); `dbarnes` publishes submission 5 with "Don't Assign To An
//      Issue" and submission 6 with "Assign To Future Issue and Publish
//      Immediately" into "Vol. 2 No. 1 (2015)" (not published)
//   1-3. on articles 5, 6 and the control 17 (in the published "Vol. 1 No. 2
//      (2014)"): open the article's page, "More Citation Formats" › "MLA",
//      then "BibTeX" under "Download Citation"
//   4-7. the same signed out and as ccorino (Reader), the article's Author
//      (ddiouf / dphillips / vkarbasizaed), minoue (unassigned Section
//      editor), rvaca (Journal manager), dbuskins (assigned Section editor)
//      and mfritz (assigned Copyeditor)
// Neighbour (`neighbour` as the script's argument, with the fix in and out):
//   an unpublished article's preview (submission 9, Production) opened by
//   its address as its Author fpaglieri and as rvaca, and signed out; the
//   fix must leave it as it is.
// On stable-3_5_0 the publish window has no issue choice outside a
// published issue: the script records the window for submission 5 and
// walks the control article only.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/citation-formats-outside-published-issue/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/citation-formats-outside-published-issue/walk.js
// Facts: .reports/<feature>/ir1/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');

/**
 * One reader's pass over one article's "How to Cite": the page, "MLA",
 * "BibTeX". Returns what each answered and what the screen showed.
 */
async function citeCheck(page, app, articleId) {
    const out = {articleId};
    const response = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${articleId}`));
    await idle(page);
    out.pageStatus = response ? response.status() : null;
    const block = page.locator('.item.citation');
    if ((await block.count()) === 0) {
        out.citationBlock = false;
        out.pageText = flat((await screen(page)).text.main, 200);
        return out;
    }
    const output = page.locator('#citationOutput');
    out.before = flat(await output.innerText());
    const button = block.locator('button[aria-controls="cslCitationFormats"]');
    // Step 2: "More Citation Formats" › "MLA".
    await button.click();
    await page.locator('#cslCitationFormats').waitFor({state: 'visible', timeout: T});
    const fetched = page
        .waitForResponse((r) => r.url().includes('citationstylelanguage/get/modern-language-association'), {timeout: T})
        .catch(() => null);
    await page.locator('#cslCitationFormats a', {hasText: /^\s*MLA\s*$/}).click();
    const mla = await fetched;
    out.mlaStatus = mla ? mla.status() : null;
    await sleep(1500);
    out.after = flat(await output.innerText());
    out.citationChanged = out.after !== out.before;
    out.listOpenAfterMla = await page.locator('#cslCitationFormats').isVisible();
    // Step 3: "BibTeX" under "Download Citation" (a plain link: a file, or a page).
    if (!out.listOpenAfterMla) {
        await button.click();
        await page.locator('#cslCitationFormats').waitFor({state: 'visible', timeout: T});
    }
    const link = page.locator('#cslCitationFormats div.label + ul a', {hasText: /^\s*BibTeX\s*$/});
    const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
    const nav = page
        .waitForResponse((r) => r.url().includes('citationstylelanguage/download/bibtex'), {timeout: T})
        .catch(() => null);
    await link.click();
    const [download, answer] = await Promise.all([Promise.race([dl, sleep(T).then(() => null)]), nav]);
    out.bibtexStatus = answer ? answer.status() : null;
    if (download) {
        out.bibtexDownload = download.suggestedFilename();
        const file = await download.path().catch(() => null);
        out.bibtexHead = file ? flat(require('fs').readFileSync(file, 'utf8'), 80) : null;
    } else {
        await idle(page).catch(() => {});
        const s = await screen(page);
        out.bibtexPage = {url: s.url.replace(/^https?:\/\/[^/]+/, ''), title: s.title, text: flat(s.text.main || s.text.header || '', 160)};
        out.bibtexPageBodyLength = (await page.locator('body').innerText().catch(() => '')).trim().length;
    }
    return out;
}

async function enablePlugin(page, app) {
    const {CitationStyleSettings} = require('../../../pages/ArticleLandingPages');
    await signIn(page, 'rvaca');
    const settings = new CitationStyleSettings(page, app.contextPath);
    await settings.openPlugins();
    const was = await settings.enabledBox().isChecked();
    if (!was) await settings.setEnabled(true);
    record('plugin', {wasEnabled: was, enabled: await settings.enabledBox().isChecked()});
    await shot(page, 'plugin').catch(() => {});
}

async function publish(page, app, id, how) {
    const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(id);
    await pub.openEntry('Title & Abstract'); // the publish button sits on a Publication page
    if (how === 'future') await pub.publish({futureIssueLabel: /Vol\. 2 No\. 1 \(2015\)/});
    else await pub.publish();
    const s = await screen(page);
    record(`publish-${id}`, {how, status: flat(await pub.leftControls().innerText().catch(() => '')), dialog: flat(s.text.dialog, 300)});
}

const ROLES = {
    5: ['(signed out)', 'ccorino', 'ddiouf', 'minoue', 'rvaca', 'dbuskins', 'mfritz'],
    6: ['(signed out)', 'ccorino', 'dphillips', 'minoue', 'rvaca', 'dbuskins', 'mfritz'],
    17: ['(signed out)', 'ccorino', 'vkarbasizaed', 'minoue', 'rvaca', 'dbuskins', 'mfritz'],
};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues are a journal's: OJS alone has the surface
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, results: []};
    try {
        await enablePlugin(page, app);
        if (NEIGHBOUR) {
            // An unpublished article (submission 9, Production) previewed by its address.
            for (const who of ['(signed out)', 'fpaglieri', 'rvaca']) {
                if (who === '(signed out)') await signOut(page);
                else await signIn(page, who);
                const r = await citeCheck(page, app, 9);
                facts.results.push({who, ...r});
            }
        } else if (app.line === 'stable-3_5_0') {
            // 3.5: the publish window for submission 5, then the control article.
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${app.contextPath}/workflow/access/5`));
            await idle(page);
            const btn = page.getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            await btn.waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
            if (await btn.isVisible()) {
                await btn.click();
                await sleep(3000);
                await idle(page);
                const s = await screen(page);
                facts.publishWindow35 = {button: flat(await btn.innerText()), text: flat(s.text.dialog || s.text.main, 1200)};
                await shot(page, 'publish-window-35').catch(() => {});
            }
            for (const who of ROLES[17]) {
                if (who === '(signed out)') await signOut(page);
                else await signIn(page, who);
                facts.results.push({who, ...(await citeCheck(page, app, 17))});
            }
        } else {
            await signIn(page, 'dbarnes');
            await publish(page, app, 5, 'none');
            await publish(page, app, 6, 'future');
            for (const id of [5, 6, 17]) {
                for (const who of ROLES[id]) {
                    if (who === '(signed out)') await signOut(page);
                    else await signIn(page, who);
                    const r = await citeCheck(page, app, id);
                    facts.results.push({who, ...r});
                    if (who === '(signed out)' || who === 'ccorino') await shot(page, `cite-${id}-${who.replace(/\W/g, '')}`).catch(() => {});
                }
            }
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
        for (const r of facts.results) {
            console.log(
                `${r.articleId} ${r.who.padEnd(13)} page ${r.pageStatus} mla ${r.mlaStatus} changed ${r.citationChanged} bibtex ${r.bibtexStatus} ${
                    r.bibtexDownload || (r.bibtexPage ? `page "${r.bibtexPage.title}" len ${r.bibtexPageBodyLength}` : '')
                }${r.citationBlock === false ? ' (no citation block)' : ''}`
            );
        }
        await close();
    }
});
