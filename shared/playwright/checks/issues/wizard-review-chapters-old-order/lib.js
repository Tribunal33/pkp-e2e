// Helpers for the walk of docs/issues/U72-A13-wizard-review-chapters-old-order.md. Requiring this
// file runs nothing. The chapter-list helpers are copies of the U72 A7 walk's (a report's folder
// goes when its issue closes); the wizard's own steps come from the OMP page objects.
// The "Chapters" list of OMP is a legacy category grid: a chapter is a `tbody.category_grid_body`,
// its first `tr` the chapter row, then one `tr` per chapter author.
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Record the screen as data and as a PNG under `name`. */
async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), screenError: String(e.message || e).slice(0, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** The list as the DOM holds it: each chapter block with its title and its authors in order. */
async function blocks(list) {
    return list.grid().evaluate((root) =>
        [...root.querySelectorAll('tbody.category_grid_body')]
            .filter((tb) => !tb.classList.contains('ui-sortable-placeholder'))
            .map((tb) => {
                const rows = [...tb.querySelectorAll(':scope > tr.gridRow')].filter((tr) => tr.getClientRects().length);
                const text = (tr) => ((tr.querySelector('td .gridCellContainer') || {}).innerText || '').replace(/\s+/g, ' ').trim();
                const first = rows.find((tr) => tr.id && tr.id.match(/-category-(\d+)-row-\1$/));
                return {
                    chapter: first ? text(first) : null,
                    authors: rows.filter((tr) => tr !== first).map(text),
                };
            })
    );
}

/** "Title (Author, Author)" per chapter, top to bottom as the Details list draws it. */
async function detailsList(list) {
    return (await blocks(list)).map((b) => (b.authors.length ? `${b.chapter} (${b.authors.join(', ')})` : b.chapter));
}

/** Press "Done"; returns the save-sequence status and the answer's opening, never throws. */
async function done(list) {
    const page = list.page;
    const saved = page.waitForResponse((r) => /save-sequence/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
    await list.doneLink().click();
    const r = await saved;
    await idle(page);
    await sleep(800);
    return {status: r ? r.status() : null, body: r ? ((await r.text().catch(() => '')) || '').slice(0, 600) : null};
}

/** Press "Order" (the list scrolled to the middle of the screen first) and wait for "Done". */
async function startOrder(list) {
    await list.grid().evaluate((e) => e.scrollIntoView({block: 'center'})).catch(() => {});
    await sleep(200);
    await list.startOrdering();
    await sleep(500);
}

/** Drag an author row above another author row of the same chapter (the page object's drag). */
async function dragAuthor(list, title, name, aboveName) {
    await list.dragAuthorAbove(title, name, aboveName);
    await idle(list.page);
    await sleep(500);
}

/**
 * Drag a chapter row by its title cell up above another chapter's block, as a person would:
 * press on the title, move a little, then to the top edge of the target block, release.
 */
async function dragChapterAbove(list, title, aboveTitle) {
    const page = list.page;
    const cell = list.chapterRow(title).locator('td').first();
    const target = list.chapterBlock(aboveTitle);
    await cell.scrollIntoViewIfNeeded();
    const a = await cell.boundingBox();
    const b = await target.boundingBox();
    if (!a || !b) return {noBox: true};
    const x = a.x + Math.min(a.width / 2, 200);
    await page.mouse.move(x, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, a.y + a.height / 2 - 5, {steps: 5});
    await page.mouse.move(x, b.y + 3, {steps: 30});
    await sleep(400);
    await page.mouse.up();
    await idle(page);
    await sleep(600);
    return {};
}

/** Open a started wizard step from the rail ("Details", "Review"), waiting out Review's check. */
async function toStep(page, label) {
    const W = omp('SubmissionWizardPages.js');
    await W.gotoStep(page, label);
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: 20_000}).catch(() => {});
    await idle(page);
    await sleep(600);
}

