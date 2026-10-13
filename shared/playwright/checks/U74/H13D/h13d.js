// U74 claim check H13D {OMP} (housekeeping 2026-10-13): incidentals rows 22 and 43.
//
// `reps` (row 43; Fields, the "Representatives" page; Rules 5, 8a; A20): a book's "Marketing" ›
// "Representatives" as the Press manager. The install's first representative (A20's id 1) is put
// on another book first, so the rows read here are free of A20. On "How Canadians Communicate"
// (submission 4): two agents and one supplier added, the agents deleted one by one, then the
// supplier; each group's rows and "No Items" line read after each redraw and after a reload.
//
// `extent` (row 22; Rule 24b, note o): Settings › Press › "Masthead" gets the four ONIX details;
// the "Metadata" tab of submission 4's "PDF" (remotely hosted, no files) is recorded; Tools ›
// "ONIX 3.0 Monograph Export Plugin" exports submissions 4 and 14 (14's "PDF": six approved
// 14.2 KB files), and each product's file-size `Extent` is read; then two digital formats are
// added to submission 4, "Ebook <run>" given a 2.7 MB file by "Change File", approved
// ("Awaiting Approval" › "Approve Proof" › "OK"), and "Empty <run>" left without files, and 4
// is exported again.
//
// Mutates the dataset fleet's press, so reset the fleet before each run:
//   npm run reset:omp -- --dataset 4
//   PKP_E2E_DATASET=4 PROBE_FEATURE=U74 PROBE_AGENT=ccH13D PROBE_RUN=r1 \
//     node bin/probe.js omp shared/playwright/checks/U74/H13D/h13d.js [reps|extent|all]
// (PKP_E2E_LINE=stable-3_5_0 in front for 3.5.) Records the screens, asserts nothing.
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, serverLog, outFile, loc} = require('../../../probe');

const MODE = process.argv[2] || process.env.MODE || 'all';
const RUN = process.env.PROBE_RUN || 'r0';
const MANAGER = 'rvaca';
const BOOK = {id: 4, title: /^How Canadians Communicate/};
const BOOK14 = {id: 14, title: /^From Bricks to Brains/};
const SENTINEL_BOOK = 5;
const MB = 1024 * 1024;
// Under the probe servers' PHP upload_max_filesize (2M): two files of 1.9 MB, 3.8 MB together.
const BIG_BYTES = Math.round(1.9 * MB);

