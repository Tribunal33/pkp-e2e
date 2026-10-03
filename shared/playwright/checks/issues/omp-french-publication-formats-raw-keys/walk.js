// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U73 A25: in French (Canada) a book's "Publication Formats" list and its format window
// ("Add publication format", a format's "Edit") show codes for OMP texts that have no French
// (Canada) text. Takes that group of the report's Steps on PKP's default test dataset (OMP):
//   41. dbarnes signs in; the initials menu > "Change Language" > "français"
//   42. submission 4 > "Publication" > "Formats de publication": the column headings
//   43. "Ajouter un format de publication": the remote box's label, the ISBN heading and the
//       lines under the two ISBN boxes
//   44. the remote box ticked: the label of the box that appears; "Annuler"
//   45. the row "PDF" > arrow > "Modifier": the same labels in its "Modifier" tab; "Annuler"
//   46. the row's link under "Terminer": the "Format Approval" window's title and text; "Annuler"
//   47. the row's link under "Availability": the "Format Availability" window's title and text; "Annuler"
// Nothing is saved. NB=1 runs the neighbour check alone: the same steps in English, which the
// fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-publication-formats-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {flat} = require('../omp-french-book-page-raw-keys/lib');

const T = 30_000;
const BOOK = {id: 4, publicationId: 4};
const FORMAT = 'PDF';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const L = nb
        ? {formats: 'Publication Formats', edit: 'Edit', cancel: 'Cancel', pub: 'Publication'}
        : {formats: 'Formats de publication', edit: 'Modifier', cancel: 'Annuler', pub: 'Publication'};
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const step = async (n) => {
        await idle(page);
        record(`${lang}-${n}`, await screen(page));
    };
    const grid = page.locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
    // The format window's form ("Add publication format" / "Edit"), found by CSS: the workflow
    // dialog under it is aria-hidden while it is open.
    const formatForm = page.locator('[role="dialog"] form').filter({has: page.locator('select[name="entryKey"]')}).first();
    const readForm = async (form) =>
        form.evaluate((f) => {
            const text = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
            const labelOf = (name) => {
                const input = f.querySelector(`input[name="${name}"]`);
                if (!input) return 'no box';
                const label = (input.id && f.querySelector(`label[for="${input.id}"]`)) || input.closest('label') || input.parentElement.querySelector('label');
                return {label: text(label), shown: !!input.getClientRects().length};
            };
            const isbn = f.querySelector('input[name="isbn13"]');
            const section = isbn ? isbn.closest('.section, fieldset') : null;
            const heading = section ? section.querySelector('legend, .label, label:not([for])') : null;
            return {
                remoteBox: labelOf('remotelyHostedContent'),
                remoteURL: labelOf('remoteURL'),
                isbnHeading: text(heading),
                isbn13: labelOf('isbn13'),
                isbn10: labelOf('isbn10'),
                text: text(f).slice(0, 900),
            };
        });
    const keys = async (scope) => (await rawKeys(page, scope ? {scope} : undefined).catch((e) => [`rawKeys failed: ${e.message}`])) || [];
    const cancel = async () => {
        await formatForm.locator('a, button').filter({hasText: new RegExp(`^\\s*${L.cancel}\\s*$`)}).first().click();
        await formatForm.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        // the 450 ms slot a closed legacy window keeps (patterns.md, pitfall 4)
        await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
    };
    try {
        // 41
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('41 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 42: submission 4 > "Publication" > "Publication Formats"
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: L.pub}});
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${BOOK.id}`));
        await page.getByRole('dialog').first().waitFor({timeout: T});
        await idle(page);
        const entry = await wf.revealPublicationEntry(L.formats).catch(() => null);
        if (entry) {
            await entry.click();
            fact('42 via', 'side menu');
        } else {
            const key = app.line === 'stable-3_5_0' ? 'publication_publicationFormats' : `publication_${BOOK.publicationId}_publicationFormats`;
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${BOOK.id}&workflowMenuKey=${key}`));
            fact('42 via', 'address (no side menu entry found)');
        }
        await grid.locator('thead th').first().waitFor({timeout: T});
        await step(42);
        fact('42 heading', flat(await wf.heading().innerText().catch(() => null)));
        fact('42 grid heading', flat(await grid.locator('.header h4').first().innerText().catch(() => null)));
        fact('42 columns', (await grid.locator('thead th').allInnerTexts()).map((t) => flat(t)));
        fact('42 add link', flat(await grid.locator('.header a').first().innerText().catch(() => null)));
        fact('42 raw keys', await keys());
        // 43: "Add publication format"
        await grid.locator('.header a').first().click();
        await formatForm.locator('select[name="entryKey"]').waitFor({state: 'visible', timeout: T});
        await idle(page);
        await step(43);
        fact('43 window title', flat(await page.locator('[role="dialog"]').filter({has: formatForm}).locator('h1').first().innerText().catch(() => null)));
        fact('43 form', await readForm(formatForm));
        fact('43 raw keys (form)', await keys('[role="dialog"] form#addPublicationFormatForm'));
        // 44: tick the remote box
        await formatForm.locator('input[name="remotelyHostedContent"]').check();
        await formatForm.locator('input[name="remoteURL"]').waitFor({state: 'visible', timeout: T}).catch(() => {});
        await step(44);
        fact('44 form', await readForm(formatForm));
        await cancel();
        // 45: the row "PDF" > arrow > "Edit"
        const row = grid.locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({has: page.locator('span.label', {hasText: new RegExp(`^\\s*${FORMAT}`)})}).first();
        const id = await row.getAttribute('id', {timeout: T});
        const controls = page.locator(`[id="${id}-control-row"]`);
        if (!(await controls.isVisible())) await row.locator('a.show_extras').click();
        await controls.waitFor({state: 'visible', timeout: T});
        fact('45 row entries', (await controls.locator('a:visible').allInnerTexts()).map((t) => flat(t)));
        await controls.locator('a:visible').filter({hasText: new RegExp(`^\\s*${L.edit}\\s*$`)}).first().click();
        await formatForm.locator('select[name="entryKey"]').waitFor({state: 'visible', timeout: T});
        await idle(page);
        await step(45);
        const win = page.locator('[role="dialog"]').filter({has: formatForm}).first();
        fact('45 window title', flat(await win.locator('h1').first().innerText().catch(() => null)));
        fact('45 tabs', (await win.locator('[role="tab"]').allInnerTexts()).map((t) => flat(t)));
        fact('45 form', await readForm(formatForm));
        fact('45 raw keys (form)', await keys('[role="dialog"] form#addPublicationFormatForm'));
        await cancel();
        // 46, 47: the row's "Complete" link ("Format Approval") and "Availability" link ("Format Availability")
        fact('46 row cells', (await row.locator(':scope > td').allInnerTexts()).map((t) => flat(t)));
        for (const [n, col] of [[46, 1], [47, 2]]) {
            const before = await page.locator('[role="dialog"]').count();
            await row.locator(':scope > td').nth(col).locator('a').first().click();
            const win = page.locator('[role="dialog"]').nth(before);
            await win.waitFor({state: 'visible', timeout: T});
            await win.locator('button, a').filter({hasText: /\S/}).last().waitFor({timeout: T});
            await idle(page);
            await step(n);
            fact(`${n} window`, await win.evaluate((w) => {
                const text = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
                return {title: text(w.querySelector('h1, h2')), text: text(w).slice(0, 600)};
            }));
            fact(`${n} codes`, (facts[`${n} window`].text || '').match(/##[^#\s]+##/g) || []);
            const cancelBtn = win.locator('button, a').filter({hasText: new RegExp(`^\\s*${L.cancel}\\s*$`)}).first();
            if (await cancelBtn.count()) await cancelBtn.click();
            else await page.keyboard.press('Escape');
            await win.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
        }
    } finally {
        await close();
    }
    record(`${lang}-facts`, facts);
});
