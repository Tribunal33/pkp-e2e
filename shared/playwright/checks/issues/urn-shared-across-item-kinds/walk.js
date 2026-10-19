// Issue report docs/issues/U44-A16-urn-shared-across-item-kinds.md (U44 A16): a URN is checked for
// duplicates only among items of its own kind, so an issue, an article and its galley (a press's
// chapter, monograph and format) can all be given one URN. Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Articles", "Issues",
//        "Galleys" (press "Monographs", "Chapters", "Publication Formats"), prefix urn:nbn:de:0000-,
//        individual suffix, "Check Number" unticked, namespace urn:nbn:de, resolver, "Save"
//   4-5  OJS issue Vol. 2 No. 1 (2015) / OMP book 4's chapter "Introduction: Contexts of Popular
//        Culture": "Identifiers" tab, "URN Suffix" h19k, "Save"; again: "Save" (assigned)
//   6    OJS submission 1 (version 1.1) / OMP book 4: "Identifiers" page, urn:nbn:de:0000-h19k, "Save"
//   7-8  OJS submission 1's galley "PDF Version 2" / OMP book 4: "Add publication format" "h19k EPUB"
//        (the dataset's "PDF" is remote: no "Identifiers" tab), then that format's "Identifiers" tab,
//        "URN Suffix" h19k, "Save"; again: "Save"
//   9    control: OJS submission 5 / OMP book 7: "Identifiers" page, urn:nbn:de:0000-h19k, "Save"
// WALK=neighbour runs alone (fix in and out): steps 1-3, then URNs no other item carries and an
// item's own second save (h19n on the issue / chapter, twice; h19n2 on the galley / format;
// urn:nbn:de:0000-h19n3 on the article's / monograph's page, OMP saved twice): all accepted.
//
// Reset first:  npm run fleet-prep -- --feature issues-h19k --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-h19k PROBE_AGENT=h19k node bin/probe.js all shared/playwright/checks/issues/urn-shared-across-item-kinds/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h19k-3_5 --dataset 8 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19k-3_5 PROBE_AGENT=h19k node bin/probe.js all shared/playwright/checks/issues/urn-shared-across-item-kinds/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {PREFIX, flat, setUpUrn, savePage, openItemTab, addFormat, readTab, saveTab} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {
        kinds: ['Articles', 'Issues', 'Galleys'],
        first: {kind: 'issue', item: 'Vol. 2 No. 1 (2015)'},
        sid: 1,
        second: {kind: 'galley', item: 'PDF Version 2'},
        control: 5,
    },
    omp: {
        kinds: ['Monographs', 'Chapters', 'Publication Formats'],
        first: {kind: 'chapter', item: 'Introduction: Contexts of Popular Culture'},
        sid: 4,
        second: {kind: 'format', item: 'h19k EPUB', create: true},
        control: 7,
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    if (!a) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    // Reads for the facts, not steps: the version the workflow opens on, and every stored URN.
    const currentPub = (sid) => Number(sql(app, `select max(publication_id) from publications where submission_id = ${sid}`).trim());
    const tables = app.name === 'ojs'
        ? [['issue', 'issue_settings', 'issue_id'], ['publication', 'publication_settings', 'publication_id'], ['galley', 'publication_galley_settings', 'galley_id']]
        : [['chapter', 'submission_chapter_settings', 'chapter_id'], ['publication', 'publication_settings', 'publication_id'], ['format', 'publication_format_settings', 'publication_format_id']];
    const storedUrns = () =>
        sql(app, tables.map(([k, t, id]) => `select '${k}', ${id}, setting_value from ${t} where setting_name = 'pub-id::other::urn'`).join(' union all ') + ' order by 1, 2')
            .split('\n')
            .filter(Boolean);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const snap = async (label) => record(name(label), await screen(page));
    /** One step that records its error and lets the walk go on (a fix may change what a step meets). */
    const step = async (k, fn) => {
        try {
            const out = await fn();
            fact(k, out);
            return out;
        } catch (e) {
            fact(k, {error: flat(e.message, 400)});
            return null;
        }
    };
    const pubId = currentPub(a.sid);
    const where = (it) => ({sid: a.sid, pubId, item: it.item});
    /** An item's tab: `suffix` typed, "Save"; when accepted, opened again and "Save" with the box as it arrives. */
    const tabTwice = async (label, it, suffix) => {
        if (it.create) fact(`${label} format added`, await addFormat(page, app, frame, a.sid, pubId, it.item));
        let win = await openItemTab(page, app, frame, it.kind, where(it));
        const first = await saveTab(page, app, win, suffix);
        await snap(`${label}-first`);
        let second = null;
        if (first.accepted) {
            win = await openItemTab(page, app, frame, it.kind, where(it));
            second = await saveTab(page, app, win, null);
            await snap(`${label}-second`);
        }
        win = await openItemTab(page, app, frame, it.kind, where(it));
        const after = await readTab(win);
        await snap(`${label}-after`);
        await win.close().catch(() => {});
        return {kind: it.kind, item: it.item, first, second, after};
    };

    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, a.kinds));

        if (MODE === 'neighbour') {
            await step('n1 first item own second save', () => tabTwice('n1', a.first, 'h19n'));
            await step('n2 second item other suffix', () => tabTwice('n2', a.second, 'h19n2'));
            await step('n3 page other urn', async () => {
                const out = await savePage(page, app, frame, a.sid, pubId, `${PREFIX}h19n3`);
                await snap('n3-page');
                return out;
            });
            if (app.name === 'omp') {
                await step('n4 page own urn again', async () => {
                    const out = await savePage(page, app, frame, a.sid, pubId, null);
                    await snap('n4-page-again');
                    return out;
                });
            }
            fact('neighbour stored', storedUrns());
            return;
        }

        // 4-5
        await step('5 first item', () => tabTwice('s5', a.first, 'h19k'));
        // 6
        const s6 = await step('6 page', async () => {
            const out = await savePage(page, app, frame, a.sid, pubId, `${PREFIX}h19k`);
            await snap('s6-page');
            return out;
        });
        // 7-8
        const s8 = await step('8 second item', () => tabTwice('s8', a.second, 'h19k'));
        // 9
        const s9 = await step('9 control', async () => {
            const out = await savePage(page, app, frame, a.control, currentPub(a.control), `${PREFIX}h19k`);
            await snap('s9-control');
            return out;
        });
        fact('verdict', {
            pageAccepted: s6 ? s6.saved : null,
            secondItemAccepted: s8 ? s8.first.accepted : null,
            secondItemAssigned: s8 ? s8.after.assignedText : null,
            controlRefused: s9 ? !s9.saved && s9.status === 400 : null,
            stored: storedUrns(),
        });
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
