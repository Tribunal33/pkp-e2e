// Issue report docs/issues/U17-OPS2-section-type-box-no-examples-no-effect.md (U17 OPS2): on a preprint
// server, the section window's "Identify items posted in this section as a(n)" box has the help
// "(For example etc.)", and the words typed in it reach no page and no harvested record. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), on OPS, and the same steps on OJS as
// the control (the journal's "Articles"); OMP has no such box:
//   1    sign in as rvaca
//   2    Settings › Server (Journal), tab "Sections"
//   3    "Preprints" ("Articles") › "Edit"
//   4    the help under "Identify items posted (published) in this section as a(n)"
//   5    type "Working Paper" in that box, "Save"
//   6    signed out, the context's ListRecords (oai_dc): each record's dc:type
// Each step records the state it meets (a box gone with the fix in) rather than throwing.
// WALK=neighbour runs alone (OPS, fix in and out): the same window's other fields, "Abbreviation" changed
// to "PREu17k" and saved, reopened, and the harvesting set it names (ListSets).
//
// Reset first:  npm run fleet-prep -- --feature issues-u17k --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u17k PROBE_AGENT=u17k node bin/probe.js all shared/playwright/checks/issues/section-type-box-no-examples-no-effect/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17k-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17k-3_5 PROBE_AGENT=u17k node bin/probe.js all shared/playwright/checks/issues/section-type-box-no-examples-no-effect/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const TYPE = 'Working Paper';
const ABBREV = 'PREu17k';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'omp') return;
    if (MODE === 'neighbour' && app.name !== 'ops') return;
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const {readOai} = require('../../../pages/OaiPages.js');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const tidy = (t) => String(t).replace(/\s+/g, ' ').trim();
    const sectionName = app.name === 'ops' ? 'Preprints' : 'Articles';

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => {});
    };
    const sections = new SectionsTab(page, app.contextPath);
    const form = page.locator('form#sectionForm');
    const typeBox = form.locator('[name="identifyType[en]"]');
    let win = null;
    const openEdit = async () => {
        win = await sections.openEdit(sectionName);
        return {heading: tidy(await win.heading().innerText().catch(() => ''))};
    };
    const closeWindow = async () => {
        if (await form.isVisible().catch(() => false)) {
            await win.cancelLink().click();
            await form.waitFor({state: 'hidden', timeout: 10_000});
        }
    };
    const save = async () => {
        const r = await win.save();
        await form.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
        const s = await screen(page);
        return {status: r.status(), windowOpen: await form.isVisible().catch(() => false), notices: s.notices};
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
        await step('2 Settings, "Sections"', async () => {
            await sections.goto();
            return {rows: (await sections.titleCells().allInnerTexts()).map(tidy)};
        });
        await step(`3 "${sectionName}" › Edit`, openEdit);
        if (MODE !== 'neighbour') {
            await step('4 the help under "Identify items … as a(n)"', async () => {
                if (!(await typeBox.count())) {
                    return {box: 'absent', windowText: tidy(await form.innerText()).slice(0, 1500)};
                }
                // The box's own label is the help under it; the heading is the nearest
                // ancestor's text that holds "Identify items".
                return typeBox.evaluate((el) => {
                    let a = el.parentElement;
                    while (a && !/Identify items/.test(a.innerText)) a = a.parentElement;
                    const text = (a ? a.innerText : '').replace(/\s+/g, ' ').trim();
                    return {
                        heading: (text.match(/Identify items[^\n]*?as a\(n\)/) || [null])[0],
                        help: [...(el.labels || [])].map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
                        accessibleName: el.getAttribute('aria-label'),
                    };
                });
            });
            record('edit-window', await screen(page));
            await step(`5 type "${TYPE}", Save`, async () => {
                if (!(await typeBox.count())) return {box: 'absent', save: await save()};
                await win.type('identifyType[en]', TYPE);
                return save();
            });
            await step('5b reopen: the box holds', async () => {
                await openEdit();
                const value = (await typeBox.count()) ? await typeBox.inputValue() : 'absent';
                await closeWindow();
                return value;
            });
            await step('6 signed out, ListRecords (oai_dc): dc:type per record', async () => {
                await signOut(page);
                const a = await readOai(app.baseURL, app.contextPath, 'verb=ListRecords&metadataPrefix=oai_dc');
                const records = (a.records || []).map((r) => ({
                    identifier: r.header ? r.header.identifier : r.identifier,
                    types: r.dc ? r.dc.type : null,
                }));
                return {
                    status: a.status,
                    records: records.length,
                    withTyped: records.filter((r) => (r.types || []).includes(TYPE)).map((r) => r.identifier),
                    typeSets: [...new Set(records.map((r) => JSON.stringify(r.types)))],
                    sample: records.slice(0, 2),
                };
            });
        } else {
            await step('N1 the window\'s fields (headings and labels)', async () => {
                const labels = await form.locator('.section > label, .section legend, .section > span > label, label.sub_label').allInnerTexts();
                return {typeBox: await typeBox.count(), labels: labels.map(tidy).filter(Boolean)};
            });
            record('neighbour-window', await screen(page));
            await step(`N2 "Abbreviation" → "${ABBREV}", Save`, async () => {
                await win.type('abbrev[en]', ABBREV);
                return save();
            });
            await step('N3 reopen: "Abbreviation" holds', async () => {
                await openEdit();
                const value = await win.box('abbrev[en]').inputValue();
                await closeWindow();
                return value;
            });
            await step('N4 signed out, ListSets', async () => {
                await signOut(page);
                const a = await readOai(app.baseURL, app.contextPath, 'verb=ListSets');
                return {status: a.status, sets: a.sets};
            });
        }
        await step('end close', closeWindow);
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
