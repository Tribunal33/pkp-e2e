// Issue report docs/issues/U73-A15-format-name-required-primary-language.md (U73 A15): on a
// press with a second language, a book in that language cannot get a publication format named
// in its own language alone; "OK" is refused with "This field is required." under the press's
// primary-language box. Takes the report's Steps through the screens on a dataset fleet freshly
// reset to PKP's default test dataset (OMP `publicknowledge`: English primary, French (Canada)
// offered for submissions and metadata). The kit builds nothing.
//
// MODE=walk (default), OMP:
//   1-2. aclark: "New Submission" in "French (Canada)", "u73j Le livre des marées", a file, a
//        French abstract, "Submit"
//   3.   dbarnes: the book's "Publication Formats"
//   4.   "Add publication format": the name boxes (which shows, which is required); the French
//        box typed "Livre numérique u73j", the English one left empty
//   5.   "OK": request sent or not, the errors, the window
//   c.   control: the dataset's English book 4 "How Canadians Communicate": "Add publication
//        format", "E-book u73j" in the English box alone, "OK"
//   OJS, OPS: skipped (no publication formats; no other form asks for a language other than
//   the context's primary in a required multilingual box: code read).
// MODE=nb, the neighbour alone (fix in and out), OMP, on its own French book "u73j Le livre
//   des vents": (a) "Add publication format", the French box empty and "Book u73j" in the
//   English box, "OK": the book's language must stay required; (b) the reach: "Chapters" ›
//   "Add Chapter", "Chapitre u73j" in the French title box alone, "Save".
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH \
//               npm run fleet-prep -- --feature issues-u73j --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u73j PROBE_AGENT=u73j node bin/probe.js omp \
//                 shared/playwright/checks/issues/format-name-required-primary-language/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u73j-3_5, PROBE_RUN=r35.
// Neighbour:    MODE=nb (and PROBE_RUN=nb-in / nb-out) in front of the run.
// Records the screens and what each read shows; asserts nothing.
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const ENGLISH_BOOK = {id: 4, publicationId: 4};
const UPDATE_FORMAT = /publication-format-grid\/update-format(?:\?|$)/;
const UPDATE_CHAPTER = /chapter-grid\/update-chapter(?:\?|$)/;

forEachApp(async (app) => {
    if (app.name !== 'omp') {
        console.log(`[a15] ${app.name}: no publication formats; read in the code`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[a15] ${app.name} ${MODE} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const step = async (key, fn) => {
        try {
            const v = await fn();
            fact(key, v);
            return v;
        } catch (e) {
            fact(`${key} error`, L.flat(String(e && e.message), 600));
            return null;
        }
    };
    const snap = async (name) => {
        const s = await screen(page).catch((e) => ({error: L.flat(e.message, 200)}));
        record(`${MODE}-${name}`, s);
        await shot(page, `${MODE}-${name}`).catch(() => {});
        return s;
    };
    const storedNames = (table, idCol, where) =>
        sql(app, `select ${idCol}, s.locale, s.setting_value from ${table} t join ${table.replace(/s$/, '')}_settings s using (${idCol}) where s.setting_name = '${where.setting}' and t.publication_id = ${where.publicationId} order by 1, 2`);
    const publicationOf = (id) => Number(sql(app, `select current_publication_id from submissions where submission_id = ${Number(id)}`).trim());

    const {page, close} = await launch(app);
    try {
        // 1-2 (and nb's precondition): the French book, submitted by aclark.
        await signIn(page, 'aclark');
        const title = MODE === 'nb' ? 'u73j Le livre des vents' : 'u73j Le livre des marées';
        const book = await step('submit', () => L.submitFrenchBook(page, app, title));
        if (!book || !book.id) return;
        const pubId = publicationOf(book.id);
        fact('book', {id: book.id, publicationId: pubId, locale: sql(app, `select locale from submissions where submission_id = ${book.id}`).trim()});
        await signOut(page);
        await signIn(page, 'dbarnes');

        if (MODE === 'nb') {
            // (a) the book's own language must stay required.
            const pf = await step('formats', () => L.openFormats(app, page, book.id, null).then(() => 'open'));
            if (pf) {
                const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
                const list = new PublicationFormatsPage(page, app.contextPath);
                const add = await step('nb add', async () => {
                    const a = await L.openAddFormat(list);
                    fact('nb boxes', a.first);
                    return a;
                });
                if (add) {
                    await step('nb typed', () => L.typeIn(add.form, 'name', 'en', 'Book u73j'));
                    await step('nb ok', () => L.pressAndRead(page, add.win.dialog(), add.form, 'OK', UPDATE_FORMAT));
                    await snap('format-french-empty');
                    fact('nb stored formats', storedNames('publication_formats', 'publication_format_id', {setting: 'name', publicationId: pubId}));
                }
            }
            // (b) the reach: the chapter window's title.
            const ch = await step('chapter add', async () => {
                const c = await L.openAddChapter(app, page, book.id);
                fact('chapter boxes', c.first);
                return c;
            });
            if (ch) {
                await step('chapter typed', () => L.typeIn(ch.form, 'title', 'fr_CA', 'Chapitre u73j'));
                await step('chapter save', () => L.pressAndRead(page, ch.win.dialog(), ch.form, 'Save', UPDATE_CHAPTER));
                await snap('chapter-french-only');
                fact('stored chapters', sql(app, `select c.chapter_id, s.locale, s.setting_value from submission_chapters c join submission_chapter_settings s on s.chapter_id = c.chapter_id and s.setting_name = 'title' where c.publication_id = ${pubId} order by 1, 2`));
            }
            return;
        }

        // 3. the French book's "Publication Formats".
        const opened = await step('formats', () => L.openFormats(app, page, book.id, null).then(() => 'open'));
        await snap('formats-french-book');
        if (opened) {
            const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
            const list = new PublicationFormatsPage(page, app.contextPath);
            // 4. "Add publication format": the boxes, then the French name alone.
            const add = await step('add', async () => {
                const a = await L.openAddFormat(list);
                fact('boxes', a.first);
                return a;
            });
            if (add) {
                await snap('add-window');
                await step('typed', () => L.typeIn(add.form, 'name', 'fr_CA', 'Livre numérique u73j'));
                fact('boxes after typing', await L.boxes(add.form, 'name'));
                // 5. "OK".
                await step('ok', () => L.pressAndRead(page, add.win.dialog(), add.form, 'OK', UPDATE_FORMAT));
                await snap('after-ok');
                fact('listed', await list.formatLabels().allInnerTexts().catch(() => null));
                fact('stored formats', storedNames('publication_formats', 'publication_format_id', {setting: 'name', publicationId: pubId}));
            }
        }

        // c. control: the dataset's English book, the English name alone.
        const ctl = await step('control formats', () => L.openFormats(app, page, ENGLISH_BOOK.id, ENGLISH_BOOK.publicationId).then(() => 'open'));
        if (ctl) {
            const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
            const list = new PublicationFormatsPage(page, app.contextPath);
            const add = await step('control add', async () => {
                const a = await L.openAddFormat(list);
                fact('control boxes', a.first);
                return a;
            });
            if (add) {
                await step('control typed', () => L.typeIn(add.form, 'name', 'en', 'E-book u73j'));
                await step('control ok', () => L.pressAndRead(page, add.win.dialog(), add.form, 'OK', UPDATE_FORMAT));
                await snap('control-after-ok');
                fact('control listed', await list.formatLabels().allInnerTexts().catch(() => null));
            }
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
