// @ts-check
/**
 * @file playwright/pages/MonographLandingPages.js
 *
 * OMP page objects for the Monograph landing page (spec:
 * docs/specs/U69-monograph-landing-page.md). OMP-only: a journal and a
 * preprint server install none of these pages (their counterpart is
 * `shared/playwright/pages/ArticleLandingPages.js`, which the book page
 * object extends for what the two pages share: the notices, the main
 * column's outline, the "Downloads" chart and the "How to Cite" block).
 *
 * Surfaces:
 * - MonographLandingPage — the book's page (`catalog/book/{id}` and
 *   `…/version/{publicationId}`) and a chapter's page (`…/chapter/{n}`,
 *   the same root with `.obj_chapter`): the notices, the title, the
 *   contributors, the main column's parts, the table of contents, the side
 *   column (cover, files, the date line, "Versions", "Series",
 *   "Categories", the copyright line, the format details, the chapter
 *   page's "Volume" and "Pages"), and the inherited "How to Cite" block.
 * - ViewableFilePage — the PDF and HTML view pages (`catalog/view/…`):
 *   the bar (return arrow, file name or title link, "Download"), the
 *   outdated-version notice, the PDF viewer's frame, the HTML frame.
 * - ManualPaymentPage — the "Manual Fee Payment" page a "Purchase" link
 *   opens, and the "Payment Notification" page its "Send notification of
 *   payment" opens.
 *
 * DOM facts (the U69 claim checks, `.reports/U69/screen-notes.md` ccK2–ccK5,
 * and the templates `frontend/objects/monograph_full.tpl`, `chapter.tpl`,
 * `components/publicationFormats.tpl`, `downloadLink.tpl`, the viewer
 * plugins' `display.tpl` and the manual payment plugin's
 * `paymentForm.tpl`, 2026-09-28):
 * - the page is `.obj_monograph_full` (a chapter's adds `.obj_chapter`),
 *   with no `main` landmark; the notices are its `.cmp_notification`
 *   children; the main column `.main_entry`, the side column
 *   `.entry_details`, each part a `.item.<kind>`;
 * - the side column's files are `.item.files > div[class^=pub_format_]`;
 *   a file a chapter holds is listed under that chapter in the table of
 *   contents (`.item.chapters > ul > li .files`), never in the side
 *   column, so a file link is found page-wide by its address;
 * - the date line is `.item.date_published > .sub_item:not(.versions)`,
 *   "Versions" `.sub_item.versions li` (the shown version plain text);
 * - the view pages carry none of the press's chrome: only
 *   `header.header_viewable_file` and the frame under it.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {ArticleLandingPage, flat, escapeRe, whole} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');

const T = 30_000;

/** Strings the pages print (lib/pkp and OMP locales, as the claim checks read them). */
const TEXT = {
    preview: 'This is a preview and has not been published. View submission',
    outdated: (date) => `This is an outdated version published on ${date}. Read the most recent version.`,
    published: 'Published',
    forthcoming: 'Forthcoming',
    versions: 'Versions',
    synopsis: 'Synopsis',
    plainLanguageSummary: 'Plain Language Summary',
    references: 'References',
    keywords: 'Keywords:',
    downloads: 'Downloads',
    howToCite: 'How to Cite',
    series: 'Series',
    categories: 'Categories',
    volume: 'Volume',
    pages: 'Pages',
    doi: 'DOI:',
    physicalDimensions: 'Physical Dimensions',
    hijri: 'Hijri Calendar',
    chapterCreated: ' — Chapter created',
    withoutChapter: ' — Without this chapter',
    viewTitle: (format, file) => `${format} view of the file ${file}`,
    returnTo: (title) => `Return to view details about ${title}`,
    downloadName: 'Download Download PDF',
    manualPayment: 'Manual Fee Payment',
    sendNotification: 'Send notification of payment',
    paymentNotification: 'Payment Notification',
    notificationSent: 'Payment notification sent',
    continue: 'Continue',
};

/** The default book picture a book without a cover shows (U68's reading). */
const DEFAULT_COVER = /\/templates\/images\/book-default(_t)?\.png$/;

