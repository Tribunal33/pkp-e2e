// Issue report walk: docs/issues/U63-A6-upload-file-keyboard-unreachable.md
// (spec U63 register A6). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own manager `rvaca`, on OJS,
// OMP and OPS. The kit builds nothing; the file chosen is a small local file.
//   1–2  sign in as rvaca, Tools › "Native XML Plugin" (opens on "Import")
//   3    click the "Import" tab's name (focus on the tab)
//   4–5  press Tab, up to eight times, recording each focused element
//   6    where the focus is on "Upload File": Enter; the file picker should
//        open; choose u63a6.xml; the box shows its name and "Change File"
// It also records the tabindex of the "Upload File" button and of plupload's
// hidden file input, and the import/upload requests the keys sent.
// Neighbour check (the fix must not reach further):
//   N1   a fresh page: click "Upload File" with the mouse; exactly one file
//        picker opens and the file goes up once (the double picker that
//        pkp/pkp-lib#1740 fixed must not come back)
// AUTHOR=1 (OJS only) takes the author's paths: A1 "Revisions Uploaded" ›
// "Upload" on submission 13 as lkumiega, then Tab from "Article Component";
// A2 "Start A New Submission" › "Upload Files", Tab to "Upload File", Enter.
// AUTHOR=A1 or AUTHOR=A2 takes one of them.
// REACH=1 (OJS only) takes the report's "A workflow file upload" steps instead:
// dbarnes, submission 3, "Upload/Select Files" › "Upload File", "Article
// Component" = "Article Text", then Tab from that field.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a6 node bin/probe.js all shared/playwright/checks/issues/upload-file-keyboard-unreachable/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a6 node bin/probe.js all shared/playwright/checks/issues/upload-file-keyboard-unreachable/walk.js
// Fix trial:    trial.sh beside this file (fix.diff applied, walk, revert, walk again).
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrf');