/** The rail's current step, as it reads ("2 Details"). */
async function currentStep(page) {
    return ((await page.locator('.pkpSteps__step__label--current').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
}

/** Press the footer's "Continue" until the rail's current step ends with `label` (at most six presses). */
async function continueUntil(page, label) {
    const re = new RegExp(`${label}$`);
    for (let i = 0; i < 6 && !re.test(await currentStep(page)); i++) {
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
        await sleep(1200);
        await idle(page);
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: 20_000}).catch(() => {});
    }
    if (!re.test(await currentStep(page))) throw new Error(`"Continue" did not reach ${label}: on ${await currentStep(page)}`);
}

/**
 * On the Contributors step, "Add Contributor" with the Author role, "Save" (the OMP page object's
 * addContributor(), with the role taken as 3.5 offers it too: a radio "Author", already chosen).
 */
async function addContributor(page, {givenName, familyName, email, country = 'Iceland'}) {
    await page.getByRole('button', {name: 'Add Contributor'}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await modal.getByRole('textbox', {name: /^Given Name/}).first().fill(givenName);
    await modal.getByRole('textbox', {name: /^Family Name/}).first().fill(familyName);
    await modal.getByRole('textbox', {name: /^Email/}).fill(email);
    await modal.getByRole('combobox', {name: /^Country/}).selectOption({label: country});
    const box = modal.getByRole('checkbox', {name: 'Author', exact: true});
    if (await box.count()) await box.check();
    else await modal.getByRole('radio', {name: 'Author', exact: true}).check();
    const saved = page.waitForResponse((r) => r.url().includes('/contributors') && r.request().method() === 'POST' && r.ok(), {timeout: 30_000});
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: givenName}).first().waitFor({timeout: 20_000});
    await idle(page);
}

/** The Review step's "Chapters" panel: each item as "Title (authors)", top to bottom. */
async function reviewChapters(page) {
    const panel = page
        .locator('.submissionWizard__reviewPanel')
        .filter({has: page.locator('h3').filter({hasText: /^\s*Chapters\s*$/})})
        .first();
    if (!(await panel.count())) return null;
    return panel.evaluate((e) =>
        [...e.querySelectorAll('.submissionWizard__reviewPanel__item')].map((i) => {
            const t = (s) => ((i.querySelector(s) || {}).innerText || '').replace(/\s+/g, ' ').trim();
            const a = t('.submissionWizard__reviewPanel__item__value');
            return a ? `${t('.submissionWizard__reviewPanel__item__header')} (${a})` : t('.submissionWizard__reviewPanel__item__header');
        })
    );
}

/** What the database holds for a submission's current version: chapter seq and each chapter author link's seq beside authors.seq. */
function stored(app, subId) {
    return sql(
        app,
        `select c.chapter_id, c.seq,
            (select string_agg(ca.author_id || ':' || ca.seq || '/a' || a.seq, ',' order by ca.seq, ca.author_id)
               from submission_chapter_authors ca join authors a on a.author_id = ca.author_id where ca.chapter_id = c.chapter_id)
         from submissions s join submission_chapters c on c.publication_id = s.current_publication_id
         where s.submission_id = ${subId} order by c.seq`
    ).split('\n');
}

/** Open a book's "Chapters" page (main: the side menu's "Chapters"; 3.5: "Publication" › "Chapters"). */
async function openChapters(page, app, subId) {
    const {WorkflowPage} = require(path.join(ROOT, 'shared/playwright/pages/WorkflowPage.js'));
    const {ChapterList} = omp('ChapterPages.js');
    const frame = new WorkflowPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(subId, {menuKey: 'publication_chapters'});
    } else {
        await frame.gotoEditorial(subId);
        await frame.selectPage('Chapters');
    }
    const list = new ChapterList(page);
    await list.expectLoaded();
    await idle(page);
    return list;
}

module.exports = {ROOT, omp, sleep, snap, currentStep, continueUntil, addContributor, blocks, detailsList, done, startOrder, dragAuthor, dragChapterAbove, toStep, reviewChapters, stored, openChapters};
