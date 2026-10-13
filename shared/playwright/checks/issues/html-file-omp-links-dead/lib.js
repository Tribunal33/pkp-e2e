// Helpers for walk.js (U69 A25, joined into the U69 A16 report). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const VISIBLE_DIALOG = '[role="dialog"]:visible';
/**
 * A press editor adds a free, approved, available publication format holding one file to a
 * book, on the workflow's "Publication Formats" page, as a person does: "Add publication
 * format" (the name, "OK"), the format row's "Change File" (first component, the file,
 * "Continue" twice, "Complete"), the file row's "Set Terms" ("Open Access", "Save"), the
 * format row's "Awaiting Approval" and "Not Available", each confirmed with "OK". Returns the words of each row and window met.
 */
async function addFreeFormatFile(page, app, {submissionId, formatName, file, fileName, dependent = null}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {
        labels: {publicationGroup: 'Publication'},
    });
    const out = {};
    const wf = () => page.locator(VISIBLE_DIALOG).first();
    const top = () => page.locator(VISIBLE_DIALOG).last();
    const snap = async (name) => record(name, await screen(page));
    /** Press a row's link, record the window it opens, press the window's confirming button. */
    const pressAndConfirm = async (key, link, {before = null, confirm = /^(OK|Yes|Approve|Save)$/} = {}) => {
        if (!(await link.count())) {
            out[key] = 'no such link';
            return;
        }
        const name = flat(await link.innerText().catch(() => null), 80);
        await link.click();
        await idle(page);
        await sleep(900);
        if (before) await before();
        const question = flat(
            await top()
                .innerText()
                .catch(() => null),
            300,
        );
        const button = top().getByRole('button', {name: confirm}).first();
        const buttonName = flat(await button.innerText().catch(() => null), 40);
        await snap(`add-${key}`);
        await button.click().catch(() => {});
        await idle(page);
        await sleep(1200);
        out[key] = {link: name, window: question, pressed: buttonName};
    };

    // the book's workflow, then "Publication Formats" in the side menu
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const menu = frame.menuLink('Publication Formats');
    if (
        !(await menu
            .last()
            .isVisible()
            .catch(() => false))
    )
        await frame.latestVersionNode().click();
    await menu.last().click();
    await idle(page);
    await sleep(800);
    await snap('add-1-formats');

    // "Add publication format": the name, "OK"
    const add = wf().getByRole('link', {name: 'Add publication format'}).first();
    out.addLink = flat(await add.innerText(), 60);
    await add.click();
    await top().locator('input[name^="name"]').first().waitFor({timeout: T});
    await idle(page);
    await top().locator('input[name^="name"]').first().fill(formatName);
    out.formatWindow = flat(
        await top()
            .innerText()
            .catch(() => null),
        400,
    );
    await snap('add-2-format-window');
    await top().getByRole('button', {name: 'OK', exact: true}).click();
    await idle(page);
    await sleep(1500);
    await idle(page);

    // the format's row: its file
    const formatRow = () =>
        wf()
            .locator('tr')
            .filter({hasText: formatName})
            .filter({has: page.locator('.onix_code')})
            .first();
    out.formatRowNew = flat(
        await formatRow()
            .innerText()
            .catch(() => null),
        300,
    );
    const change = formatRow().getByRole('link', {name: 'Change File', exact: true}).first();
    out.fileLink = flat(await change.innerText().catch(() => null), 60);
    await change.click();
    const wizard = page
        .getByRole('dialog')
        .filter({has: page.locator('div[id^="fileUploadWizard"]')})
        .last();
    await wizard.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    const genre = wizard.locator('select[id^="genreId"]');
    if (await genre.count()) {
        const options = await genre.locator('option').evaluateAll((els) => els.map((x) => ({v: x.value, t: x.text.trim()})).filter((x) => x.v));
        await genre.selectOption(options[0].v);
        out.component = options[0].t;
    }
    await wizard.locator('input[type="file"]').setInputFiles(file);
    await page.waitForFunction(
        () => {
            const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Continue' && x.getClientRects().length);
            return b && !b.disabled;
        },
        null,
        {timeout: T},
    );
    out.uploadWindow = flat(await wizard.innerText().catch(() => null), 300);
    await snap('add-3-upload-window');
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    if (dependent) out.dependent = await uploadDependent(page, dependent);
    const outer = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).first();
    await outer.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    await outer.getByRole('button', {name: 'Complete', exact: true}).click();
    await idle(page);
    await sleep(1500);
    await idle(page);

    // the file's row: its terms (the file's own approval is not needed for readers to get it)
    const fileRow = () => wf().locator('tr.gridRow').filter({hasText: fileName}).first();
    out.fileRowNew = flat(
        await fileRow()
            .innerText()
            .catch(() => null),
        200,
    );
    await pressAndConfirm('4-file-terms', fileRow().getByRole('link', {name: 'Set Terms', exact: true}).first(), {
        before: async () => {
            const open = top().locator('input[type="radio"][value="openAccess"]').first();
            if (await open.count()) await open.check();
            out.termsChoices = await top()
                .locator('label:has(input[type="radio"])')
                .evaluateAll((ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
        },
    });
    out.fileRowReady = flat(
        await fileRow()
            .innerText()
            .catch(() => null),
        200,
    );

    // the format's row: its approval, then its availability
    await pressAndConfirm('5-format-approval', formatRow().getByRole('link', {name: 'Awaiting Approval', exact: true}).first());
    await pressAndConfirm('6-format-availability', formatRow().getByRole('link', {name: 'Not Available', exact: true}).first());
    out.formatRowReady = flat(
        await formatRow()
            .innerText()
            .catch(() => null),
        300,
    );
    await snap('add-6-ready');
    return out;
}

/**
 * Steps 7-10 for one HTML file of a book, signed out: the Catalog, the book's title, the
 * file's link on the book's page; then each link in the file (its address as written in the
 * frame), and the press of the link `pressId` (the frame's and the page's address after it,
 * any new tab, any page error).
 */
async function followFileLink(page, app, {bookTitle, formatName, pressId, label}) {
    const errors = [];
    const onError = (e) => errors.push(flat(e.message, 200));
    page.on('pageerror', onError);
    const out = {};
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/catalog`));
        await idle(page);
        await page.getByRole('link', {name: bookTitle}).first().click();
        await idle(page);
        out.bookPage = rel(page.url());
        const link = page
            .locator('.obj_monograph_full a.cmp_download_link', {
                hasText: formatName,
            })
            .first();
        out.fileLink = flat(await link.innerText().catch(() => null), 80);
        const frameAnswer = page.waitForResponse((r) => /\/catalog\/download\//.test(r.url()) && r.request().resourceType() === 'document', {timeout: T}).catch(() => null);
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        const fa = await frameAnswer;
        await idle(page).catch(() => {});
        await sleep(800);
        out.viewPage = rel(page.url());
        out.tab = await page.title();
        out.frameRequest = fa ? `${fa.status()} ${rel(fa.url())} ${fa.headers()['content-type'] || ''}` : null;
        const frame = page.frameLocator('#htmlContainer iframe');
        out.frameText = flat(
            await frame
                .locator('body')
                .innerText({timeout: 10_000})
                .catch(() => null),
            200,
        );
        out.links = await frame
            .locator('a')
            .evaluateAll((as) =>
                as.map((a) => ({
                    id: a.id,
                    text: a.textContent.trim(),
                    href: a.getAttribute('href'),
                })),
            )
            .catch(() => []);
        await frame
            .locator('img')
            .first()
            .evaluate((img) => img.complete || new Promise((r) => img.addEventListener('load', r, {once: true}) || img.addEventListener('error', r, {once: true})))
            .catch(() => {});
        out.images = await frame
            .locator('img')
            .evaluateAll((is) => is.map((i) => ({id: i.id, src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, width: i.naturalWidth})))
            .catch(() => []);
        out.stylesheets = await frame
            .locator('link[rel="stylesheet"], style')
            .evaluateAll((ls) => ls.map((l) => l.getAttribute('href') || 'inline <style>'))
            .catch(() => []);
        out.placeholder = flat(
            await frame
                .locator('#placeholder')
                .innerText({timeout: 3000})
                .catch(() => null),
            120,
        );
        record(`${label}-8-view`, await screen(page));
        const frameEl = page.frame({name: 'htmlFrame'});
        out.frameUrlBefore = frameEl ? rel(frameEl.url()) : null;
        const popups = [];
        const onPopup = (p) => popups.push(p);
        page.context().on('page', onPopup);
        const target = frame.locator(`a#${pressId}`);
        if (await target.count()) {
            const nav = page.waitForEvent('framenavigated', {timeout: 8000}).catch(() => null);
            await target.click({timeout: 5000}).catch((e) => (out.pressError = flat(e.message, 200)));
            await nav;
            await idle(page).catch(() => {});
            await sleep(1500);
        } else {
            out.pressError = `no link #${pressId}`;
        }
        page.context().off('page', onPopup);
        const frameAfter = page.frame({name: 'htmlFrame'});
        out.pressed = pressId;
        out.frameUrlAfter = frameAfter ? rel(frameAfter.url()) : null;
        out.pageUrlAfter = rel(page.url());
        out.frameHeadingAfter = frameAfter
            ? flat(
                  await frameAfter
                      .locator('h1')
                      .first()
                      .innerText({timeout: 3000})
                      .catch(() => null),
                  160,
              )
            : null;
        out.newTabs = popups.map((p) => rel(p.url()));
        record(`${label}-10-pressed`, await screen(page));
    } finally {
        page.off('pageerror', onError);
        out.pageErrors = errors;
    }
    return out;
}

