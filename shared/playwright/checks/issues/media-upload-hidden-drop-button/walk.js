// Issue report U47 A3: the empty "Upload Media File" window offers screen
// readers (and the Tab key) a button "Drop files here to upload" that nothing
// on the window shows.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-4  dbarnes › the Production submission › "Media" › "Add Media File".
//   5    the window's buttons, as the browser's accessibility tree lists them.
//   6    the focus on "Click to upload files", then Tab: where the focus lands
//        (and the Tab order from the window's "Close").
//   7    "Click to upload files" › figure.png: the buttons once its card shows.
//   8    the card's "Remove": the buttons again.
// Neighbour check (fix in and out): figure.png dropped on the drop area adds a
// card; "Image", "Web resolution", "Upload Files" add it to the list. OJS also
// records whether the "JATS XML" page (another hidden uploader, which the fix
// does not touch) lists the same button.
//
// Run, on an install freshly loaded from the default dataset (main only: the
// "Media" page exists there alone):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/media-upload-hidden-drop-button/walk.js
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert ojs omp ops.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const WEB = 'figure.png';
const HIDDEN = 'Drop files here to upload';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const line = app.line || 'main';
    const submissionId = SUBMISSION[app.name];
    const fx = (f) => path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${f}`);
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const facts = {app: app.name, line, dataset: app.dataset, submission: submissionId, startedAt: new Date().toISOString()};
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${submissionId}`).trim());
    facts.publicationId = pubId;

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels});
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    // The buttons a dialog's accessibility tree lists, by name.
    const buttonsIn = (ariaYaml) => [...String(ariaYaml || '').matchAll(/- button "([^"]*)"/g)].map((m) => m[1]);
    // Where the hidden button is and whether anything shows it.
    const hiddenFacts = async (scope) => {
        const b = scope.getByRole('button', {name: HIDDEN, exact: true});
        const n = await b.count();
        if (!n) return {count: 0};
        return {
            count: n,
            ...(await b.first().evaluate((el) => {
                const r = el.getBoundingClientRect();
                const box = el.closest('.absolute, .fileUploader') || el.parentElement;
                const br = box.getBoundingClientRect();
                const cs = getComputedStyle(box);
                const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                return {
                    html: el.outerHTML.slice(0, 200),
                    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
                    box: {cls: box.className, rect: [Math.round(br.width), Math.round(br.height)], opacity: cs.opacity, overflow: cs.overflow},
                    shownAtItsCentre: !!top && (top === el || el.contains(top)),
                    tabIndex: el.tabIndex,
                };
            })),
        };
    };
    // The browser's own accessibility tree (what a screen reader reads): the
    // buttons named HIDDEN that it does not ignore, with why it ignores the rest.
    // (Playwright's aria snapshot does not drop an inert subtree, so it is not
    // the measure here.)
    const axHidden = async () => {
        const cdp = await page.context().newCDPSession(page);
        try {
            await cdp.send('Accessibility.enable');
            const {nodes} = await cdp.send('Accessibility.getFullAXTree');
            const named = nodes.filter((n) => n.role?.value === 'button' && n.name?.value === HIDDEN);
            return {
                exposed: named.filter((n) => !n.ignored).length,
                ignored: named.filter((n) => n.ignored).map((n) => (n.ignoredReasons || []).map((r) => r.name).join(',')),
            };
        } finally {
            await cdp.detach().catch(() => {});
        }
    };
    const focused = () => page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return {tag: 'body'};
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 80),
            cls: String(el.className).slice(0, 80),
            rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
            shownAtItsCentre: !!top && (top === el || el.contains(top)),
        };
    });

    try {
        // 1-4.
        await signIn(page, 'dbarnes');
        const media = new MediaFileManager(page, frame);
        await media.open(submissionId, pubId);
        await idle(page);
        facts.namesBefore = await media.sortedNames();
        const win = await media.openUpload();
        await idle(page);
        await sleep(500);

        // 5. The window's buttons.
        let s = await snap('05-upload-window-empty');
        await shot(page, '05-upload-window-empty');
        facts.step5 = {ax: await axHidden(), buttons: buttonsIn(s.aria.dialogs.join('\n')), hidden: await hiddenFacts(win.dialog()),
            dialogText: s.text.dialog};

        // 6. Focus "Click to upload files", then Tab.
        await win.clickToUpload().focus();
        facts.step6 = {start: await focused()};
        await page.keyboard.press('Tab');
        facts.step6.afterTab = await focused();
        await shot(page, '06-after-tab');
        await page.keyboard.press('Tab');
        facts.step6.afterSecondTab = await focused();
        // The Tab order from the window's "Close", five presses.
        await win.closeButton().focus();
        facts.step6.tabOrder = [];
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            const f = await focused();
            facts.step6.tabOrder.push(`${f.tag} "${f.text || ''}"${f.shownAtItsCentre === false ? ' (not shown)' : ''}`);
        }
        await win.clickToUpload().focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        // What Enter does on the focused hidden button (back to it with Shift+Tab).
        await page.keyboard.press('Shift+Tab');
        facts.step6.backOn = await focused();
        if (facts.step6.backOn.text === HIDDEN) {
            const chooser = page.waitForEvent('filechooser', {timeout: 5000}).then(() => true).catch(() => false);
            await page.keyboard.press('Enter');
            facts.step6.enterOpensFileChooser = await chooser;
        }

        // 7. "Click to upload files" › figure.png.
        await win.chooseFiles([fx(WEB)]);
        await win.expectUploaded(WEB);
        s = await snap('07-card-uploaded');
        facts.step7 = {ax: await axHidden(), buttons: buttonsIn(s.aria.dialogs.join('\n')), hidden: await hiddenFacts(win.dialog())};

        // 8. "Remove" on the card.
        await win.removeCard(WEB);
        await sleep(500);
        s = await snap('08-card-removed');
        facts.step8 = {ax: await axHidden(), buttons: buttonsIn(s.aria.dialogs.join('\n')), hidden: await hiddenFacts(win.dialog())};

        // Neighbour: a file dropped on the drop area adds a card; "Upload Files" adds it.
        const b64 = fs.readFileSync(fx(WEB)).toString('base64');
        await win.dropArea().evaluate((el, {name, b64}) => {
            const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const dt = new DataTransfer();
            dt.items.add(new File([bytes], name, {type: 'image/png'}));
            for (const type of ['dragenter', 'dragover', 'drop']) {
                el.dispatchEvent(new DragEvent(type, {dataTransfer: dt, bubbles: true, cancelable: true}));
            }
        }, {name: WEB, b64});
        await win.expectUploaded(WEB);
        await win.chooseMediaType(WEB, 'Image');
        await win.chooseResolution(WEB, MEDIA_TEXT.web);
        s = await snap('09-dropped-card');
        facts.neighbourDrop = {buttons: buttonsIn(s.aria.dialogs.join('\n'))};
        const r = await win.submit();
        await idle(page);
        await snap('10-media-added');
        facts.neighbourDrop.add = {status: r.status(), url: r.url().replace(app.baseURL, '')};
        facts.neighbourDrop.namesAfter = await media.sortedNames();

        // Reach (OJS): the "JATS XML" page's own hidden uploader.
        if (app.name === 'ojs') {
            const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
            const jats = new JatsPage(page, frame);
            await jats.open(submissionId, pubId);
            await idle(page);
            s = await snap('11-jats-page');
            facts.reachJats = {ax: await axHidden(), buttons: buttonsIn(s.aria.dialogs.join('\n')), hidden: await hiddenFacts(page)};
        }
        await signOut(page);
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
