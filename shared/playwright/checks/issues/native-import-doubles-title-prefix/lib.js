// Helpers for the workflow's "Title & Abstract" page and the Native XML round trip, shared by walk.js
// and neighbour.js. The Native XML Plugin page helpers come from the sibling issue walk's lib.js.
// Requiring this file runs nothing.
const fs = require('fs');
const {idle, settled, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const {sleep, flat} = native;
const T = 20_000;

/** The submission used per app: unpublished, one version, its title starting with "The". */
const SUBMISSIONS = {
    ojs: {id: 3, title: 'The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

const dialog = (page) => page.getByRole('dialog').first();
const titleBody = (page) => dialog(page).locator('iframe[id*="-title-control-en"]').first().contentFrame().locator('body');

/** Open a submission's workflow, then "Publication" ("Preprint") › "Title & Abstract". */
async function openTitleAbstract(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await dialog(page).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(1000);
    const entry = dialog(page).getByRole('link', {name: 'Title & Abstract', exact: true}).last();
    if (!(await entry.isVisible().catch(() => false))) {
        await dialog(page).getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
    }
    await entry.click();
    await dialog(page).getByRole('textbox', {name: /^Prefix/}).first().waitFor({timeout: T});
    await settled(page, titleBody(page)).catch(() => {});
}

/** What "Title & Abstract" shows: the workflow heading, "Prefix" and "Title". */
async function readTitleAbstract(page) {
    const d = dialog(page);
    return {
        headings: (await d.locator('h1, h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean).slice(0, 4),
        prefix: await d.getByRole('textbox', {name: /^Prefix/}).first().inputValue().catch(() => null),
        title: flat(await titleBody(page).innerText({timeout: 5000}).catch(() => null), 200),
    };
}

/** Step 3: "The" in "Prefix", "The " taken off the start of "Title", "Save". Returns the save's status. */
async function moveTheToPrefix(page, title) {
    const d = dialog(page);
    await d.getByRole('textbox', {name: /^Prefix/}).first().fill('The');
    const body = titleBody(page);
    await body.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(title.replace(/^The /, ''));
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return r ? r.status() : null;
}

/** Steps 4 and 5: export the submission and keep the file; returns the file's path and its <title>/<prefix> lines. */
async function exportToFile(app, page, title, name) {
    await native.openNative(app, page);
    const out = await native.exportOne(app, page, title.replace(/^The /, '').slice(0, 30));
    const file = outFile(`${name}.xml`);
    fs.writeFileSync(file, out.xml);
    const tags = (el) => [...out.xml.matchAll(new RegExp(`<${el} locale="([^"]+)">([^<]*)</${el}>`, 'g'))].map((m) => `${m[1]}: ${m[2]}`);
    return {file, exportTabs: out.res.tabs, titles: tags('title'), prefixes: tags('prefix')};
}

/** Step 6: import the file; returns the results tab and the imported ids with their listed titles. */
async function importAndRead(app, page, file) {
    await native.openNative(app, page);
    const res = await native.importFile(page, file);
    const imported = [...(res.panel || '').matchAll(/"(\d+)" - "([^"]*)"/g)].map((m) => ({id: Number(m[1]), listed: m[2]}));
    return {tabs: res.tabs, panel: res.panel, imported};
}

module.exports = {SUBMISSIONS, T, openTitleAbstract, readTitleAbstract, moveTheToPrefix, exportToFile, importAndRead};