// What has the keyboard focus, in words a report can quote.
const focused = (page) => page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return {tag: 'body'};
    const label = (e.getAttribute('aria-label') || e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return {tag: e.tagName.toLowerCase(), id: e.id || null, type: e.getAttribute('type'), role: e.getAttribute('role'),
        text: label, visibleText: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        inUploadBox: !!e.closest('#plupload'), inImportForm: !!e.closest('#importXmlForm')};
});

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1200)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const file = outFile('u63a6.xml');
    fs.writeFileSync(file, '<?xml version="1.0"?>\n<u63a6/>\n');
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let step = 'start';
    const reqs = [];
    const errors = [];
    page.on('pageerror', (e) => errors.push({step, kind: 'pageerror', text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({step, kind: 'console', text: flat(m.text(), 300)}); });
    page.on('request', (r) => {
        const u = rel(r.url());
        if (/NativeImportExportPlugin\/(uploadImportXML|importBounce|import\b)/.test(u)) reqs.push({step, method: r.method(), url: u.slice(0, 160)});
    });
    page.on('response', (r) => { if (r.status() >= 400) errors.push({step, kind: 'http', text: `${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`}); });
    let choosers = [];
    page.on('filechooser', (fc) => choosers.push({step, fc}));
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const box = () => page.locator('#plupload');
    const boxState = async () => ({
        fileName: flat(await box().locator('.pkpUploaderFilename').innerText().catch(() => null), 120),
        buttonText: flat(await page.locator('#pkpUploaderButton').evaluate((b) => {
            const vis = [...b.querySelectorAll('span')].filter((s) => getComputedStyle(s).display !== 'none');
            return vis.map((s) => s.innerText).join(' ');
        }).catch(() => null), 80),
        temporaryFileId: await page.locator('#temporaryFileId').inputValue().catch(() => null),
    });
    const openPlugin = async () => {
        await page.goto(cu('/management/tools'));
        await idle(page);
        await page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first().click();
        await page.locator('#importExportTabs').waitFor({timeout: T});
        await idle(page);
        await page.locator('#plupload .moxie-shim input[type=file]').waitFor({state: 'attached', timeout: T});
        await pause(500);
    };
    if (process.env.AUTHOR) {
        // The author's paths (OJS): A1 a revision upload on submission 13
        // (revisions requested, author lkumiega), the older upload wizard;
        // A2 "Start A New Submission" › "Upload Files", the newer uploader.
        try {
            if (app.name !== 'ojs') return;
            step = 'A1 revisions';
            await signIn(page, 'lkumiega');
            if (process.env.AUTHOR !== 'A2') {
            await page.goto(cu('/dashboard/mySubmissions?workflowSubmissionId=13'));
            await idle(page); await pause(2500);
            await snap('a1-author-workflow');
            const ups = page.getByRole('button', {name: /Upload/});
            fact('A1 upload buttons', await ups.allInnerTexts());
            await ups.first().click();
            await idle(page); await pause(1500);
            const box = page.locator('.pkp_controller_fileUpload').last();
            const genre = page.locator('select[name="genreId"]').last();
            await box.or(genre).first().waitFor({timeout: T});
            if (await genre.count()) await genre.selectOption({label: 'Article Text'});
            const btn = box.locator('.pkp_uploader_button');
            await btn.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(800);
            await snap('a1-revision-wizard');
            fact('A1 wizard markup', await btn.evaluate((b) => ({text: b.innerText.replace(/\s+/g, ' ').trim(), tabindex: b.getAttribute('tabindex')})));
            const selects = page.locator('.pkp_modal select:visible, [role="dialog"] select:visible');
            const nSel = await selects.count();
            fact('A1 fields before the box', await selects.evaluateAll((ss) => ss.map((s) => s.name)));
            await (nSel ? selects.nth(nSel - 1) : genre).focus();
            const stops = [await focused(page)];
            for (let i = 1; i <= 3; i++) { await page.keyboard.press('Tab'); await pause(150); stops.push(await focused(page)); }
            fact('A1 tab stops from the last field', stops.map((s) => ({tag: s.tag, id: s.id, text: s.text})));
            }

            if (process.env.AUTHOR === 'A1') return;
            step = 'A2 submission wizard';
            await page.goto(cu('/submission'));
            await idle(page); await pause(1500);
            const main = page.getByRole('main');
            await main.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
            await main.locator('.pkpFormField--richText, .pkpFormField--richTextarea').first().click();
            await page.keyboard.type('u63a6 keyboard check');
            for (const r of await main.getByRole('radio', {name: 'English'}).all()) await r.check().catch(() => {});
            await main.getByRole('radio', {name: 'Articles'}).check().catch(() => {});
            for (const c of await main.getByRole('checkbox').all()) await c.check().catch(() => {});
            await snap('a2-start');
            await main.getByRole('button', {name: 'Begin Submission'}).click();
            await idle(page); await pause(2500);
            const add = page.getByRole('button', {name: 'Upload File', exact: true}).first();
            await add.waitFor({timeout: 30_000});
            await snap('a2-upload-files-step');
            fact('A2 button markup', await add.evaluate((b) => ({tag: b.tagName.toLowerCase(), tabindex: b.getAttribute('tabindex')})));
            await page.getByRole('heading', {name: 'Upload Files'}).first().click().catch(() => {});
            const stops2 = [];
            let reached = false;
            for (let i = 1; i <= 25; i++) {
                await page.keyboard.press('Tab'); await pause(100);
                const f = await focused(page);
                stops2.push(f.text);
                if (f.tag === 'button' && f.text === 'Upload File') { reached = true; break; }
            }
            fact('A2 Tab reaches "Upload File"', {reached, presses: stops2.length, stops: stops2});
            if (reached) {
                choosers = [];
                await page.keyboard.press('Enter');
                await pause(2000);
                fact('A2 Enter opens file pickers', choosers.length);
            }
        } finally {
            fact('errors', errors);
            record('facts-author', facts);
            await close();
        }
        return;
    }
    if (process.env.REACH) {
        // Reach (OJS): a workflow file list's upload opens the older upload
        // wizard, which carries the same box. dbarnes, submission 3 "The Facets
        // Of Job Satisfaction…" (Copyediting): its "Upload" button, then Tab from
        // the wizard's first field.
        try {
            if (app.name !== 'ojs') return;
            step = 'R1 workflow';
            await signIn(page, 'dbarnes');
            await page.goto(cu('/dashboard/editorial?workflowSubmissionId=3'));
            await idle(page); await pause(2000);
            const ups = page.getByRole('button', {name: /^Upload/});
            await ups.first().waitFor({timeout: T});
            fact('R1 upload buttons', await ups.allInnerTexts());
            await ups.first().click();
            await idle(page); await pause(1500);
            await snap('r1-select-files');
            const inner = page.getByRole('link', {name: 'Upload File', exact: true}).or(page.getByRole('button', {name: 'Upload File', exact: true})).last();
            fact('R1 then', await inner.innerText().catch(() => null));
            await inner.click();
            const genre = page.locator('select[name="genreId"]').last();
            await genre.waitFor({timeout: T});
            await idle(page); await pause(800);
            await snap('r1-upload-wizard');
            const box = page.locator('.pkp_controller_fileUpload').last();
            fact('R1 box shown before a component is chosen', await box.isVisible());
            // The box shows once a component is chosen: "Article Text".
            await genre.selectOption({label: 'Article Text'});
            const btn = box.locator('.pkp_uploader_button');
            await btn.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(800);
            await snap('r1-upload-wizard-component');
            fact('R1 wizard markup', await btn.evaluate((b) => ({text: b.innerText.replace(/\s+/g, ' ').trim(), tabindex: b.getAttribute('tabindex'),
                hiddenInputTabindex: (b.closest('.pkp_controller_fileUpload').querySelector('.moxie-shim input[type=file]') || {getAttribute: () => 'none'}).getAttribute('tabindex')})));
            step = 'R2 Tab';
            await genre.focus();
            const stops = [await focused(page)];
            for (let i = 1; i <= 4; i++) { await page.keyboard.press('Tab'); await pause(150); stops.push(await focused(page)); }
            fact('R2 tab stops from the component select', stops.map((s) => ({tag: s.tag, id: s.id, text: s.text})));
        } finally {
            fact('errors', errors);
            record('facts-reach', facts);
            await close();
        }
        return;
    }
    try {
        step = '1-2 sign in, plugin';
        await signIn(page, 'rvaca');
        await openPlugin();
        const s2 = await snap('plugin-import-tab');
        fact('step 2', {url: rel(page.url()), activeTab: flat(await page.locator('#importExportTabs > ul > li.ui-tabs-active').innerText(), 60),
            uploadFileInAriaTree: Object.values(s2.aria || {}).join('\n').includes('button "Upload File"'),
            markup: await page.evaluate(() => {
                const b = document.getElementById('pkpUploaderButton');
                const i = document.querySelector('#plupload .moxie-shim input[type=file]');
                return {button: b && {tabindex: b.getAttribute('tabindex'), type: b.getAttribute('type'), text: b.innerText.replace(/\s+/g, ' ').trim()},
                    hiddenInput: i && {tabindex: i.getAttribute('tabindex'), opacity: getComputedStyle(i).opacity}};
            })});

        step = '3 focus the Import tab';
        await page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').filter({hasText: /^Import$/}).first().click();
        await idle(page);
        fact('step 3', await focused(page));

        step = '4-5 Tab';
        const stops = [];
        let reached = false;
        for (let i = 1; i <= 8; i++) {
            await page.keyboard.press('Tab');
            await pause(150);
            const f = await focused(page);
            stops.push({press: i, ...f});
            if (f.id === 'pkpUploaderButton') { reached = true; break; }
            if (!f.inImportForm && i > 1 && stops[i - 2].inImportForm) break; // left the form
        }
        fact('steps 4-5 tab stops', stops);
        fact('Upload File reached by Tab', reached);
        await snap('after-tab');

        step = '6 Enter on Upload File';
        if (reached) {
            choosers = [];
            await page.keyboard.press('Enter');
            await pause(2000);
            const opened = choosers.filter((c) => c.step === step);
            fact('step 6 file pickers opened', opened.length);
            if (opened.length) {
                const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
                await opened[0].fc.setFiles(file);
                const u = await up;
                await idle(page); await pause(800);
                fact('step 6 upload', {status: u ? u.status() : 'no request', ...(await boxState()), focusAfter: await focused(page)});
                // Neighbour: the button adds one stop; plupload's hidden input stays out.
                await page.keyboard.press('Tab');
                await pause(150);
                fact('step 6 next Tab stop', await focused(page));
            }
            fact('step 6 requests', reqs.filter((r) => r.step === step));
            await snap('06-after-enter');
        } else {
            fact('step 6', 'not taken: no Tab stop landed on "Upload File"');
        }

        step = 'N1 mouse click';
        await openPlugin();
        choosers = [];
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#pkpUploaderButton').click();
        await pause(2500);
        const clicked = choosers.filter((c) => c.step === step);
        if (clicked.length) await clicked[0].fc.setFiles(file);
        const u = await up;
        await idle(page); await pause(1500);
        fact('N1 mouse', {filePickers: clicked.length, uploadStatus: u ? u.status() : 'no request',
            uploads: reqs.filter((r) => r.step === step && /uploadImportXML/.test(r.url)).length,
            otherRequests: reqs.filter((r) => r.step === step && !/uploadImportXML/.test(r.url)), ...(await boxState())});
        await snap('n1-mouse');
    } finally {
        fact('errors', errors);
        record('facts', facts);
        await close();
    }
});
