// U73 A1 and A2 (docs/issues/U73-A1-A2-format-controls-offered-then-refused.md): on a press's
// "Publication Formats" page an assigned Layout Editor is offered "Not Available", "Set Terms",
// "Select Files" and the "Metadata" tab's four lists, and an assigned Series editor those lists,
// and each one is refused. OMP only, on PKP's default test dataset (main or stable-3_5_0),
// freshly loaded.
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-controls-offered-then-refused/walk.js
//   WALK_MODE=neighbour …   the neighbour check alone (a fix trial): the Author `bbeaty` still gets
//                           only the "Name" column on book 4, and the Press editor `dbarnes` still
//                           makes book 4's remote "PDF" available and loads its four lists; nothing
//                           of the Steps is walked.
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, loc, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const BOOK4 = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const BOOK1 = {id: 1, title: 'The ABCs of Human Survival: A Paradigm for Global Citizenship'};
const NAME = 'EPUB u73a';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const guard = async (label, fn) => { try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 1200)); return null; } };
    const pubId = (sub) => sql(app, `select current_publication_id from submissions where submission_id=${sub}`).trim();
    const stored = (sub) => sql(app, `select pf.publication_format_id, pf.is_available, pf.is_approved, (select count(*) from submission_files sf where sf.assoc_type=521 and sf.assoc_id=pf.publication_format_id), (select string_agg(coalesce(sf.sales_type,'null')||':'||coalesce(sf.direct_sales_price,'null'), ',') from submission_files sf where sf.assoc_type=521 and sf.assoc_id=pf.publication_format_id), (select count(*) from identification_codes ic where ic.publication_format_id=pf.publication_format_id) from publication_formats pf where pf.publication_id=${pubId(sub)} order by 1`);
    const pdf = path.join(app.suiteDir, 'fixtures', 'files', 'article.pdf');

    const {page, close} = await launch(app);
    const w = L.watch(page);
    const step = async (label, fn) => { w.mark(label); const out = await guard(label, fn); await L.settle(page, 1500); fact(`${label}.seen`, w.of(label)); return out; };
    try {
        if (MODE === 'steps') {
            fact('book4.before', stored(4));
            fact('book1.before', stored(1));

            // The Layout Editor, book 4 (steps 1–9)
            await signIn(page, 'gcox');
            let f;
            await step('gcox.open', async () => {
                fact('gcox.open.via', await L.openBook(page, app, BOOK4.id, BOOK4.title));
                f = (await L.openFormatsPage(page, app, BOOK4.id, pubId(4))).formats;
                record('gcox-page', await screen(page));
            });
            await step('gcox.add', async () => fact('gcox.add.row', await L.addFormat(page, f, NAME)));
            await step('gcox.upload', async () => {
                await f.uploadWithChangeFile(NAME, pdf);
                fact('gcox.upload.files', await L.fileRowsState(f, NAME));
                fact('gcox.upload.row', await L.rowState(f, NAME));
                await shot(page, 'gcox-formats');
            });
            await step('gcox.available', async () => {
                await loc(page, 'format row: Not Available', f.rowLink(f.formatRow(NAME), 'Not Available'));
                const win = await f.openStatus(f.formatRow(NAME), 'Not Available', 'Format Availability');
                await win.okButton().click();
                await L.settle(page, 3000);
                fact('gcox.available.windowAfterOk', await L.windowText(page, 'Format Availability'));
                fact('gcox.available.buttonsAfterOk', await L.windowButtons(page, 'Format Availability'));
                await shot(page, 'gcox-availability-ok');
                fact('gcox.available.closedBy', await L.closeWindow(page, 'Format Availability'));
                fact('gcox.available.urlAfterClose', page.url().replace(/^https?:\/\/[^/]+/, ''));
                try {
                    await f.reload();
                } catch (e) {
                    // The workflow closed with the window (Escape): open the book again.
                    fact('gcox.available.reopened', true);
                    await L.openBook(page, app, BOOK4.id, BOOK4.title);
                    f = (await L.openFormatsPage(page, app, BOOK4.id, pubId(4))).formats;
                }
                fact('gcox.available.rowAfterReload', await L.rowState(f, NAME));
            });
            await step('gcox.terms', async () => {
                const link = f.fileRows(NAME).first().locator('a').filter({hasText: /^\s*(Set Terms|Open Access|Direct Sales|Not Available)\s*$/});
                await loc(page, 'file row: terms link', link);
                await link.click();
                await page.locator('[role="dialog"]').filter({has: page.locator('h1', {hasText: 'Set Terms for Downloading'})}).first().waitFor({timeout: 30_000});
                await L.settle(page, 3000);
                fact('gcox.terms.window', await L.windowText(page, 'Set Terms for Downloading'));
                fact('gcox.terms.form', await page.locator('form#approvedProofForm').count());
                await shot(page, 'gcox-terms');
                await L.closeWindow(page, 'Set Terms for Downloading');
            });
            await step('gcox.select', async () => {
                await loc(page, 'format row: Select Files', f.rowLink(f.formatRow(NAME), 'Select Files'));
                await f.rowLink(f.formatRow(NAME), 'Select Files').click();
                await page.locator('form#manageProofFilesForm').waitFor({timeout: 30_000});
                await L.settle(page, 5000);
                fact('gcox.select.window', await L.windowText(page, 'Select Files'));
                fact('gcox.select.fileRows', await page.locator('form#manageProofFilesForm input[name="selectedFiles[]"]').count());
                await shot(page, 'gcox-select-files');
                await L.closeWindow(page, 'Select Files');
            });
            await step('gcox.metadata', async () => {
                fact('gcox.metadata.lists', await L.openMetadata(page, f, NAME));
                await shot(page, 'gcox-metadata');
                await L.closeWindow(page, 'Edit');
            });
            fact('book4.afterGcox', stored(4));

            // The Series editor, book 1 (steps 10–13)
            await signIn(page, 'dbuskins');
            let g;
            await step('dbuskins.open', async () => {
                fact('dbuskins.open.via', await L.openBook(page, app, BOOK1.id, BOOK1.title));
                g = (await L.openFormatsPage(page, app, BOOK1.id, pubId(1))).formats;
            });
            await step('dbuskins.add', async () => fact('dbuskins.add.row', await L.addFormat(page, g, NAME)));
            await step('dbuskins.metadata', async () => {
                fact('dbuskins.metadata.lists', await L.openMetadata(page, g, NAME));
                await shot(page, 'dbuskins-metadata');
                await L.closeWindow(page, 'Edit');
            });
            await step('dbuskins.available', async () => {
                const win = await g.openStatus(g.formatRow(NAME), 'Not Available', 'Format Availability');
                await win.okButton().click();
                await L.settle(page, 3000);
                fact('dbuskins.available.windowAfterOk', await L.windowText(page, 'Format Availability'));
                fact('dbuskins.available.buttonsAfterOk', await L.windowButtons(page, 'Format Availability'));
                await L.closeWindow(page, 'Format Availability');
                await g.reload();
                fact('dbuskins.available.rowAfterReload', await L.rowState(g, NAME));
            });
            fact('book1.after', stored(1));

            // Control: the Press editor, book 4 (step 14)
            await signIn(page, 'dbarnes');
            let h;
            await step('dbarnes.open', async () => {
                await L.openBook(page, app, BOOK4.id, BOOK4.title);
                h = (await L.openFormatsPage(page, app, BOOK4.id, pubId(4))).formats;
            });
            await step('dbarnes.metadata', async () => {
                fact('dbarnes.metadata.lists', await L.openMetadata(page, h, NAME));
                await L.closeWindow(page, 'Edit');
            });
        } else {
            // Neighbour: what the fix must leave alone.
            fact('book4.before', stored(4));
            await signIn(page, 'bbeaty');
            await step('nb.author', async () => {
                const {PublicationFormatsPage} = L.pages(app);
                const a = new PublicationFormatsPage(page, app.contextPath);
                if (app.line === 'stable-3_5_0') {
                    await a.frame.gotoAuthor(BOOK4.id, {menuKey: 'publication_publicationFormats'});
                    await a.expectLoaded();
                } else {
                    await a.gotoAuthor(BOOK4.id, pubId(4));
                }
                await L.settle(page, 2000);
                fact('nb.author.columns', (await a.columnHeads().allInnerTexts()).map(L.flat).filter(Boolean));
                fact('nb.author.statusLinks', (await a.statusLinks().allInnerTexts()).map(L.flat));
                fact('nb.author.add', await a.addLink().count());
            });
            await signIn(page, 'dbarnes');
            let h;
            await step('nb.dbarnes.open', async () => {
                await L.openBook(page, app, BOOK4.id, BOOK4.title);
                h = (await L.openFormatsPage(page, app, BOOK4.id, pubId(4))).formats;
            });
            await step('nb.dbarnes.metadata', async () => {
                fact('nb.dbarnes.metadata.lists', await L.openMetadata(page, h, 'PDF'));
                await L.closeWindow(page, 'Edit');
            });
            await step('nb.dbarnes.available', async () => {
                const win = await h.openStatus(h.formatRow('PDF'), 'Not Available', 'Format Availability');
                await win.okButton().click();
                await L.settle(page, 3000);
                fact('nb.dbarnes.available.windowAfterOk', await L.windowText(page, 'Format Availability'));
                await L.closeWindow(page, 'Format Availability');
                await h.reload();
                fact('nb.dbarnes.available.rowAfterReload', await L.rowState(h, 'PDF'));
            });
            fact('book4.after', stored(4));
        }
    } finally {
        record('walk', {facts, dialogs: w.log.dialogs, calls: w.log.calls});
        await close();
    }
});