const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const facts = {mode: MODE, run: RUN, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${RUN} ${app.line}] ${k}:`, String(JSON.stringify(v)).slice(0, 1800));
    };
    const step = async (name, fn) => {
        const from = log.mark();
        try {
            const out = await fn();
            const errs = log.since(from).map((l) => flat(l, 400));
            return errs.length ? {...(out || {ok: true}), serverLog: errs} : out === undefined ? {ok: true} : out;
        } catch (e) {
            await shot(page, `h13d-error-${name}`).catch(() => {});
            return {error: flat(e && e.message), screen: await screen(page).catch(() => null), serverLog: log.since(from).map((l) => flat(l, 400))};
        }
    };
    try {
        await signIn(page, MANAGER);
        if (MODE === 'reps' || MODE === 'all') await reps(app, page, fact, step);
        if (MODE === 'extent' || MODE === 'all') await extent(app, page, fact, step);
    } finally {
        record(`h13d-${MODE}`, facts);
        await close();
    }
});

// ---------------------------------------------------------------------------
// Row 43: the "Representatives" table emptied group by group

async function reps(app, page, fact, step) {
    const {RepresentativesPage, rowCells} = require(`${app.suiteDir}/pages/OnixPages.js`);
    const {DeleteDialog} = require(`${app.suiteDir}/pages/PublicationFormatPages.js`);
    const stored = () => sql(app, 'select representative_id, submission_id, name, role, is_supplier from representatives order by representative_id');

    /** The table as drawn: each tbody's class, id, visibility and text, then each group's rows and "No Items". */
    const table = async (rp) => {
        const bodies = await rp.grid().locator('table > tbody').evaluateAll((bs) => bs.map((b) => ({
            cls: b.getAttribute('class'),
            id: b.getAttribute('id'),
            visible: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
            text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        })));
        const out = {bodies};
        for (const g of ['Agents', 'Suppliers']) {
            const rows = rp.rows(g);
            const n = await rows.count();
            out[g] = [];
            for (let i = 0; i < n; i++) out[g].push(await rowCells(rows.nth(i)).catch(() => null));
            out[`${g}NoItems`] = await rp.groupEmpty(g).count().then((c) => c > 0 && rp.groupEmpty(g).first().innerText().then(flat)).catch((e) => ({error: flat(e.message, 200)}));
        }
        out.visibleText = flat(await rp.grid().innerText().catch(() => ''), 800);
        return out;
    };
    const notices = () => {
        const seen = [];
        const t = setInterval(async () => {
            for (const x of await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])) {
                const s = flat(x, 200);
                if (s && !seen.includes(s)) seen.push(s);
            }
        }, 150);
        return {seen, stop: () => clearInterval(t)};
    };
    const redraws = [];
    page.on('response', (r) => {
        const m = r.url().match(/representatives-grid\/(fetch-row|fetch-category|fetch-grid|update-representative|delete-representative)\b/);
        if (!m) return;
        const q = new URL(r.url()).searchParams;
        redraws.push(r.text().then((t) => ({op: m[1], rowId: q.get('rowId'), cat: q.get('rowCategoryId'), status: r.status(), body: flat(t, 300)})).catch(() => ({op: m[1], status: r.status()})));
    });
    const take = async () => Promise.all(redraws.splice(0));

    const add = async (rp, type, name, role) => {
        const n = notices();
        const win = await rp.openAdd();
        if (type === 'agent') {
            await win.chooseType('agent');
            await win.roleList('agent').selectOption({label: role});
        } else {
            // A12's way round: both types clicked before a supplier saves.
            await win.chooseType('agent');
            await win.chooseType('supplier');
            await win.roleList('supplier').selectOption({label: role});
        }
        await win.nameBox().fill(name);
        await win.ok();
        await pause(1500);
        await idle(page).catch(() => {});
        n.stop();
        return {notices: n.seen, requests: await take(), table: await table(rp)};
    };
    const del = async (rp, group, name) => {
        const n = notices();
        await rp.openDelete(group, name);
        const d = new DeleteDialog(page);
        await d.ok();
        await pause(1500);
        await idle(page).catch(() => {});
        n.stop();
        return {notices: n.seen, requests: await take(), table: await table(rp)};
    };
    const reload = async (rp) => {
        await rp.reload();
        await idle(page).catch(() => {});
        await take();
        return {table: await table(rp)};
    };

    const A1 = `Agent One ${RUN}`;
    const A2 = `Agent Two ${RUN}`;
    const S1 = `Supplier One ${RUN}`;
    fact('stored-0', stored());
    // The install's first representative, on another book (A20 out of play on submission 4).
    fact('sentinel', await step('sentinel', async () => {
        const rp5 = new RepresentativesPage(page, app.contextPath);
        await rp5.gotoEditorial(SENTINEL_BOOK);
        const out = await add(rp5, 'agent', `Sentinel ${RUN}`, 'Sales agent (08)');
        out.afterReload = await reload(rp5);
        return out;
    }));
    fact('stored-1', stored());

    const rp = new RepresentativesPage(page, app.contextPath);
    fact('open', await step('open', async () => {
        await rp.gotoEditorial(BOOK.id);
        await take();
        return {table: await table(rp)};
    }));
    record(`h13d-reps-open`, await screen(page));
    await loc(page, 'Representatives: a group\'s "No Items" line (tbody after the group body)', rp.groupEmpty('Agents'));
    fact('add-a1', await step('add-a1', () => add(rp, 'agent', A1, 'Exclusive sales agent (05)')));
    fact('add-a2', await step('add-a2', () => add(rp, 'agent', A2, 'Sales agent (08)')));
    fact('add-s1', await step('add-s1', () => add(rp, 'supplier', S1, 'Distributor to end-customers (12)')));
    record(`h13d-reps-three`, await screen(page));
    fact('stored-2', stored());
    fact('del-a1', await step('del-a1', () => del(rp, 'Agents', A1)));
    fact('del-a2-last-agent', await step('del-a2', () => del(rp, 'Agents', A2)));
    record(`h13d-reps-agents-emptied`, await screen(page));
    await shot(page, 'h13d-reps-agents-emptied');
    fact('reload-1', await step('reload-1', () => reload(rp)));
    record(`h13d-reps-agents-emptied-reload`, await screen(page));
    fact('del-s1-last-supplier', await step('del-s1', () => del(rp, 'Suppliers', S1)));
    record(`h13d-reps-all-emptied`, await screen(page));
    await shot(page, 'h13d-reps-all-emptied');
    fact('reload-2', await step('reload-2', () => reload(rp)));
    // The other way round: one supplier and one agent added to the empty table, the supplier deleted first.
    fact('add-s2', await step('add-s2', () => add(rp, 'supplier', `${S1} b`, 'Distributor to end-customers (12)')));
    fact('add-a3', await step('add-a3', () => add(rp, 'agent', `${A1} b`, 'Sales agent (08)')));
    fact('del-s2-last-supplier', await step('del-s2', () => del(rp, 'Suppliers', `${S1} b`)));
    record(`h13d-reps-suppliers-emptied`, await screen(page));
    await shot(page, 'h13d-reps-suppliers-emptied');
    fact('del-a3-last-agent', await step('del-a3', () => del(rp, 'Agents', `${A1} b`)));
    record(`h13d-reps-all-emptied-2`, await screen(page));
    fact('reload-3', await step('reload-3', () => reload(rp)));
    fact('stored-3', stored());
}

// ---------------------------------------------------------------------------
// Row 22: a digital format's computed file size in the ONIX file

async function extent(app, page, fact, step) {
    const {SettingsPages, SettingsForm} = require("../../../pages/ContextIdentityPages.js");
    const {downloadFrom} = require("../../../pages/ImportExportPages.js");
    const {PublicationFormatsPage} = require(`${app.suiteDir}/pages/PublicationFormatPages.js`);
    const {OnixToolPage} = require(`${app.suiteDir}/pages/OnixPages.js`);

    const formats = () => sql(app, `select pf.publication_format_id, p.submission_id, pf.physical_format, pf.file_size, coalesce(pf.remote_url, '') <> '' as remote,
        (select count(*) from submission_files sf where sf.assoc_type = 521 and sf.assoc_id = pf.publication_format_id and sf.file_stage = 10) as files,
        (select count(*) from submission_files sf where sf.assoc_type = 521 and sf.assoc_id = pf.publication_format_id and sf.file_stage = 10 and sf.viewable = 1) as approved
        from publication_formats pf join publications p using (publication_id) where p.submission_id in (${BOOK.id}, ${BOOK14.id}) order by 1`);
    fact('formats-0', formats());

    // The four ONIX details (Settings bullet 1), on "Masthead".
    fact('masthead', await step('masthead', async () => {
        const settings = new SettingsPages(page, app.contextPath);
        await settings.goto('journal');
        const tab = settings.tab('Masthead');
        if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
        const form = new SettingsForm(page, '[name="publisher"]');
        await form.ready();
        await form.form.locator('[name="publisher"]').fill('Tidewater Press');
        await form.form.locator('[name="location"]').fill('Halifax');
        await form.form.locator('select[name="codeType"]').selectOption({label: 'Proprietary (01)'});
        await form.form.locator('[name="codeValue"]').fill('TWP-01');
        await form.save();
        return {stored: sql(app, "select setting_name, setting_value from press_settings where setting_name in ('publisher','location','codeType','codeValue') order by 1")};
    }));

    // Submission 4's "PDF" › "Edit" › "Metadata": what the tab offers about the file size.
    const openFormats = async () => {
        const pf = new PublicationFormatsPage(page, app.contextPath);
        if (app.line === 'stable-3_5_0') {
            await pf.frame.gotoEditorial(BOOK.id, {menuKey: 'publication_publicationFormats'});
            await pf.expectLoaded();
        } else {
            await pf.gotoEditorial(BOOK.id, BOOK.id);
        }
        return pf;
    };
    const metadataTab = async (name, format = 'PDF') => {
        const pf = new PublicationFormatsPage(page, app.contextPath);
        if (app.line === 'stable-3_5_0') {
            await pf.frame.gotoEditorial(BOOK.id, {menuKey: 'publication_publicationFormats'});
            await pf.expectLoaded();
        } else {
            await pf.gotoEditorial(BOOK.id, BOOK.id);
        }
        const win = await pf.openEdit(format);
        const meta = await win.openMetadata();
        await idle(page);
        record(`h13d-extent-metadata-${name}`, await screen(page));
        const out = {
            labels: await meta.labelsTopToBottom().catch((e) => ({error: flat(e.message, 200)})),
            fileSizeBox: await page.locator('input[name="fileSize"]').count(),
            fileSizeValue: await page.locator('input[name="fileSize"]').first().inputValue({timeout: 2000}).catch(() => null),
        };
        await win.cancel().catch(() => page.keyboard.press('Escape'));
        return out;
    };
    fact('metadata-tab-before', await step('metadata-before', () => metadataTab('before')));

    /** Export the books whose titles match on the ONIX tool; each product's format name and Extents. */
    const exportOnix = async (name, titles) => {
        const onix = new OnixToolPage(page, app.contextPath);
        await onix.open();
        await idle(page);
        const tabs = await onix.anyTab().allInnerTexts().catch(() => []);
        if (!tabs.length) return {tabs, page: await screen(page)};
        await onix.list.expectLoaded();
        for (const t of titles) await onix.list.panel.getByRole('checkbox', {name: t}).check();
        const results = await onix.list.pressExport(onix);
        await pause(1000);
        record(`h13d-extent-results-${name}`, await screen(page));
        const out = {tabs, results: flat(await results.innerText().catch(() => ''), 1500)};
        const button = results.getByRole('button', {name: 'Download Exported File', exact: true});
        if (!(await button.count())) return out;
        const file = await downloadFrom(page, () => button.click());
        fs.writeFileSync(outFile(`h13d-onix-${name}.xml`), file.text);
        out.file = file.name;
        out.products = await page.evaluate((xml) => {
            const doc = new DOMParser().parseFromString(xml, 'application/xml');
            const kid = (el, n) => [...el.children].find((k) => k.localName === n);
            return [...doc.getElementsByTagNameNS('*', 'Product')].map((p) => {
                const desc = kid(p, 'DescriptiveDetail');
                const title = [...p.getElementsByTagNameNS('*', 'TitleText')].map((t) => t.textContent.trim())[0];
                const form = desc && kid(desc, 'ProductForm') ? kid(desc, 'ProductForm').textContent : null;
                const extents = desc ? [...desc.children].filter((k) => k.localName === 'Extent').map((e) => [...e.children].map((k) => `${k.localName}=${k.textContent}`).join(' ')) : [];
                const id = [...p.getElementsByTagNameNS('*', 'RecordReference')].map((t) => t.textContent.trim())[0];
                return {record: id, title, form, extents};
            });
        }, file.text);
        return out;
    };
    fact('export-before', await step('export-before', () => exportOnix('before', [BOOK.title, BOOK14.title])));

    // Submission 4's "PDF" is remotely hosted; two new digital formats: "Ebook" gets two 1.9 MB
    // files, approved one at a time, with an export after each; "Empty" stays without files.
    const makeFile = (name) => {
        const file = outFile(name);
        const head = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%');
        const body = Buffer.alloc(BIG_BYTES - head.length - 6, 0x20);
        fs.writeFileSync(file, Buffer.concat([head, body, Buffer.from('\n%%EOF')]));
        return file;
    };
    const EBOOK = `Ebook ${RUN}`;
    const EMPTY = `Empty ${RUN}`;
    fact('add-formats', await step('add-formats', async () => {
        const pf = await openFormats();
        const out = {};
        for (const name of [EBOOK, EMPTY]) {
            const add = await pf.openAdd();
            await add.typeName(name);
            out[name] = {physical: await add.physicalBox().isChecked().catch(() => null), remote: await add.remoteBox().isChecked().catch(() => null)};
            await add.ok();
            await pf.formatRow(name).waitFor({state: 'visible', timeout: 30_000});
        }
        out.rows = await pf.grid().locator('tr.gridRow').evaluateAll((rs) => rs.map((r) => r.innerText.replace(/\s+/g, ' ').trim().slice(0, 160)));
        return out;
    }));
    const upload = async (file) => {
        const fileName = file.split('/').pop();
        const pf = await openFormats();
        await pf.uploadWithChangeFile(EBOOK, file);
        const row = pf.fileRow(EBOOK, fileName);
        const before = (await row.locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        await (await pf.openStatus(row, 'Awaiting Approval', 'Approve Proof')).ok();
        await pause(1000);
        await idle(page);
        const after = (await pf.fileRow(EBOOK, fileName).locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        record(`h13d-extent-formats-after-${fileName.replace(/\.pdf$/, '')}`, await screen(page));
        await shot(page, `h13d-extent-formats-after-${fileName.replace(/\.pdf$/, '')}`);
        return {bytes: fs.statSync(file).size, before, after};
    };
    fact('upload-1', await step('upload-1', () => upload(makeFile('h13d-first.pdf'))));
    fact('formats-1', formats());
    fact('export-one-file', await step('export-one-file', () => exportOnix('one-file', [BOOK.title])));
    fact('upload-2', await step('upload-2', () => upload(makeFile('h13d-second.pdf'))));
    fact('formats-2', formats());
    fact('metadata-tab-ebook', await step('metadata-ebook', () => metadataTab('ebook', EBOOK)));
    fact('export-two-files', await step('export-two-files', () => exportOnix('two-files', [BOOK.title])));
}
