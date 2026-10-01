// U47 A7 (ruled pending translation, no report): with the interface in French
// (Canada), the "Media" page of a publication, its four windows and its delete
// dialog show raw codes such as "##publication.mediaFiles.add##".
//
// Walks the steps on PKP's default test dataset (a dataset fleet):
//   1-3  dbarnes opens the submission's "Publication" › "Media" and adds
//        figure.png (Image, Web resolution) in English; the English page and
//        upload window are read for codes (control).
//   4    the dashboard's initials menu › "français".
//   5    "Media" again: the page.
//   6    the first button above the list (upload window), closed.
//   7    the other button (batch window), "Annuler".
//   8    the row's "…": the menu, then its third entry (manual link window), "Annuler".
//   9    "…" › second entry (metadata window), closed.
//   10   "…" › fourth entry (delete dialog), "Annuler".
//   11   the author signs in, chooses "français" and opens the same "Media" page.
// Controls: back in English, dbarnes's page, windows,
// menu and dialog read exactly the English texts; and the French "…" of
// another list using the same "More Actions" text (the galleys /
// publication formats list) is read for codes.
//
// Every step records `rawKeys()` (each `##key##` in text and attributes,
// screen-reader text included) and the visible texts of the window.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/media-page-french-raw-codes/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, rawKeys} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SETUP = {
    ojs: {submission: 5, author: 'ddiouf', galleysKey: 'galleys'},
    omp: {submission: 4, author: 'bbeaty', galleysKey: 'publicationFormats'},
    ops: {submission: 1, author: 'ccorino', galleysKey: 'galleys'},
};
const WEB = 'figure.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT, mediaDeleteQuestion} = require('../../../pages/MediaFilesPages.js');
    const {LanguageMenu} = require('../../../pages/LanguagesPages.js');
    const S = SETUP[app.name];
    const fx = (f) => path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${f}`);
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const facts = {app: app.name, line: app.line, dataset: app.dataset, submission: S.submission, startedAt: new Date().toISOString()};
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${S.submission}`).trim());
    facts.publicationId = pubId;

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels});
    const media = new MediaFileManager(page, frame);
    const menuKey = `publication_${pubId}_media`;

    // Language-neutral locators: the page's table is the workflow's only table
    // with a "File Name" row header; the windows are side modals with a header.
    const table = () => frame.dialog().locator('table').first();
    const root = () => table().locator('xpath=..');
    const topButtons = () => root().locator(':scope > div button, :scope > header button').filter({hasNot: page.locator('table')});
    const fileRow = () => table().locator('tbody tr').filter({has: page.locator('th', {hasText: WEB})}).first();
    const rowMenuButton = () => fileRow().locator('td').last().locator('button').first();
    const visibleDialogs = () => page.locator('[role="dialog"]:visible');
    const dialogCount = () => visibleDialogs().count();

    const openPage = async (author = false) => {
        if (author) await frame.gotoAuthor(S.submission, {menuKey});
        else await frame.gotoEditorial(S.submission, {menuKey});
        await expect(table()).toBeVisible({timeout: 30_000});
        await expect(table().locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
        await sleep(800);
    };
    const readPage = async () => ({
        url: page.url().replace(app.baseURL, ''),
        label: flat(await root().locator('h3').first().innerText().catch(() => null)),
        line: flat(await root().locator('p').first().innerText().catch(() => null)),
        buttons: (await topButtons().allInnerTexts()).map(flat),
        headings: (await table().locator('thead th').evaluateAll((ths) => ths.map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim()))),
        rowButtonName: (await rowMenuButton().count()) ? await rowMenuButton().evaluate((b) => b.getAttribute('aria-label') || (b.textContent || '').trim()) : null,
        rawKeys: await rawKeys(page),
    });
    // The newest side window (not the workflow itself): title, text, codes inside it.
    const readWindow = async (before) => {
        await expect.poll(() => dialogCount(), {timeout: 30_000}).toBeGreaterThan(before);
        await idle(page);
        await sleep(1000);
        const win = visibleDialogs().last();
        const out = {
            title: flat(await win.locator('h1').first().innerText()),
            text: flat(await win.innerText()),
            buttons: (await win.locator('button').allInnerTexts()).map(flat).filter(Boolean),
            options: (await win.locator('option').allInnerTexts()).map(flat),
            ariaNames: await win.locator('[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))),
            rawKeys: await win.evaluate((el) => {
                const re = /##[^#\s]+##/g, out = new Set();
                const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                while (walk.nextNode()) for (const m of walk.currentNode.nodeValue.match(re) || []) out.add(m);
                for (const e of el.querySelectorAll('*')) for (const a of e.attributes) for (const m of a.value.match(re) || []) out.add(`${m} (${a.name})`);
                return [...out];
            }),
        };
        return out;
    };
    // Leave a window by reopening the page (closing controls are what is under test).
    const snap = async (name) => record(name, await screen(page));
    const openMenu = async () => {
        await rowMenuButton().click();
        await expect(page.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
        return (await page.getByRole('menuitem').allInnerTexts()).map(flat);
    };
    const chooseItem = async (index) => {
        await openMenu();
        await page.getByRole('menuitem').nth(index).click();
    };
    const readDelete = async () => {
        const dlg = page.locator('[role="dialog"]:visible').filter({has: page.getByRole('button', {name: /^(OK)$/})}).last();
        await expect(dlg).toBeVisible({timeout: 30_000});
        await sleep(500);
        return {
            text: flat(await dlg.innerText()),
            html: (await dlg.innerHTML()).replace(/\s+/g, ' ').slice(0, 1500),
            buttons: (await dlg.locator('button').allInnerTexts()).map(flat).filter(Boolean),
            namesFile: (await dlg.innerText()).includes(WEB),
        };
    };
    const cancelDialog = async () => {
        const btn = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Annuler|Cancel)$/}).last();
        if (await btn.count()) await btn.click();
        await sleep(500);
    };
    // The initials menu sits behind the open submission: from the dashboard.
    const toLanguage = async (label, locale, dashboard = 'editorial') => {
        await page.goto(`/index.php/${app.contextPath}/dashboard/${dashboard}`);
        await idle(page);
        const m = new LanguageMenu(page);
        await m.choose(label, locale);
        await idle(page);
    };
    // The windows, menu and dialog in the current language.
    const walkWindows = async (prefix) => {
        const out = {};
        await openPage();
        out.page = await readPage();
        await snap(`${prefix}-page`);
        // the first top button: in English "Add Media File" (the upload window)
        const btnTexts = out.page.buttons;
        const addIdx = btnTexts.length - 1; // "Batch Link Media", then "Add Media File"
        let n = await dialogCount();
        await topButtons().nth(addIdx).click();
        out.upload = await readWindow(n);
        await snap(`${prefix}-upload`);
        await openPage();
        n = await dialogCount();
        await topButtons().nth(0).click();
        out.batch = await readWindow(n);
        await snap(`${prefix}-batch`);
        await openPage();
        out.menu = await openMenu();
        out.menuRawKeys = await rawKeys(page, {scope: '[role="menu"]'});
        await page.keyboard.press('Tab').catch(() => {});
        await openPage();
        n = await dialogCount();
        await chooseItem(2);
        out.manualLink = await readWindow(n);
        await snap(`${prefix}-manual-link`);
        await openPage();
        n = await dialogCount();
        await chooseItem(1);
        out.metadata = await readWindow(n);
        await snap(`${prefix}-metadata`);
        await openPage();
        await chooseItem(3);
        out.deleteDialog = await readDelete();
        await snap(`${prefix}-delete`);
        await cancelDialog();
        return out;
    };

    try {
        // ---- 1-3. dbarnes adds figure.png in English ---------------------------
        await signIn(page, 'dbarnes');
        await openPage();
        await media.addFiles([{file: fx(WEB), name: WEB, mediaType: 'Image', resolution: MEDIA_TEXT.web}]);
        facts.step3 = {rawKeysAfterAdd: await rawKeys(page)};
        await snap('03-english-after-add');

        // ---- 4. "français" ------------------------------------------------------
        await toLanguage('français', 'fr_CA');
        facts.step4 = {url: page.url().replace(app.baseURL, '')};

        // ---- 5-10. the page, its windows, menu and dialog in French ---------------
        facts.french = await walkWindows('fr');

        // ---- 11. the author -------------------------------------------------------
        await signOut(page);
        await signIn(page, S.author);
        await toLanguage('français', 'fr_CA', 'mySubmissions');
        await openPage(true);
        facts.author = await readPage();
        await snap('11-author-fr');

        // ---- Neighbour: English unchanged; another "…" list in French --------------
        await signOut(page);
        await signIn(page, 'dbarnes');
        facts.neighbourEnglish = await walkWindows('en');
        const en = facts.neighbourEnglish;
        facts.neighbourEnglishMatches = {
            label: en.page.label === MEDIA_TEXT.tableLabel,
            line: en.page.line === MEDIA_TEXT.description,
            buttons: JSON.stringify(en.page.buttons) === JSON.stringify([MEDIA_TEXT.batchButton, MEDIA_TEXT.addButton]),
            rowButtonName: en.page.rowButtonName === 'More Actions',
            uploadTitle: en.upload.title === MEDIA_TEXT.uploadTitle,
            uploadLine: en.upload.text.includes(MEDIA_TEXT.uploadDescription) && en.upload.text.includes(MEDIA_TEXT.clickToUpload),
            batchTitle: en.batch.title === MEDIA_TEXT.batchTitle && en.batch.text.includes(MEDIA_TEXT.batchDescription),
            menu: JSON.stringify(en.menu) === JSON.stringify(MEDIA_TEXT.menuFull),
            manualLink: en.manualLink.title === MEDIA_TEXT.linkTitle && en.manualLink.text.includes(MEDIA_TEXT.selectedFile) && en.manualLink.text.includes(MEDIA_TEXT.linkHelp),
            metadata: en.metadata.text.includes(MEDIA_TEXT.nameLabel) && en.metadata.text.includes(MEDIA_TEXT.nameHelp),
            deleteText: en.deleteDialog.text.includes(MEDIA_TEXT.deleteTitle) && en.deleteDialog.text.includes(mediaDeleteQuestion(WEB)),
            noCodes: [en.page.rawKeys, en.upload.rawKeys, en.batch.rawKeys, en.manualLink.rawKeys, en.metadata.rawKeys].every((k) => !k || k.length === 0),
        };
        await toLanguage('français', 'fr_CA');
        await frame.gotoEditorial(S.submission, {menuKey: `publication_${pubId}_${S.galleysKey}`});
        await idle(page);
        await sleep(1500);
        facts.neighbourGalleysFr = {
            url: page.url().replace(app.baseURL, ''),
            moreActionsNames: await frame.dialog().locator('table button[aria-label]').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label'))),
            headings: await frame.dialog().locator('table thead th').evaluateAll((ths) => ths.map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim())),
            rawKeys: await rawKeys(page),
        };
        await snap('12-galleys-fr');
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
