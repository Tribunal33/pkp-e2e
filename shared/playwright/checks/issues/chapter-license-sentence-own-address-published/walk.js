// U72 A8: on an Edited Volume the chapter window says "The license will be set automatically to
// {license} when this is published." above a "License URL" box that already holds the chapter's
// own address, which publishing keeps, and goes on saying it once the version is published.
// Takes the report's Steps on PKP's default test dataset, OMP (OJS and OPS have no chapters):
//   rvaca: Settings › Distribution › "License" › "CC Attribution 4.0" › "Save".
//   dbarnes, submission 4 "How Canadians Communicate…": work type "Edited Volume"; "Publication" ›
//   "Chapters": "Introduction: Contexts of Popular Culture" read (the sentence above an empty box,
//   the control); "Chapter 1. A Future for Media Studies…" given https://example.org/u72d-chapter-license,
//   "Save", reopened and read; the book published from the header; both chapters reopened and read.
// With `neighbour` as its last argument it instead takes step 1, then reads, as dbarnes, the chapter
// "Critical History in Western Canada 1900–2000" of submission 2 (an unpublished Edited Volume, its
// box empty: the sentence must stay) and "Introduction…" of submission 4 left a Monograph (no
// "License URL": must stay so): the cases a fix must leave alone.
// Records the box, the sentence above it, and the stored values (Evidence).
// Reset the dataset fleet first; the walk changes the press and the book.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/chapter-license-sentence-own-address-published/walk.js [neighbour]
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const {snap} = require('../publisher-id-on-tab-never-removed/lib');
const {openWorkflow, publishOrSchedule} = require('../chapter-page-dates-and-preview-notice/lib');
const {setPressLicense, chooseWorkType, openChapters, openAndRead, stored, storedPublication} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const SID = 4;
const PUB = 4;
const INTRO = 'Introduction: Contexts of Popular Culture';
const CH1 = 'Chapter 1. A Future for Media Studies: Cultural Labour, Cultural Relations, Cultural Politics';
const OWN = 'https://example.org/u72d-chapter-license';
const EV_SID = 2;
const EV_PUB = 2;
const EV_CH = 'Critical History in Western Canada 1900–2000';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u72d walk: ${app.name} skipped, no chapters`);
        return;
    }
    const {page, close} = await launch(app);
    const facts = {line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : 'steps'};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: String(e.message).split('\n')[0].slice(0, 300)};
        }
    };
    const readChapter = (sid, pub, title, name) => async () => {
        const list = await openChapters(page, app, sid, pub);
        const {win, license} = await openAndRead(page, list, title, name, snap);
        await win.cancel();
        return {...license, stored: stored(app, title)};
    };
    try {
        await signIn(page, 'rvaca');
        await step('s1', () => setPressLicense(page, app, 'CC Attribution 4.0'));
        await signIn(page, 'dbarnes');
        if (NEIGHBOUR) {
            await step('n1', readChapter(EV_SID, EV_PUB, EV_CH, 'n1-edited-volume-empty-box'));
            await step('n2', async () => ({workType: await chooseWorkType(page, app, SID, null)}));
            await step('n3', readChapter(SID, PUB, INTRO, 'n3-monograph-chapter'));
        } else {
            await step('s3', () => chooseWorkType(page, app, SID, 'Edited Volume'));
            await step('s4', readChapter(SID, PUB, INTRO, 's4-intro-empty-box'));
            await step('s5', async () => {
                const list = await openChapters(page, app, SID, PUB);
                const win = await list.openEdit(CH1);
                await win.fill({licenseUrl: OWN});
                await win.save();
                return {typed: OWN, stored: stored(app, CH1)};
            });
            await step('s6', readChapter(SID, PUB, CH1, 's6-ch1-own-address'));
            await step('s7', async () => {
                if (app.line === 'stable-3_5_0') {
                    // 3.5: menu keys without the version's id; the side menu's "Title & Abstract".
                    const frame = await openWorkflow(page, app, SID, null, false);
                    await frame.menuLink('Title & Abstract').first().click();
                    await page.locator('[data-cy="workflow-controls-right"]').waitFor({timeout: 30_000});
                } else {
                    await openWorkflow(page, app, SID, `publication_${PUB}_titleAbstract`);
                }
                const out = await publishOrSchedule(page);
                await snap(page, 's7-published');
                return {...out, publication: storedPublication(app, PUB)};
            });
            await step('s8', readChapter(SID, PUB, INTRO, 's8-intro-after-publish'));
            await step('s9', readChapter(SID, PUB, CH1, 's9-ch1-after-publish'));
        }
    } finally {
        facts.publication = storedPublication(app, NEIGHBOUR ? EV_PUB : PUB);
        record(NEIGHBOUR ? 'neighbour' : 'walk', facts);
        console.log(`[fact] ${JSON.stringify(facts)}`);
        await close();
    }
});
