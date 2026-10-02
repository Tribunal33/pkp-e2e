// Issue report docs/issues/U44-OMP2-book-page-format-urn-code-label.md (U44 OMP2): on a press's
// book page, a publication format's URN is labelled "other::urn" (the plugin's storage key) and
// shown as plain text, where a journal's article page labels a URN "URN" and links it to the
// resolver. Takes the report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`,
// on OMP (the only app with publication formats):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Publication Formats",
//        prefix urn:nbn:de:0000-, default patterns, namespace urn:nbn:de, resolver, "Save"
//   4-5  book 14 › Publication › "Publication Formats" › "PDF" › "Edit" › "Identifiers": tick the
//        assign box, "Save"
//   6-7  signed out, the book page /catalog/book/14: the "PDF" format's details block
// WALK=neighbour runs alone (fix in and out): steps 1-5, then the "URN" plugin disabled (its stored
// URN kept), and the book pages of 14 and of 5 (an approved, available format with no URN): no URN
// row on either, the rest of the format blocks as before.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44o --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u44o PROBE_AGENT=u44o node bin/probe.js omp shared/playwright/checks/issues/book-page-format-urn-code-label/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44o-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44o-3_5 PROBE_AGENT=u44o node bin/probe.js omp shared/playwright/checks/issues/book-page-format-urn-code-label/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, shot, sql} = require('../../../probe');
const {setUpUrn, openTab} = require('../publisher-id-on-tab-never-removed/lib');
const {flat, readBookFormats} = require('./lib');

const MODE = process.env.WALK || 'walk';
const SID = 14;
const FORMAT = 'PDF';
const OTHER_SID = 5;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: no publication formats`);
        return;
    }
    const name = (s) => s; // the kit adds PROBE_RUN and the app to every name
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const snap = async (label) => {
        record(name(label), await screen(page));
        await shot(page, name(label)).catch(() => {});
    };
    // A read for the facts, not a step: the version the workflow opens on (the newest).
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${SID}`).trim());
    const storedUrn = () => sql(app, `select s.setting_value from publication_format_settings s join publication_formats f on f.publication_format_id = s.publication_format_id where f.publication_id = ${pubId} and s.setting_name = 'pub-id::other::urn'`);

    const {page, close} = await launch(app);
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, ['Publication Formats']));

        // 4-5
        const win = await openTab(page, app, {kind: 'format', sid: SID, pubId, item: FORMAT});
        const area = flat(await win.urnArea().innerText().catch(() => ''), 400);
        fact('5 tab before save', {area, assignBox: await win.assignBox().count()});
        await snap('5-format-identifiers-tab');
        await win.assignBox().check();
        await win.save();
        fact('5 stored URN (evidence)', storedUrn());

        if (MODE === 'neighbour') {
            try {
                const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
                const plugins = new UrnPluginSettings(page, app.contextPath);
                await plugins.openPlugins();
                await plugins.setEnabled(false);
                await signOut(page);
                fact('n book 14, URN plugin off', await readBookFormats(page, app, SID));
                await snap('n-book-14-plugin-off');
                fact('n book 5', await readBookFormats(page, app, OTHER_SID));
                await snap('n-book-5');
                fact('n stored URN kept (evidence)', storedUrn());
            } catch (e) {
                fact('neighbour error', flat(e.message, 400));
                await snap('n-error');
            }
            return;
        }

        // 6-7
        await signOut(page);
        const book = await readBookFormats(page, app, SID);
        fact('7 book page', book);
        await snap('7-book-page');
        const urnRows = book.blocks.flatMap((b) => b.rows).filter((r) => /urn/i.test(r.label) || /urn:/i.test(r.value));
        fact('verdict', {urnRows, rawCodeOnPage: book.rawCodeOnPage});
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
