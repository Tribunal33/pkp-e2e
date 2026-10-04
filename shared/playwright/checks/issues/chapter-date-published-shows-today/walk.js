// U72 A4, joined to docs/issues/U50-A4-refused-save-date-published-today.md: on a press with
// "Each chapter may have its own publication date." saved, a chapter saved with an empty
// "Date Published" shows today's date there at every later opening. Takes the report's chapter
// Steps on PKP's default test dataset, OMP (OJS and OPS have no chapters):
//   dbarnes, submission 4 "How Canadians Communicate…": "Marketing" › "Publication Dates" ›
//   "Each chapter may have its own publication date." › "Save"; "Publication" › "Chapters" ›
//   "Introduction: Contexts of Popular Culture": read, "Save", reopen and read, "Save", reopen and
//   read; "Add Chapter" "u72b Undated chapter" with no date, "Save", open it and read.
// With `neighbour` as its last argument it instead types 2024-05-01 into "Chapter 1. A Future for
// Media Studies: …", saves, reopens and reads: the case a fix must leave alone.
// With `wayround` as its last argument it checks the two ways to give a chapter today's date once
// the box shows it: "Introduction…" saved empty, reopened, today's date typed key by key over the
// shown one, "Save"; "Chapter 1…" saved empty, reopened, today picked in the calendar, "Save".
// Records the visible box, the hidden field "Save" posts, and the stored date.
// Reset the dataset fleet first; the walk changes the book.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-date-published-shows-today/walk.js [neighbour|wayround]
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {setPublicationDates, openChapters, openAndRead, readDate, stored} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const WAYROUND = process.argv.includes('wayround');
const SID = 4;
const PUB = 4;
const EACH = 'Each chapter may have its own publication date.';
const INTRO = 'Introduction: Contexts of Popular Culture';
const CH1 = 'Chapter 1. A Future for Media Studies: Cultural Labour, Cultural Relations, Cultural Politics';
const NEW = 'u72b Undated chapter';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u72b walk: ${app.name} skipped, no chapters`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {today: new Date().toISOString().slice(0, 10), line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : WAYROUND ? 'wayround' : 'steps'};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: String(e.message).split('\n')[0].slice(0, 300)};
        }
    };
    try {
        await signIn(page, 'dbarnes');
        await step('s3', () => setPublicationDates(page, app, SID, EACH));
        const list = await openChapters(page, app, SID, PUB);
        if (WAYROUND) {
            for (const [key, title, how] of [['w1', INTRO, 'typed'], ['w2', CH1, 'calendar']]) {
                await step(key, async () => {
                    let {win} = await openAndRead(page, list, title, `${key}-first-open`);
                    await win.save();
                    const reopened = await openAndRead(page, list, title, `${key}-reopen`);
                    win = reopened.win;
                    if (how === 'typed') {
                        await win.typeDatePublished(facts.today);
                    } else {
                        await win.datePublishedBox().click();
                        await page.locator('#ui-datepicker-div .ui-datepicker-today a').click();
                    }
                    const entered = await readDate(win);
                    await win.save();
                    const storedAfter = stored(app, title);
                    const again = await openAndRead(page, list, title, `${key}-after`);
                    await again.win.cancel();
                    return {how, shownOnReopen: reopened.date, entered, storedAfter, nextOpening: again.date};
                });
            }
        } else if (NEIGHBOUR) {
            await step('n1', async () => {
                const {win, date} = await openAndRead(page, list, CH1, 'n1-open');
                await win.typeDatePublished('2024-05-01');
                const typed = await readDate(win);
                await win.save();
                return {before: date, typed, stored: stored(app, CH1)};
            });
            await step('n2', async () => {
                const {win, date} = await openAndRead(page, list, CH1, 'n2-reopen');
                await win.cancel();
                return {date, stored: stored(app, CH1)};
            });
        } else {
            await step('s4', async () => {
                const {win, date} = await openAndRead(page, list, INTRO, 's4-open');
                facts.storedBefore = stored(app, INTRO);
                await win.save();
                return {date, storedAfterSave: stored(app, INTRO)};
            });
            await step('s6', async () => {
                const {win, date} = await openAndRead(page, list, INTRO, 's6-reopen');
                await win.save();
                return {date, storedAfterSave: stored(app, INTRO)};
            });
            await step('s7', async () => {
                const {win, date} = await openAndRead(page, list, INTRO, 's7-third-open');
                await win.cancel();
                return {date, stored: stored(app, INTRO)};
            });
            await step('s8', async () => {
                const win = await list.openAdd();
                await win.fill({title: NEW});
                const date = await readDate(win);
                await win.save();
                return {dateInAddWindow: date, stored: stored(app, NEW)};
            });
            await step('s9', async () => {
                const {win, date} = await openAndRead(page, list, NEW, 's9-open-new');
                await win.cancel();
                return {date, stored: stored(app, NEW)};
            });
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : WAYROUND ? 'wayround' : 'walk', facts);
        console.log(`[fact] ${JSON.stringify(facts)}`);
        await close();
    }
});