/**
 * The book's address, relative to the server:
 * `/index.php/{press}/catalog/book/{id}[/version/{publicationId}][/chapter/{n}]`.
 *
 * @param {string} contextPath
 * @param {number|string} id the book's number or URL Path
 * @param {{version?: number|string, chapter?: number|string}} [options]
 */
function bookUrl(contextPath, id, {version, chapter} = {}) {
    let url = `/index.php/${contextPath}/catalog/book/${id}`;
    if (version !== undefined) url += `/version/${version}`;
    if (chapter !== undefined) url += `/chapter/${chapter}`;
    return url;
}

/**
 * A file link's address: `/index.php/{press}/catalog/view/{book}/{format}/{file}`.
 *
 * @param {string} contextPath
 * @param {number|string} book the book's number or URL Path
 * @param {number|string} format
 * @param {number|string} file
 */
function fileUrl(contextPath, book, format, file) {
    return `/index.php/${contextPath}/catalog/view/${book}/${format}/${file}`;
}

/** A RegExp matching an address (absolute or relative) that ends with `url`. */
function endsWith(url) {
    return new RegExp(`${escapeRe(url)}$`);
}

// ---------------------------------------------------------------------------
// The book's page and a chapter's page
// ---------------------------------------------------------------------------

class MonographLandingPage extends ArticleLandingPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath a one-language scratch press (bare addresses)
     */
    constructor(page, contextPath) {
        super(page, contextPath, {op: 'catalog'});
    }

    /**
     * The book's (or a chapter's) address.
     *
     * @param {number|string} id the number or URL Path
     * @param {{version?: number|string, chapter?: number|string}} [options]
     */
    url(id, {version, chapter} = {}) {
        return bookUrl(this.contextPath, id, {version, chapter});
    }

    /** The whole page (`.obj_monograph_full`, the chapter page's too). */
    article() {
        return this.page.locator('.obj_monograph_full');
    }

    /** The notices above the title. */
    notices() {
        return this.article().locator(':scope > .cmp_notification');
    }

    title() {
        return this.article().locator('h1.title');
    }

    /** The press's header over the page. */
    pressHeader() {
        return this.page.locator('header.pkp_structure_head');
    }

    /** The press's footer under the page. */
    pressFooter() {
        return this.page.locator('.pkp_structure_footer_wrapper');
    }

    /** The trail ("Home / …") above the title, if any. */
    trail() {
        return this.page.locator('nav.cmp_breadcrumbs');
    }

    // --- the main column --------------------------------------------------

    /** The contributors' names, top to bottom. */
    contributorNames() {
        return this.mainColumn().locator('.item.authors .sub_item > .label');
    }

    keywordsLabel() {
        return this.keywords().locator('.label');
    }

    keywordsValue() {
        return this.keywords().locator('.value');
    }

    /** A main-column part by its visible heading ("Synopsis", "Plain Language Summary", "References", "Downloads"). */
    part(heading) {
        return this.mainColumn()
            .locator(':scope > .item')
            .filter({has: this.page.locator(':scope > h2.label', {hasText: whole(heading)})});
    }

    /** The part's words under its heading. */
    partValue(heading) {
        return this.part(heading).locator('.value');
    }

    /** The main-column "DOI:" line's link (the chapter page's). */
    doiLink() {
        return this.mainColumn().locator('.item.doi a');
    }

    doiLabel() {
        return this.mainColumn().locator('.item.doi .label');
    }

    /**
     * The drawn chart as Chart.js holds it: its type and the number of
     * months (labels) it spans; null until it is drawn.
     */
    async chartShape() {
        return this.downloadsChart().locator('canvas.usageStatsGraph').evaluate((canvas) => {
            const w = /** @type {any} */ (window);
            const chart = w.Chart && w.Chart.getChart ? w.Chart.getChart(canvas) : null;
            if (!chart) return null;
            return {type: chart.config.type, months: (chart.data.labels || []).length};
        });
    }

    // --- the table of contents (Rule 10) ------------------------------------

    /** Every chapter entry, top to bottom. */
    tocEntries() {
        return this.mainColumn().locator('.item.chapters > ul > li');
    }

    /** The chapters' titles (their own words, without the subtitle), top to bottom. */
    tocTitles() {
        return this.tocEntries().locator('.title');
    }

    /** One chapter's entry, by its title. */
    tocEntry(title) {
        return this.tocEntries().filter({
            has: this.page.locator('.title', {hasText: new RegExp(`^\\s*${escapeRe(title)}(\\s|$)`)}),
        });
    }

    /** The link around a chapter's title (none when the chapter has no page). */
    tocTitleLink(title) {
        return this.tocEntry(title).locator('a:has(.title)');
    }

    tocSubtitle(title) {
        return this.tocEntry(title).locator('.title .subtitle');
    }

    tocAuthors(title) {
        return this.tocEntry(title).locator('.authors');
    }

    tocDoi(title) {
        return this.tocEntry(title).locator('.doi');
    }

    tocFileLinks(title) {
        return this.tocEntry(title).locator('.files a');
    }

    /** Press a chapter's title in the table of contents and wait for its page. */
    async openChapter(title) {
        await this.tocTitleLink(title).click();
        await expect(this.chapterRoot()).toBeVisible({timeout: T});
    }

    // --- the side column ----------------------------------------------------

    /**
     * The side column's parts top to bottom, each by its kind ("cover",
     * "files", "date_published", "series", "categories", "copyright",
     * "license", "publication_format", "citation", "monograph", …).
     *
     * @returns {Promise<string[]>}
     */
    async sideOutline() {
        return this.sideColumn().evaluate((column) =>
            Array.from(column.querySelectorAll(':scope > .item, :scope > section')).map((part) =>
                Array.from(part.classList).filter((c) => c !== 'item').join(' ')
            )
        );
    }

    /** The side column's parts, polled until they equal `kinds` (a server-rendered page, read settled). */
    async expectSideOutline(kinds) {
        await expect.poll(() => this.sideOutline(), {timeout: T}).toEqual(kinds);
    }

    /** The main column's parts, polled until they equal `parts`. */
    async expectMainOutline(parts) {
        await expect.poll(() => this.mainOutline(), {timeout: T}).toEqual(parts);
    }

    /** The visible headings of the page below the title (h2/h3 not for screen readers only), top to bottom. */
    async visiblePartHeadings() {
        return this.article().evaluate((root) =>
            Array.from(root.querySelectorAll('h2, h3'))
                .filter((h) => !h.classList.contains('pkp_screen_reader') && !h.closest('.pkp_screen_reader'))
                .map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
        );
    }

    coverPart() {
        return this.sideColumn().locator('.item.cover');
    }

    cover() {
        return this.coverPart().locator('img');
    }

    coverLink() {
        return this.coverPart().locator('a');
    }

    /** The side column's file and remote-format links, in its order. */
    sideFileLinks() {
        return this.sideColumn().locator('.item.files a');
    }

    /** A side-column link by its words. */
    sideFileLink(text) {
        return this.sideFileLinks().filter({hasText: whole(text)});
    }

    /** A file's link anywhere on the page (side column or table of contents), by its format and file numbers. */
    fileLink(formatId, fileId) {
        return this.article().locator(`a[href$="/${formatId}/${fileId}"]`);
    }

    /** The date line's heading ("Published" / "Forthcoming"). */
    publishedLabel() {
        return this.sideColumn().locator('.item.date_published > .sub_item:not(.versions) .label');
    }

    /** The date line itself. */
    publishedLine() {
        return this.sideColumn().locator('.item.date_published > .sub_item:not(.versions) .value');
    }

    publishedValue() {
        return this.publishedLine();
    }

    versionsPart() {
        return this.sideColumn().locator('.item.date_published .sub_item.versions');
    }

    versionsHeading() {
        return this.versionsPart().locator('.label');
    }

    versionEntries() {
        return this.versionsPart().locator('li');
    }

    /** A "Versions" link by its words (the entry's name). */
    versionLink(text) {
        return this.versionsPart().locator('li a').filter({hasText: whole(text)});
    }

    /** The "Versions" entries' links, whatever their words. */
    versionLinks() {
        return this.versionsPart().locator('li a');
    }

    /** The "Series" link. */
    seriesLink() {
        return this.sideColumn().locator('.item.series .sub_item .value a');
    }

    seriesLabel() {
        return this.sideColumn().locator('.item.series .sub_item .label').first();
    }

    categoryLinks() {
        return this.sideColumn().locator('.item.categories a');
    }

    categoriesLabel() {
        return this.sideColumn().locator('.item.categories .label');
    }

    copyrightLine() {
        return this.sideColumn().locator('.item.copyright');
    }

    /** Every format details block. */
    formatBlocks() {
        return this.sideColumn().locator('.item.publication_format');
    }

    /** A format's details block by the small heading it carries. */
    formatBlock(name) {
        return this.formatBlocks().filter({has: this.page.locator('.item_heading .label', {hasText: whole(name)})});
    }

    /** A block's small heading (only with more than one available format). */
    formatBlockHeading(block) {
        return block.locator('.item_heading .label');
    }

    /**
     * A details block's rows below its heading, each as `{label, value}`
     * (the value's own words, the Hijri line apart as `note`).
     *
     * @param {import('@playwright/test').Locator} block
     */
    async formatRows(block) {
        return block.evaluate((el) =>
            Array.from(el.querySelectorAll(':scope > .sub_item:not(.item_heading)')).map((row) => {
                const label = row.querySelector(':scope > .label');
                const value = row.querySelector(':scope > .value');
                const note = value ? value.querySelector('.hijri') : null;
                const own = value
                    ? Array.from(value.childNodes)
                          .filter((n) => n !== note)
                          .map((n) => n.textContent || '')
                          .join(' ')
                    : '';
                const f = (/** @type {string} */ s) => s.replace(/\s+/g, ' ').trim();
                return {label: f(label ? label.textContent || '' : ''), value: f(own), note: f(note ? note.textContent || '' : '')};
            })
        );
    }

    // --- the chapter page (Fields, the chapter page) -----------------------

    chapterRoot() {
        return this.page.locator('.obj_monograph_full.obj_chapter');
    }

    /** The "Volume" link (the book version's title). */
    volumeLink() {
        return this.sideColumn().locator('.item.monograph a');
    }

    volumeLabel() {
        return this.sideColumn().locator('.item.monograph .sub_item').first().locator('.label');
    }

    /** The "Pages" value. */
    pagesValue() {
        return this.sideColumn()
            .locator('.item.monograph .sub_item')
            .filter({has: this.page.locator('.label', {hasText: whole(TEXT.pages)})})
            .locator('.value');
    }

    /** Press the "Volume" link and wait for the book's page. */
    async pressVolume() {
        await this.volumeLink().click();
        await expect(this.page.locator('.obj_monograph_full:not(.obj_chapter)')).toBeVisible({timeout: T});
    }

    /**
     * Press a link of the page and wait until the address matches
     * `address` and the page it opens has its title.
     *
     * @param {import('@playwright/test').Locator} link
     * @param {RegExp} address
     */
    async follow(link, address) {
        await link.click();
        await expect(this.page).toHaveURL(address, {timeout: T});
        await this.expectLoaded();
    }

    /** Press the notice's "most recent version"; `address` is where it must lead. */
    async pressMostRecentVersion(address) {
        await this.follow(this.noticeLink('most recent version'), address);
    }

    /** Press a "Versions" link by its words; `address` is where it must lead. */
    async pressVersion(text, address) {
        await this.follow(this.versionLink(text), address);
    }
}

