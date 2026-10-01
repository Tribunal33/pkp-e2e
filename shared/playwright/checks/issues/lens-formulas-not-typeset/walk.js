// Issue report docs/issues/U13-OJS9-lens-formulas-not-typeset.md (U13 OJS9):
// an XML galley opens in the Lens reader, but the page's script fails as
// Lens finishes and the article's TeX formulas are never typeset. Takes the
// report's Steps on PKP's default test dataset (OJS only: the other apps
// have no Lens reader):
//   dbarnes adds an "XML" galley (formulas.xml, beside this script) to
//   submission 1's unpublished version 1.1 and publishes that version; then,
//   signed out, the article's page › "XML" › the Lens reader.
// The same read carries the neighbour check a fix must leave as it is: the
// paragraph with "$5 and $10" stays plain text, and the article's text and
// tabs still show.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/lens-formulas-not-typeset/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {T, sleep, rel, addGalleyToLatestVersion, readLens, watchErrors} = require('./lib');
const {publishLatestVersion} = require('../older-version-pdf-reader-empty/lib');

const SUBMISSION = 1;
const FILE = path.join(__dirname, 'formulas.xml');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        console.log(`[fact] ${app.name}: no Lens reader (XML galleys download); skipped`);
        return;
    }
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', submission: SUBMISSION};

    // Steps 1-4: dbarnes adds the XML galley to version 1.1 and publishes it.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            facts.galleys = await addGalleyToLatestVersion(page, app, SUBMISSION, {
                label: 'XML', component: 'Article Text', file: FILE, name: 'formulas.xml',
            });
            console.log(`[fact] galleys: ${JSON.stringify(facts.galleys)}`);
            facts.publish = await publishLatestVersion(page, app, SUBMISSION);
            console.log(`[fact] publish: ${JSON.stringify({button: facts.publish.button, publish: facts.publish.publish})}`);
            await signOut(page);
        } finally {
            await close();
        }
    }

    // Step 5, signed out: the article's page, "XML".
    const {page, close} = await launch(app);
    const errors = watchErrors(page);
    try {
        await page.goto(app.url(`/index.php/${ctx}/article/view/${SUBMISSION}`));
        await idle(page);
        const galleys = await page.locator('a.obj_galley_link').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
        facts.landing = {url: rel(page.url()), galleys: galleys.map((g) => ({...g, href: rel(g.href)}))};
        console.log(`[fact] landing: ${JSON.stringify(facts.landing)}`);
        record('step5-article-page', await screen(page));
        const xml = page.locator('a.obj_galley_link', {hasText: /^\s*XML\s*$/}).first();
        await xml.waitFor({state: 'visible', timeout: T});
        await xml.click();
        await page.waitForURL(/\/article\/view\/[^/]+\/\d+/, {timeout: T});
        facts.reader = await readLens(page);
        facts.reader.url = rel(page.url());
        facts.errors = errors.splice(0);
        // The kit's screen() waits on the page's jQuery and hangs on the Lens page: read its text directly.
        facts.reader.text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 1200);
        record('step5-lens', {facts: facts.reader, errors: facts.errors});
        await shot(page, 'step5-lens');
        const first = page.locator('.content-node.formula').first();
        if (await first.count()) {
            await first.scrollIntoViewIfNeeded().catch(() => {});
            await sleep(500);
            await shot(page, 'step5-lens-formulas');
        }
        // Check that the fix reaches no further: the reader's "Info" tab still opens its panel.
        const info = page.locator('.menu-bar a, .context-toggle').filter({hasText: /^\s*Info\s*$/}).first();
        if (await info.count()) {
            await info.click();
            await sleep(1000);
            facts.infoTab = (await page.locator('.resource-view, .surface.resource-view, .panel').filter({visible: true}).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300);
            await shot(page, 'step5-lens-info');
        }
        facts.errorsAfterInfo = errors.splice(0);
        console.log(`[fact] info tab: ${JSON.stringify(facts.infoTab)} errors ${JSON.stringify(facts.errorsAfterInfo)}`);
        console.log(`[fact] reader: ${JSON.stringify(facts.reader)}`);
        console.log(`[fact] errors: ${JSON.stringify(facts.errors)}`);
    } finally {
        await close();
    }
    record('facts', facts);
});
