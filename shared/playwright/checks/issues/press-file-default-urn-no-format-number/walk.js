// Issue report docs/issues/U44-OMP6-press-file-default-urn-no-format-number.md (U44 OMP6): a press
// file's URN, under "Use default patterns.", previews "{press initials}.{book}.{file}" with no
// format number, although the settings window announces "%p.%m.%f.%s for files"; an own file
// pattern leaves "%f" in, and so does a file DOI's custom pattern. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet), as `dbarnes`, on OMP (OJS has no file URNs, OPS no URN
// plugin), book 5 "Bomb Canada…", format "PDF" (2), file "epilogue.pdf" (41). The kit builds nothing.
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Publication Formats" +
//        "Files", prefix urn:nbn:de:0000-, default patterns (the window's text read), no check
//        number, namespace urn:nbn:de, resolver, "Save"
//   4-5  book 5 › Publication › "Publication Formats" › "PDF" › "Edit" › "Identifiers": the URN area
//   6    "epilogue.pdf" › "Edit" › "Identifiers": the URN area
//   7-8  URN "Settings": own patterns, formats %p.%m.%f, files %p.%m.%f.%s, "Save"; step 6 again
//   9-10 Settings › Distribution › DOIs › Setup: prefix 10.1234, "Files", "Custom pattern" (monographs
//        %p.%m, files %p.%m.%f.%s), "Save"; DOIs page: book 5 › "Assign DOIs"; the file row's DOI
// WALK=doi (3.5): sign in and steps 9-10 only (finishing a walk whose DOI steps a script fault stopped).
// WALK=neighbour runs alone (fix in and out): steps 1-3 with "Chapters" ticked too, the format's tab
// (step 5) and the chapter "Prologue"'s tab: both previews must stay as they are.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44q --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-u44q PROBE_AGENT=u44q node bin/probe.js omp shared/playwright/checks/issues/press-file-default-urn-no-format-number/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44q-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44q-3_5 PROBE_AGENT=u44q node bin/probe.js omp shared/playwright/checks/issues/press-file-default-urn-no-format-number/walk.js
const {forEachApp, launch, signIn, screen, record, sql, idle} = require('../../../probe');
const {flat, setUpUrn, openItemTab, readUrnArea, closeWindow} = require('../urn-check-digit-from-suffix-only/lib');
const {openFormats, openFileTab} = require('../issue-and-press-file-publisher-id-never-kept/lib');

const MODE = process.env.WALK || 'walk';
const BOOK = 5;
const FORMAT = 'PDF';
const FILE = 'epilogue.pdf';
const CHAPTER = 'Prologue';

