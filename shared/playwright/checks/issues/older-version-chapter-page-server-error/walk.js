// Issue report docs/issues/U69-A19-older-version-chapter-page-server-error.md
// (U69 A19): on a press whose "DOI Versioning" reads "No", an older
// version's chapter page answers a server error. Takes the report's Steps on
// PKP's default test dataset (OMP):
//   1-4. dbarnes opens submission 14's workflow, "Create New Version" ›
//        "Confirm", "Publish" › "Publish"
//   5-7. a visitor opens …/catalog/book/14, presses the older version under
//        "Versions", then "Chapter 1: Mind Control—Internal or External?" in
//        its table of contents
//   8.   the visitor opens the book's page again, presses the chapter in its
//        table of contents and, on the chapter page, the older version under
//        "Versions"
// Then the controls and the neighbour checks a fix must leave as they are:
//   N1 the current version's chapter page; N2 the older version's book page;
//   N3 an older version's chapter that has no page (404);
//   N4 what the failing lookup is for (main only): dbarnes sets a DOI prefix,
//      ticks "Chapters" under "Items with DOIs" and assigns the book's DOIs on
//      the "DOIs" page, so the current version's chapter has a DOI the older
//      one lacks; the older chapter page should show that DOI (the older
//      book page's table of contents is read beside it);
//   N5 the path a fix leaves alone (main only): "DOI Versioning" "Yes", then
//      the older chapter page again.
// Reset the dataset fleet first; the walk changes submission 14 and the
// press's DOI settings. FIX=1 only tags the records of a run with the fix in.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/older-version-chapter-page-server-error/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, note} = require('../../../probe');
const {T, workflowFrame, createNewVersion, publishShownVersion} = require('../older-version-tab-current-title/lib');
const {arrive} = require('./lib');