/**
 * In the upload window's "Review Details" step of an HTML file: the "Dependent Files" list's
 * upload link, then in the window it opens the component (`genre`, else the first offered), the
 * file, "Continue", "Continue", "Complete". Returns the words met and the list's rows after.
 */
async function uploadDependent(page, {file, genre = /Image/}) {
    const out = {};
    const wizards = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const outer = wizards().first();
    const grid = outer.locator('[id^="component-grid-files-dependent"]').first();
    await grid.waitFor({timeout: T});
    out.gridBefore = flat(await grid.innerText().catch(() => null), 200);
    const up = grid.getByRole('link', {name: /Upload/}).first();
    out.link = flat(await up.innerText().catch(() => null), 60);
    await up.click();
    await idle(page);
    await page.waitForFunction(() => document.querySelectorAll('div[id^="fileUploadWizard"]').length > 1, null, {timeout: T});
    const nested = wizards().last();
    await nested.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    await sleep(600);
    out.window = flat(await nested.innerText().catch(() => null), 300);
    const select = nested.locator('select[id^="genreId"]');
    if (await select.count()) {
        const options = await select.locator('option').evaluateAll((els) => els.map((x) => ({v: x.value, t: x.text.trim()})).filter((x) => x.v));
        const pick = options.find((o) => genre.test(o.t)) || options[0];
        await select.selectOption(pick.v);
        out.component = pick.t;
        out.components = options.map((o) => o.t);
    }
    await nested.locator('input[type="file"]').setInputFiles(file);
    const go = nested.getByRole('button', {name: 'Continue', exact: true});
    await expect(go).toBeEnabled({timeout: T});
    record('add-3b-dependent-window', await screen(page));
    await go.click();
    await idle(page);
    await sleep(800);
    await nested.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    await nested.getByRole('button', {name: 'Complete', exact: true}).click();
    await idle(page);
    await page.waitForFunction(() => document.querySelectorAll('div[id^="fileUploadWizard"]').length === 1, null, {timeout: T}).catch(() => {});
    await sleep(1200);
    await idle(page);
    out.gridAfter = flat(await grid.innerText().catch(() => null), 200);
    record('add-3c-dependent-listed', await screen(page));
    return out;
}

module.exports = {addFreeFormatFile, followFileLink, flat, rel};