// ---------------------------------------------------------------------------
// The PDF and HTML view pages (Fields, the PDF view page, the HTML view page)
// ---------------------------------------------------------------------------

class ViewableFilePage extends BasePage {
    /** The bar across the top. */
    bar() {
        return this.page.locator('header.header_viewable_file');
    }

    /** The bar's parts left to right, by kind ("return", "title", "download"). */
    async barParts() {
        return this.bar().evaluate((bar) => Array.from(bar.children).map((c) => c.className.trim()));
    }

    /** The bar's parts, polled until they equal `kinds`. */
    async expectBarParts(kinds) {
        await expect.poll(() => this.barParts(), {timeout: T}).toEqual(kinds);
    }

    returnArrow() {
        return this.bar().locator('a.return');
    }

    /** The file name (PDF view page), plain text. */
    fileName() {
        return this.bar().locator('span.title');
    }

    /** The version's title as a link (HTML view page). */
    titleLink() {
        return this.bar().locator('a.title');
    }

    downloadLink() {
        return this.bar().locator('a.download');
    }

    /** The outdated-version notice between the bar and the file. */
    notice() {
        return this.page.locator('.viewable_file_frame_notice_message');
    }

    /** The PDF viewer's frame element. */
    pdfFrameElement() {
        return this.page.locator('#pdfCanvasContainer > iframe');
    }