const SID = 14;
const CHAPTER = /Chapter 1: Mind Control/;
const PREFIX = '10.1234';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`A19 walk: ${app.name} skipped, chapter pages are a press's`);
        return;
    }
    const {expect} = require('@playwright/test');
    const stable35 = app.line === 'stable-3_5_0';
    const fix = process.env.FIX ? 'fix-' : '';
    const name = (s) => `${fix}${s}`;
    const book = (rest) => `/index.php/${app.contextPath}/catalog/book/${rest}`;
    const chapters = () =>
        sql(
            app,
            `select c.publication_id, c.chapter_id, c.source_chapter_id, coalesce(d.doi, ''), p.status
             from submission_chapters c join publications p using (publication_id) left join dois d on d.doi_id = c.doi_id
             where p.submission_id = ${SID} order by 1, 2`
        ).split('\n');
    const versioning = () => sql(app, `select coalesce((select setting_value from press_settings where setting_name = 'doiVersioning'), 'unset')`);
    const facts = {app: app.name, line: app.line || 'main', fix: !!process.env.FIX, submission: SID, doiVersioningBefore: versioning(), chaptersBefore: chapters()};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const v1 = Number(facts.chaptersBefore[0].split('|')[0]);
    const chapterId = Number(facts.chaptersBefore[0].split('|')[2]);
    const second = Number(facts.chaptersBefore[1].split('|')[2]);
    const olderChapter = book(`${SID}/version/${v1}/chapter/${chapterId}`);

    const editor = await launch(app);
    const reader = await launch(app);
    const e = editor.page;
    const r = reader.page;
    // The older version under "Versions": "… (Version of Record 1.0)" on main, "… (1)" on 3.5.
    const olderLink = () => r.locator('.sub_item.versions a[href*="/version/"]').first();
    try {
        // 1-2
        await signIn(e, 'dbarnes');
        const frame = workflowFrame(e, app);
        await frame.gotoEditorial(SID);
        await idle(e);
        record(name('step2-workflow'), await screen(e));

        // 3-4
        fact('3 new version', await createNewVersion(e, app));
        fact('4 publish', await publishShownVersion(e));
        fact('4 chapters', chapters());

        // 5
        facts.s5 = await arrive(r, app, name('step5-book'), () => r.goto(app.url(book(SID))));
        // 6
        await expect(olderLink()).toBeVisible({timeout: T});
        facts.s6 = await arrive(r, app, name('step6-older-version'), () => Promise.all([r.waitForNavigation(), olderLink().click()]));
        // 7
        const toc = r.getByRole('link', {name: CHAPTER}).first();
        fact('7 link', await toc.getAttribute('href').catch(() => null));
        facts.s7 = await arrive(r, app, name('step7-older-chapter-from-contents'), () => Promise.all([r.waitForNavigation(), toc.click()]));
        // 8
        await arrive(r, app, name('step8-book'), () => r.goto(app.url(book(SID))));
        const current = r.getByRole('link', {name: CHAPTER}).first();
        facts.s8a = await arrive(r, app, name('step8-current-chapter'), () => Promise.all([r.waitForNavigation(), current.click()]));
        await expect(olderLink()).toBeVisible({timeout: T});
        facts.s8 = await arrive(r, app, name('step8-older-chapter-from-versions'), () => Promise.all([r.waitForNavigation(), olderLink().click()]));
        // typed
        facts.typed = await arrive(r, app, name('typed-older-chapter'), () => r.goto(app.url(olderChapter)));

        // N1-N3
        facts.n1 = await arrive(r, app, name('n1-current-chapter'), () => r.goto(app.url(book(`${SID}/chapter/${chapterId}`))));
        facts.n2 = await arrive(r, app, name('n2-older-book'), () => r.goto(app.url(book(`${SID}/version/${v1}`))));
        facts.n3 = await arrive(r, app, name('n3-older-chapter-without-page'), () => r.goto(app.url(book(`${SID}/version/${v1}/chapter/${second}`))));

        if (!stable35) {
            const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
            const settings = new DoiSettings(e, app.contextPath);
            const dois = new DoisPage(e, app.contextPath);

            // N4: the current version's chapter gets a DOI the older one lacks.
            await settings.goto('Setup');
            if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
            await settings.kindBox('Chapters').check();
            const saved = await settings.pressSave(settings.setup);
            await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
            fact('n4 setup save', {status: saved.status(), kinds: await settings.kinds(), doiVersioning: versioning()});
            record(name('n4-setup'), await screen(e));
            await dois.goto();
            const assigned = await dois.runBulk('Assign DOIs', [SID]);
            fact('n4 assign', {status: assigned.status()});
            record(name('n4-dois'), await screen(e));
            fact('n4 chapters', chapters());
            facts.n4current = await arrive(r, app, name('n4-current-chapter-with-doi'), () => r.goto(app.url(book(`${SID}/chapter/${chapterId}`))));
            facts.n4olderBook = await arrive(r, app, name('n4-older-book-contents'), () => r.goto(app.url(book(`${SID}/version/${v1}`))));
            facts.n4older = await arrive(r, app, name('n4-older-chapter'), () => r.goto(app.url(olderChapter)));

            // N5: "DOI Versioning" "Yes".
            await settings.goto('Setup');
            await settings.versioningRadio('Yes').check();
            const saved5 = await settings.pressSave(settings.setup);
            await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
            fact('n5 setup save', {status: saved5.status(), doiVersioning: versioning()});
            record(name('n5-setup'), await screen(e));
            facts.n5older = await arrive(r, app, name('n5-older-chapter-versioning-yes'), () => r.goto(app.url(olderChapter)));
            facts.n5current = await arrive(r, app, name('n5-current-chapter-versioning-yes'), () => r.goto(app.url(book(`${SID}/chapter/${chapterId}`))));
        }
        await signOut(e).catch(() => {});
    } finally {
        record(name('facts'), facts);
        await editor.close();
        await reader.close();
    }
});
