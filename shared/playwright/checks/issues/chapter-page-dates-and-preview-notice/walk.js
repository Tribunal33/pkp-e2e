// Issue reports (U69 A13, A17, A20), three faults of a book's chapter page
// that one walk sets up on PKP's default test dataset (OMP), submission 14
// and its "Chapter 1: Mind Control—Internal or External?":
//   docs/issues/U69-A17-unpublished-book-chapter-page-no-preview-notice.md
//   docs/issues/U69-A13-chapter-page-forthcoming-under-other-date-format.md
//   docs/issues/U69-A20-later-version-chapter-repeats-date.md
// In one pass, as dbarnes (Press editor) and a signed-out visitor:
//   A17  "Unpublish" › "Unpublish"; "Preview" (the book's page under the
//        preview notice); the chapter in its table of contents.
//   A13  "Catalog Entry" "Date Published" 2024-12-31, "Publish"; the visitor's
//        book and chapter page with "Date (Short)" on its first choice (the
//        control), then on the second, third and fourth. The other way:
//        "Unpublish", "Date Published" next 1 January, "Schedule For
//        Publication", "Preview", the chapter.
//   A20  "Unschedule", the date and "Date (Short)" put back; "Marketing" ›
//        "Publication Dates" "Each chapter may have its own publication
//        date."; the chapter's "Date Published" 2024-06-01; "Publish" (the
//        visitor's chapter page, one version: the control); "Create New
//        Version" › "Confirm", "Publish"; the visitor's book and chapter page.
// Then the neighbour checks the fixes must leave as they are or put right:
//   N1 the older version's chapter page (its outdated notice and date line);
//      on main it fails while "DOI Versioning" reads "No" (U69 A19), so
//      dbarnes first saves "Yes" (main only; 3.5 has no such setting and no
//      such failure);
//   N2 a third, unpublished version: "Preview", then its chapter;
//   N3 "Publication Dates" back on "All chapters will use the publication
//      date of the monograph.": the current chapter page's date line;
//   N4 (main) version 1.0 unpublished while 1.1 stays published: the
//      current chapter page's date line;
//   N5 (main) submission 5 dated today, a second version published the same
//      day: its book page's date line.
// Reset the dataset fleet first (PHASES=a20,n,n3 continues on the state the
// earlier phases left). FIX=1 only tags the records of a run with
// the fixes in.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-page-dates-and-preview-notice/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, note} = require('../../../probe');
const {createNewVersion} = require('../older-version-tab-current-title/lib');
const {T, sleep, flat, controls, arrive, contentsLink, openWorkflow, pressAndConfirm, publishOrSchedule, setBookDate} = require('./lib');