    /** The pdf.js viewer inside that frame. */
    pdfViewer() {
        return this.page.frameLocator('#pdfCanvasContainer > iframe');
    }

    /** The viewer toolbar's page count ("of 1"). */
    pdfPageCount() {
        return this.pdfViewer().locator('#numPages');
    }

    /** The viewer's error bar, shown when the file cannot be loaded. */
    pdfErrorBar() {
        return this.pdfViewer().locator('#errorWrapper');
    }

    /** The viewer toolbar's own download button. */
    pdfViewerDownload() {
        return this.pdfViewer().locator('#download');
    }

    /** The HTML file's frame element and its content. */
    htmlFrameElement() {
        return this.page.locator('iframe[name="htmlFrame"]');
    }

    htmlBody() {
        return this.page.frameLocator('iframe[name="htmlFrame"]').locator('body');
    }

    /** Any of the press's chrome (header, footer, sidebar, the page wrapper). */
    pressChrome() {
        return this.page.locator('.pkp_structure_head, .pkp_structure_footer_wrapper, .pkp_structure_sidebar, .pkp_structure_page');
    }

    /** The view page is there: its bar. */
    async expectLoaded() {
        await expect(this.bar()).toBeVisible({timeout: T});
    }
}

// ---------------------------------------------------------------------------
// The payment page (Fields, the payment page; Rule 14)
// ---------------------------------------------------------------------------