forEachApp(async (app) => {
    if (app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: no file URNs (OJS) or no URN plugin (OPS)`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {LegacyIdentifiersWindow} = require('../../../pages/IdentifiersPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            fact(k, v);
            return v;
        } catch (e) {
            fact(k, {threw: flat(e.message, 600)});
            await snap(`${k}-error`).catch(() => {});
            return null;
        }
    };
    const snap = async (label) => record(name(label.replace(/\s+/g, '-')), await screen(page));
    // Reads for the facts, not steps: the version the workflow opens on, and the ids.
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${BOOK}`).trim());
    fact(
        'ids',
        sql(
            app,
            `select 'format', pf.publication_format_id, 'file', sf.submission_file_id from publication_formats pf join submission_files sf on sf.assoc_id = pf.publication_format_id and sf.assoc_type = 521 where pf.publication_id = ${pubId}`,
        ).trim(),
    );

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 200)));
    const frame = new WorkflowPage(page, app.contextPath, {
        labels: {publicationGroup: 'Publication'},
    });

    /** The format's own "Identifiers" tab: its URN area. */
    const formatTab = async (label) => {
        const formats = await openFormats(page, app, BOOK, pubId);
        await formats.pressRowEntry(formats.formatRow(FORMAT), 'Edit');
        const dialog = page
            .getByRole('dialog')
            .filter({
                has: page.getByRole('tab', {name: 'Identifiers', exact: true}),
            })
            .last();
        const win = new LegacyIdentifiersWindow(page, dialog);
        await win.openIdentifiersTab();
        await idle(page);
        const area = await readUrnArea(win);
        await snap(label);
        await closeWindow(page, win);
        return area;
    };
    /** The file's "Identifiers" tab ("Edit a file"): the file row's first cell and the URN area. */
    const fileTab = async (label) => {
        const formats = await openFormats(page, app, BOOK, pubId);
        const fileCell = await formats.fileNameCell(FORMAT, FILE).catch(() => null);
        const {win, title} = await openFileTab(page, formats, FORMAT, FILE);
        const area = await readUrnArea(win);
        await snap(label);
        await closeWindow(page, win);
        return {fileCell, windowTitle: title, area};
    };

    /** Steps 9-10: the DOI setup with a custom file pattern, and "Assign DOIs" on book 5. */
    const doiSteps = async () => {
        await step('9 doi setup', async () => {
            const {DoiSettings} = require('../../../pages/DoisPages.js');
            const {expect} = require('@playwright/test');
            const settings = new DoiSettings(page, app.contextPath);
            await settings.goto('Setup');
            await settings.prefixBox().fill('10.1234');
            await settings.kindBox('Files').check();
            await settings.formatRadio('Custom pattern').check();
            // the boxes by their field names ("Submissions" and "Files" on screen; 3.5's group has no usable name)
            await settings.setup.locator('input[name="doiPublicationSuffixPattern"]').fill('%p.%m');
            await settings.setup.locator('input[name="doiSubmissionFileSuffixPattern"]').fill('%p.%m.%f.%s');
            const labels = await settings.setup
                .locator('input[name$="SuffixPattern"]')
                .evaluateAll((els) => els.map((el) => (el.labels && el.labels[0] ? el.labels[0].textContent.trim() : el.name)));
            const r = await settings.pressSave(settings.setup);
            await expect(settings.savedStatus(settings.setup)).toBeVisible({
                timeout: 20_000,
            });
            await snap('9-doi-setup');
            return {
                status: r.status(),
                kinds: await settings.kinds(),
                patternLabels: labels,
            };
        });
        await step('10 doi assigned', async () => {
            const {DoisPage} = require('../../../pages/DoisPages.js');
            const dois = new DoisPage(page, app.contextPath);
            await dois.goto();
            await dois.expectListSettled();
            const response = await dois.runBulk('Assign DOIs', [BOOK]);
            await dois.goto();
            await dois.expectListSettled();
            const row = dois.row(BOOK);
            await dois.expand(row, BOOK);
            const rows = [];
            for (const type of await dois.doiTypes(row)) rows.push({type, doi: await dois.doiBox(row, type).inputValue()});
            await snap('10-dois');
            return {status: response.status(), rows};
        });
    };

    try {
        // 1-3
        await signIn(page, 'dbarnes');
        const kinds = MODE === 'neighbour' ? ['Publication Formats', 'Files', 'Chapters'] : ['Publication Formats', 'Files'];
        if (MODE === 'doi') {
            // 3.5 only: the walk's steps 9-10 again, after a script fix (the boxes' labels); 1-8 are not repeated
            await doiSteps();
            return;
        }
        await step('3 setup', async () => {
            const done = await setUpUrn(page, app, {
                kinds,
                suffix: 'default',
                checkNo: false,
            });
            return done;
        });
        // the window's default-pattern text, read on reopening (the same text as before "Save")
        await step('3 default text', async () => {
            const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
            const plugins = new UrnPluginSettings(page, app.contextPath);
            await plugins.openPlugins();
            await plugins.openSettings();
            const radio = plugins.suffixRadio('default');
            const section = radio.locator('xpath=ancestor::*[contains(@class,"section")][1]');
            const text = flat(await section.innerText(), 400);
            const kindsTicked = {};
            for (const k of ['Monographs', 'Chapters', 'Publication Formats', 'Files'])
                kindsTicked[k] = await plugins
                    .kindBox(k)
                    .isChecked()
                    .catch(() => null);
            await snap('3-settings');
            await plugins
                .window()
                .getByRole('link', {name: 'Cancel', exact: true})
                .or(plugins.window().getByRole('button', {name: 'Cancel', exact: true}))
                .first()
                .click()
                .catch(() => {});
            await page.goto(app.url(`/index.php/${app.contextPath}/`)).catch(() => {});
            return {
                defaultChosen: await radio.isChecked().catch(() => null),
                text,
                kindsTicked,
            };
        });

        // 4-5
        await step('5 format tab', () => formatTab('5 format tab'));

        if (MODE === 'neighbour') {
            await step('n chapter tab', async () => {
                const win = await openItemTab(page, app, frame, BOOK, pubId, CHAPTER);
                const area = await readUrnArea(win);
                await snap('n chapter tab');
                await closeWindow(page, win);
                return area;
            });
            return;
        }

        // 6
        await step('6 file tab', () => fileTab('6 file tab'));

        // 7-8
        await step('7 own patterns', async () => {
            const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
            const plugins = new UrnPluginSettings(page, app.contextPath);
            await plugins.openPlugins();
            await plugins.openSettings();
            await plugins.suffixRadio('pattern').check();
            await plugins.form().locator('input[name="urnRepresentationSuffixPattern"]').fill('%p.%m.%f');
            await plugins.form().locator('input[name="urnSubmissionFileSuffixPattern"]').fill('%p.%m.%f.%s');
            const help = flat(
                await plugins
                    .suffixRadio('pattern')
                    .locator('xpath=ancestor::*[contains(@class,"section")][1]')
                    .innerText()
                    .catch(() => ''),
                500,
            );
            await plugins.saveAccepted();
            return {help};
        });
        await step('8 file tab own pattern', () => fileTab('8 file tab own pattern'));

        await doiSteps();

        const file = facts['6 file tab'] && facts['6 file tab'].area;
        const format = facts['5 format tab'];
        fact('verdict', {
            format: format && format.urn,
            fileDefault: file && file.urn,
            fileOwnPattern: facts['8 file tab own pattern'] && facts['8 file tab own pattern'].area.urn,
            fileDoi:
                facts['10 doi assigned'] &&
                facts['10 doi assigned'].rows &&
                (facts['10 doi assigned'].rows.find((r) => /epilogue/.test(r.type)) || {}).doi,
        });
    } finally {
        fact('page errors', pageErrors);
        record(name('facts'), facts);
        await close();
    }
});