const SID = 14;
const CHAPTER = /Chapter 1: Mind Control/;
const BOOK_DATE = '2024-12-31';
const CHAPTER_DATE = '2024-06-01';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`chapter page walk: ${app.name} skipped, chapter pages are a press's`);
        return;
    }
    const {expect} = require('@playwright/test');
    const {ChaptersPage, ChapterList} = require('../../../../../apps/omp/playwright/pages/ChapterPages.js');
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const stable35 = app.line === 'stable-3_5_0';
    const fix = process.env.FIX ? 'fix-' : '';
    // PHASES=a20,n continues a walk on the state the earlier phases left (default: all four, on a fresh reset).
    const phases = (process.env.PHASES || 'a17,a13,a20,n,n3,n4,n5').split(',');
    const on = (p) => phases.includes(p);
    const name = (s) => `${fix}${s}`;
    const book = (rest) => `/index.php/${app.contextPath}/catalog/book/${rest}`;
    const state = () =>
        sql(
            app,
            `select p.publication_id, p.status, coalesce(p.date_published::text, ''), c.chapter_id, coalesce(c.source_chapter_id::text, ''),
                    coalesce((select setting_value from submission_chapter_settings s where s.chapter_id = c.chapter_id and s.setting_name = 'datePublished'), '')
             from publications p join submission_chapters c using (publication_id)
             where p.submission_id = ${SID} and exists (select 1 from submission_chapter_settings s where s.chapter_id = c.chapter_id and s.setting_name = 'isPageEnabled' and s.setting_value = '1')
             order by 1, 4`
        ).split('\n');
    const shortFormat = () => sql(app, `select coalesce((select string_agg(locale || '=' || setting_value, ' ') from press_settings where setting_name = 'dateFormatShort'), 'unset')`);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const facts = {app: app.name, line: app.line || 'main', fix: !!process.env.FIX, today, stateBefore: state(), shortFormatBefore: shortFormat()};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            if (v !== undefined) fact(k, v);
            return v;
        } catch (err) {
            fact(`${k} ERROR`, flat(err.message, 400));
            return null;
        }
    };
    const v1 = Number(facts.stateBefore[0].split('|')[0]);
    const chapterId = Number(facts.stateBefore[0].split('|')[3]);
    const chapterTitle = sql(app, `select setting_value from submission_chapter_settings where chapter_id = ${chapterId} and setting_name = 'title' and locale = 'en'`);
    // A future date whose day-first text sorts before today's on every day but 1 January.
    const future = `${new Date().getFullYear() + 1}-01-01`;

    const editor = await launch(app);
    const reader = await launch(app);
    const e = editor.page;
    const r = reader.page;
    const visitBook = (label, sid = SID) => arrive(r, app, name(label), () => r.goto(app.url(book(sid))));
    const visitChapter = (label) => arrive(r, app, name(label), () => Promise.all([r.waitForNavigation(), contentsLink(r, CHAPTER).click()]));
    // "Publication" › a page of a version: by the menu entry's address on main, by the menu on 3.5 (one version's pages listed).
    const openPage = async (publicationId, key, label, sid = SID) => {
        if (stable35) {
            const frame = await openWorkflow(e, app, sid, null, false);
            const entry = await frame.revealPublicationEntry(label);
            await entry.click();
        } else {
            await openWorkflow(e, app, sid, `publication_${publicationId}_${key}`);
        }
        await idle(e);
        await sleep(800);
    };
    // The workflow on a version's "Title & Abstract": the publishing controls ("Preview", "Publish", "Unpublish") sit on a version's pages.
    const openVersion = async (publicationId = v1, sid = SID) => {
        if (stable35) {
            const frame = await openWorkflow(e, app, sid, null, false);
            const entry = await frame.revealPublicationEntry('Title & Abstract');
            await entry.click();
            await controls(e).waitFor({timeout: T});
        } else {
            await openWorkflow(e, app, sid, `publication_${publicationId}_titleAbstract`);
        }
        await idle(e);
        await sleep(800);
    };
    const preview = async (label) => {
        const button = controls(e).getByRole('button', {name: 'Preview', exact: true}).or(controls(e).getByRole('link', {name: 'Preview', exact: true})).first();
        await expect(button).toBeVisible({timeout: T});
        return arrive(e, app, name(label), () => Promise.all([e.waitForURL(/\/catalog\/book\//, {timeout: T}), button.click()]));
    };
    const previewChapter = (label) => arrive(e, app, name(label), () => Promise.all([e.waitForNavigation(), contentsLink(e, CHAPTER).click()]));
    const setShortFormat = async (index) => {
        const website = new WebsiteSettings(e, app.contextPath);
        await website.goto();
        const form = await website.open('dateTime');
        // The English "Date (Short)" choices, by the radios' name (3.5 nests the groups, so a group locator takes them all).
        const radios = e.locator('input[type="radio"][name="dateFormatShort-en"]');
        const before = await radios.evaluateAll((list) => list.map((radio) => ({label: (radio.closest('label')?.textContent || '').replace(/\s+/g, ' ').trim(), checked: radio.checked})));
        await radios.nth(index).check();
        const saved = await form.pressSave();
        await expect(form.savedStatus).toBeVisible({timeout: T});
        record(name(`date-short-choice-${index + 1}`), await screen(e));
        return {choices: before.map((c) => `${c.label}${c.checked ? ' (chosen)' : ''}`), picked: before[index].label, save: saved.status(), stored: shortFormat()};
    };

    try {
        // ---- A17
        await signIn(e, 'dbarnes');
        if (on('a17')) {
        await openVersion();
        record(name('a17-step2-workflow'), await screen(e));
        await step('a17 3 unpublish', () => pressAndConfirm(e, 'Unpublish', /\/unpublish$/));
        fact('a17 3 state', state());
        facts.a17book = await step('a17 4 preview', () => preview('a17-step4-preview-book'));
        facts.a17chapter = await step('a17 5 chapter', () => previewChapter('a17-step5-preview-chapter'));
        facts.a17visitor = await arrive(r, app, name('a17-visitor-chapter-typed'), () => r.goto(app.url(book(`${SID}/chapter/${chapterId}`))));

        }
        // ---- A13
        if (on('a13')) {
        if (!on('a17')) {
            await step('a13 1 unpublish', async () => {
                await openVersion();
                return pressAndConfirm(e, 'Unpublish', /\/unpublish$/);
            });
        }
        await step('a13 2 date', async () => {
            await openPage(v1, 'catalogEntry', 'Catalog Entry');
            return setBookDate(e, BOOK_DATE);
        });
        record(name('a13-step2-catalog-entry'), await screen(e));
        await step('a13 3 publish', () => publishOrSchedule(e));
        fact('a13 3 state', state());
        facts.a13controlBook = await visitBook('a13-control-book-first-choice');
        facts.a13controlChapter = await visitChapter('a13-control-chapter-first-choice');
        for (const index of [1, 2, 3]) {
            await step(`a13 4 date short choice ${index + 1}`, () => setShortFormat(index));
            facts[`a13book${index + 1}`] = await visitBook(`a13-step5-book-choice-${index + 1}`);
            facts[`a13chapter${index + 1}`] = await visitChapter(`a13-step6-chapter-choice-${index + 1}`);
        }
        await step('a13 7 date short choice 2 again', () => setShortFormat(1));
        await step('a13 7 unpublish', async () => {
            await openVersion();
            return pressAndConfirm(e, 'Unpublish', /\/unpublish$/);
        });
        await step('a13 7 future date', async () => {
            await openPage(v1, 'catalogEntry', 'Catalog Entry');
            return setBookDate(e, future);
        });
        await step('a13 7 schedule', () => publishOrSchedule(e));
        record(name('a13-step9-scheduled-workflow'), await screen(e));
        fact('a13 9 workflow', {controls: flat(await controls(e).innerText().catch(() => null), 200), status: flat(await e.getByText(/Status:\s*\w+/).first().innerText().catch(() => null), 80)});
        fact('a13 7 state', state());
        facts.a13scheduledBook = await step('a13 8 preview', () => preview('a13-step8-scheduled-book'));
        facts.a13scheduledChapter = await step('a13 8 chapter', () => previewChapter('a13-step8-scheduled-chapter'));

        await step('a13 unschedule', async () => {
            await openVersion();
            return pressAndConfirm(e, 'Unschedule', /\/unpublish$/);
        });
        await step('a13 date back', async () => {
            await openPage(v1, 'catalogEntry', 'Catalog Entry');
            return setBookDate(e, BOOK_DATE);
        });
        await step('a13 date short first choice', () => setShortFormat(0));
        }
        // ---- A20 (the book is unpublished here; alone, the phase unpublishes it first)
        if (on('a20')) {
        if (!on('a13') && Number(state()[0].split('|')[1]) === 3) {
            await step('a20 1 unpublish', async () => {
                await openVersion();
                return pressAndConfirm(e, 'Unpublish', /\/unpublish$/);
            });
        }
        const chaptersPage = new ChaptersPage(e, app.contextPath);
        await step('a20 2 publication dates', async () => {
            await openVersion();
            await chaptersPage.openPublicationDates();
            await chaptersPage.savePublicationDates('Each chapter may have its own publication date.');
            await idle(e);
            record(name('a20-step2-publication-dates'), await screen(e));
            return sql(app, `select coalesce((select setting_value from submission_settings where submission_id = ${SID} and setting_name = 'enableChapterPublicationDates'), 'unset')`);
        });
        await step('a20 3 chapter date', async () => {
            await openPage(v1, 'chapters', 'Chapters');
            const list = new ChapterList(e);
            await list.expectLoaded();
            const win = await list.openEdit(chapterTitle);
            const shown = await win.datePublishedBox().inputValue();
            await win.typeDatePublished(CHAPTER_DATE);
            record(name('a20-step3-chapter-window'), await screen(e));
            await win.save();
            return {shownBefore: shown, typed: CHAPTER_DATE, state: state()};
        });
        await step('a20 4 publish', async () => {
            await openVersion();
            return publishOrSchedule(e);
        });
        facts.a20controlBook = await visitBook('a20-control-book-one-version');
        facts.a20controlChapter = await visitChapter('a20-control-chapter-one-version');
        await step('a20 5 new version', async () => {
            await openVersion();
            return createNewVersion(e, app);
        });
        await step('a20 5 publish', () => publishOrSchedule(e));
        fact('a20 5 state', state());
        facts.a20book = await visitBook('a20-step6-book');
        facts.a20chapter = await visitChapter('a20-step6-chapter');

        }
        // ---- N1: the older version's chapter page
        if (on('n')) {
        if (!stable35) {
            await step('n1 doi versioning yes', async () => {
                const {DoiSettings} = require('../../../pages/DoisPages.js');
                const settings = new DoiSettings(e, app.contextPath);
                await settings.goto('Setup');
                if (!(await settings.enableBox().isChecked())) await settings.enableBox().check();
                if (!(await settings.prefixBox().inputValue())) await settings.prefixBox().fill('10.1234');
                await settings.versioningRadio('Yes').check();
                const saved = await settings.pressSave(settings.setup);
                await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
                return {save: saved.status(), answer: saved.ok() ? undefined : flat(await saved.text().catch(() => ''), 300), doiVersioning: sql(app, `select coalesce((select setting_value from press_settings where setting_name = 'doiVersioning'), 'unset')`)};
            });
        }
        facts.n1older = await arrive(r, app, name('n1-older-version-chapter'), () => r.goto(app.url(book(`${SID}/version/${v1}/chapter/${chapterId}`))));

        // ---- N2: a third, unpublished version's preview and its chapter
        const third = await step('n2 new version', async () => {
            await openVersion(Number(state().slice(-1)[0].split('|')[0]));
            return createNewVersion(e, app);
        });
        fact('n2 state', state());
        if (third && third.id) await openVersion(third.id);
        facts.n2book = await step('n2 preview', () => preview('n2-new-version-preview-book'));
        facts.n2chapter = await step('n2 chapter', () => previewChapter('n2-new-version-preview-chapter'));
        await visitBook('n2-visitor-book');
        facts.n2current = await visitChapter('n2-visitor-current-chapter');
        }
        // ---- N3: the chapters on the version's date again ("All chapters will use the publication date of the monograph.")
        if (on('n3')) {
        await step('n3 publication dates', async () => {
            const chaptersPage = new ChaptersPage(e, app.contextPath);
            await openVersion(Number(state().slice(-1)[0].split('|')[0]));
            await chaptersPage.openPublicationDates();
            await chaptersPage.savePublicationDates('All chapters will use the publication date of the monograph.');
            await idle(e);
            return sql(app, `select coalesce((select setting_value from submission_settings where submission_id = ${SID} and setting_name = 'enableChapterPublicationDates'), 'unset')`);
        });
        await visitBook('n3-visitor-book');
        facts.n3current = await visitChapter('n3-visitor-current-chapter-version-dates');
        }
        // ---- N4 (main): the first version unpublished while the later one stays published
        if (on('n4') && !stable35) {
        await step('n4 unpublish first version', async () => {
            await openVersion(v1);
            return pressAndConfirm(e, 'Unpublish', /\/unpublish$/);
        });
        fact('n4 state', state());
        facts.n4book = await visitBook('n4-visitor-book-first-version-unpublished');
        facts.n4chapter = await visitChapter('n4-visitor-chapter-first-version-unpublished');
        }
        // ---- N5 (main): a book's page with two versions published on one day (submission 5, no chapter pages)
        if (on('n5') && !stable35) {
        const OTHER = 5;
        const other = Number(sql(app, `select publication_id from publications where submission_id = ${OTHER} order by 1 limit 1`));
        await step('n5 unpublish', async () => {
            await openVersion(other, OTHER);
            return pressAndConfirm(e, 'Unpublish', /\/unpublish$/);
        });
        await step('n5 date today', async () => {
            await openPage(other, 'catalogEntry', 'Catalog Entry', OTHER);
            return setBookDate(e, today);
        });
        await step('n5 publish', () => publishOrSchedule(e));
        facts.n5one = await visitBook('n5-visitor-book-one-version', OTHER);
        await step('n5 new version', async () => {
            await openVersion(other, OTHER);
            return createNewVersion(e, app);
        });
        await step('n5 publish again', () => publishOrSchedule(e));
        fact('n5 state', sql(app, `select publication_id, status, date_published from publications where submission_id = ${OTHER} order by 1`).split('\n'));
        facts.n5two = await visitBook('n5-visitor-book-two-versions-one-day', OTHER);
        }
        await signOut(e).catch(() => {});
    } finally {
        record(name(`facts${process.env.PHASES ? `-${phases.join('-')}` : ''}`), facts);
        await editor.close();
        await reader.close();
    }
});
