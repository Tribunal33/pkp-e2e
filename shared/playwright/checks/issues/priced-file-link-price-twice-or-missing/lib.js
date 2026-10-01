// Helpers of walk.js (issue report docs/issues/U69-A7-A8-priced-file-link-price-twice-or-missing.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const path = require('path');
const {idle} = require('../../../probe');
const {sleep, flat, rel} = require('../older-version-pdf-reader-empty/lib');

const T = 30_000;

/** Step 1: Settings › Distribution › "Payments": "Enable", a currency, "Manual Fee Payment", instructions, "Save". */
async function setUpPayments(page, app, {currency, instructions}) {
    const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
    const tab = new PaymentSettingsTab(page, app.contextPath);
    await tab.goto();
    const before = {enabled: await tab.enableBox().isChecked()};
    await tab.enableBox().check();
    await tab.currencySelect().waitFor({state: 'visible', timeout: T});
    await tab.currencySelect().selectOption(currency);
    await tab.pluginSelect().selectOption({label: 'Manual Fee Payment'});
    await tab.instructionsBox().fill(instructions);
    const chosen = {currency: await tab.chosenOption(tab.currencySelect()), method: await tab.chosenOption(tab.pluginSelect())};
    const response = await tab.save();
    return {before, chosen, saveStatus: response.status(), saved: flat(await tab.savedStatus().innerText().catch(() => null), 60)};
}

/** Step 2: a book's workflow by its address, then "Publication" › "Publication Formats". Returns the page object. */
async function openFormats(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublicationFormatsPage} = require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await idle(page);
    const link = frame.menuLink('Publication Formats');
    if (!(await link.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    await link.last().waitFor({state: 'visible', timeout: T});
    await link.last().click();
    const formats = new PublicationFormatsPage(page, app.contextPath);
    await formats.grid().locator('tr.gridRow').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return formats;
}

/** A format's file rows as the list shows them: name and the terms link's words. */
async function fileTerms(formats, format) {
    return formats.fileRows(format).evaluateAll((rows) =>
        rows.map((tr) => ({
            name: (tr.querySelector('a.pkp_linkaction_downloadFile')?.textContent || '').replace(/\s+/g, ' ').trim(),
            terms: [...tr.querySelectorAll('a')].map((a) => (a.textContent || '').replace(/\s+/g, ' ').trim()).filter((t) => /^(Set Terms|Open Access|Direct Sales|Not Available)$/.test(t))[0] || null,
        }))
    );
}

/** Steps 3 and 4: a file's terms link, "Direct Sales", the price, "Save". */
async function setDirectSales(page, formats, format, fileName, price) {
    const win = await formats.openTerms(format, fileName);
    const out = {choices: await win.choiceLabels(), priceLabel: flat(await win.priceLabel().innerText().catch(() => null), 80)};
    await win.choose('directSales');
    await win.typePrice(price);
    const response = await win.pressSave();
    out.saveStatus = response.status();
    await win.expectClosed();
    await idle(page);
    await sleep(600);
    return out;
}

/** Steps 5 and 6: "Catalog", the book's title; the page's file links as a reader sees them. */
async function openBook(page, app, title) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${app.testApi === false ? '' : 'en/'}catalog`));
    const answered = page.waitForResponse((r) => r.request().resourceType() === 'document' && /\/catalog\/book\//.test(r.url()));
    await page.getByRole('link', {name: title}).first().click();
    const r = await answered;
    await idle(page).catch(() => {});
    return {url: rel(page.url()), status: r.status(), ...(await readFileLinks(page))};
}

/** The table of contents' chapters with their file links, and the side column's formats with theirs. */
async function readFileLinks(page) {
    const data = await page.evaluate(() => {
        const t = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
        const links = (root) => [...root.querySelectorAll('a.cmp_download_link, a.remote_resource')].map((a) => ({text: t(a), href: a.getAttribute('href'), html: a.innerHTML.replace(/\s+/g, ' ').trim()}));
        const chapters = [...document.querySelectorAll('.obj_monograph_full .item.chapters li')].map((li) => ({chapter: t(li.querySelector('.title')), links: links(li)}));
        const side = [...document.querySelectorAll('.obj_monograph_full .entry_details .item.files [class*="pub_format_"]')].map((div) => ({
            cls: div.className,
            label: t(div.querySelector(':scope > .label')),
            files: [...div.querySelectorAll('li')].map((li) => ({name: t(li.querySelector('.name')), link: links(li)[0] || null})),
            single: div.querySelector('li') ? null : links(div)[0] || null,
            text: t(div),
        }));
        return {chapters, side};
    });
    const strip = (l) => (l ? {...l, href: rel(l.href)} : l);
    return {
        chapters: data.chapters.map((c) => ({...c, links: c.links.map(strip)})),
        side: data.side.map((s) => ({...s, files: s.files.map((f) => ({...f, link: strip(f.link)})), single: strip(s.single)})),
    };
}

/** Step 7: press a file link; where it leads and what that page says. */
async function pressFileLink(page, linkText) {
    const link = page.locator('.obj_monograph_full .entry_details .item.files a.cmp_download_link').filter({hasText: linkText}).first();
    await Promise.all([page.waitForLoadState('load'), link.click()]);
    await idle(page).catch(() => {});
    await sleep(800);
    return {url: flat(rel(page.url()), 200), title: await page.title(), heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120), body: flat(await page.locator('.pkp_structure_main, body').first().innerText().catch(() => ''), 400)};
}

module.exports = {setUpPayments, openFormats, fileTerms, setDirectSales, openBook, readFileLinks, pressFileLink};
