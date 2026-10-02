// Issue report docs/issues/U24-OMP3-press-identifiers-page-stays-after-plugin-off.md (U24 OMP3): on a
// press the workflow's "Identifiers" page stays listed, and opens empty, after the URN plugin is
// disabled; a journal drops it. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet), as `dbarnes`, on OMP and, as the control, OJS (OPS has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; its "Settings": "Monographs"/"Articles",
//        prefix urn:nbn:de:0000-, namespace urn:nbn:de, individual suffix, resolver, "Save"
//   4    OMP book 4 / OJS submission 5: the menu lists "Identifiers", which opens with a "URN" box
//   5    Plugins: "URN" unticked, "OK"
//   6    the same workflow again: is "Identifiers" listed, and what opens
// WALK=neighbour runs alone (fix in and out): the book before the plugin was ever enabled (no
// "Identifiers"), after steps 1-3 (listed, with the box), and after a disable and a second enable
// (listed, with the box again).
// WALK=book runs alone, on OMP (the public side of the same cause): the plugin enabled with
// "Publication Formats", book 14's "PDF" format given its URN on the format's "Identifiers" tab,
// the public book page read signed out; then the plugin disabled and the book page read again.
//
// Reset first:  npm run fleet-prep -- --feature issues-u24c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u24c PROBE_AGENT=u24c node bin/probe.js all shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u24c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u24c-3_5 PROBE_AGENT=u24c node bin/probe.js all shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, sql} = require('../../../probe');
const {setUpUrn: setUpUrnKinds, openTab} = require('../publisher-id-on-tab-never-removed/lib');
const {readBookFormats} = require('../book-page-format-urn-code-label/lib');
const {setUpUrn} = require('../article-own-urn-refused-as-in-use/lib');
const {setUrnEnabled, readIdentifiers} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {ojs: {kind: 'Articles', sid: 5}, omp: {kind: 'Monographs', sid: 4}};

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
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };
    // Reads for the facts, not steps.
    const stored = () => ({
        versionsRow: sql(app, `select lazy_load, product_class_name from versions where product_type = 'plugins.pubIds' and product = 'urn' and current = 1`).trim(),
        pluginSettings: sql(app, `select setting_name, setting_value from plugin_settings where plugin_name = 'urnpubidplugin' and setting_name in ('enabled', 'enablePublicationURN') order by 1`).split('\n').filter(Boolean),
    });

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const read = async (label) => {
        const out = await readIdentifiers(page, app, frame, a.sid);
        fact(label, out);
        record(name(label.replace(/\s+/g, '-')), await screen(page));
        return out;
    };
    try {
        await signIn(page, 'dbarnes');
        fact('0 stored', stored());
        if (MODE === 'book') {
            if (app.name !== 'omp') return;
            const BOOK = 14;
            const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${BOOK}`).trim());
            const urnRows = (b) => b.blocks.map((x) => ({format: x.heading, rows: x.rows.filter((r) => /urn/i.test(r.label) || /urn:/i.test(r.value))}));
            fact('b1 setup', await setUpUrnKinds(page, app, ['Publication Formats']));
            const win = await openTab(page, app, {kind: 'format', sid: BOOK, pubId, item: 'PDF'});
            await win.assignBox().check();
            await win.save();
            await signOut(page);
            const on = await readBookFormats(page, app, BOOK);
            fact('b2 book page, plugin on', {status: on.status, urnRows: urnRows(on), urnHeadTag: on.urnHeadTag});
            record(name('b2-book-plugin-on'), await screen(page));
            await signIn(page, 'dbarnes');
            fact('b3 disable', await setUrnEnabled(page, app, false));
            await signOut(page);
            const off = await readBookFormats(page, app, BOOK);
            fact('b4 book page, plugin off', {status: off.status, urnRows: urnRows(off), urnHeadTag: off.urnHeadTag});
            record(name('b4-book-plugin-off'), await screen(page));
            return;
        }
        if (MODE === 'neighbour') await read('n1 never enabled');
        fact('3 setup', await setUpUrn(page, app, a.kind));
        await read(MODE === 'neighbour' ? 'n2 enabled' : '4 enabled');
        fact('5 disable', await setUrnEnabled(page, app, false));
        fact('5 stored', stored());
        if (MODE === 'neighbour') {
            fact('n3 enable again', await setUrnEnabled(page, app, true));
            await read('n3 enabled again');
        } else {
            await read('6 disabled');
        }
    } finally {
        record(name(`facts-${MODE}`), facts);
        await close();
    }
});