class ManualPaymentPage extends BasePage {
    root() {
        return this.page.locator('.page_payment');
    }

    heading() {
        return this.root().locator('h1');
    }

    trail() {
        return this.page.locator('nav.cmp_breadcrumbs');
    }

    /** A row's value ("Title", "Fee"). */
    rowValue(label) {
        return this.root()
            .locator('table.data tr')
            .filter({has: this.page.locator('td.label', {hasText: whole(label)})})
            .locator('td.value');
    }

    notifyLink() {
        return this.root().getByRole('link', {name: TEXT.sendNotification, exact: true});
    }

    async expectLoaded() {
        await expect(this.heading()).toHaveText(TEXT.manualPayment, {timeout: T});
    }

    // --- the "Payment Notification" page ------------------------------------

    messageRoot() {
        return this.page.locator('.page_message');
    }

    messageHeading() {
        return this.messageRoot().locator('h1');
    }

    messageText() {
        return this.messageRoot().locator('.description');
    }

    continueLink() {
        return this.messageRoot().locator('.cmp_back_link').getByRole('link', {name: TEXT.continue, exact: true});
    }

    /** Press "Send notification of payment" and wait for the "Payment Notification" page. */
    async sendNotification() {
        await this.notifyLink().click();
        await expect(this.messageHeading()).toHaveText(TEXT.paymentNotification, {timeout: T});
    }
}

module.exports = {
    TEXT,
    DEFAULT_COVER,
    bookUrl,
    fileUrl,
    endsWith,
    flat,
    whole,
    escapeRe,
    MonographLandingPage,
    ViewableFilePage,
    ManualPaymentPage,
};
