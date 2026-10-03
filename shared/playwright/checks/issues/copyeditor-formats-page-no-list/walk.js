// Issue report docs/issues/U73-A13-*.md (U73 A13): on a press, the side menu lists "Publication
// Formats" for a Copyeditor (and the other assistant roles whose stages leave out Production),
// and the page then shows "You don't currently have access to that stage of the workflow."
// where the list should be.
// Takes the report's Steps on PKP's default test dataset (a dataset fleet), OMP only:
//   1-4  svogt (Copyeditor on book 1, Copyediting) opens book 1 › Publication › version: the
//        pages listed; "Publication Formats": what the page shows and what its list's request answers
//   5-7  svogt opens book 5 (published; Copyeditor there too): the same
//   C    dbarnes (Press editor) on book 1: the list (control)
// OJS and OPS: no publication formats (galleys instead), skipped.
// WALK=neighbour runs alone (fix in and out): gcox (Layout Editor on book 4, Production) and
// aclark (book 1's author, "My Submissions") are still offered the page and get the list, and
// dbarnes on book 1 too.
// A step reads the state the fix brings (no "Publication Formats" under the version: the page's
// own address typed, recorded as what it shows, not a step) and records it rather than throwing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u73i --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u73i PROBE_AGENT=u73i node bin/probe.js omp shared/playwright/checks/issues/copyeditor-formats-page-no-list/walk.js
const {forEachApp, launch, signIn, screen, record, serverLog, sql} = require('../../../probe');
const {pagesUnderVersion, openFormatsPage, readFormatsPage, menuLabels, GRID} = require('./lib');
const {openBook} = require('../assistant-marketing-work-type-offered-then-refused/lib');

const MODE = process.env.WALK || 'walk';
const BOOKS = {
    1: 'The ABCs of Human Survival',
    4: 'How Canadians Communicate',
    5: 'Bomb Canada and Other Unkind Remarks',
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        console.log(`[fact] ${app.name} skipped: no publication formats (galleys instead)`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a13${MODE === 'neighbour' ? 'nb' : ''}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const pubId = (sid) => sql(app, `select current_publication_id from submissions where submission_id = ${Number(sid)}`);
    const menuKey = (sid) => (app.line === 'stable-3_5_0' ? 'publication_publicationFormats' : `publication_${pubId(sid)}_publicationFormats`);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});

    /**
     * Open book `sid` as the signed-in user, read the pages under its version, and open
     * "Publication Formats" when it is listed; when it is not (the fix's state), type the page's
     * own address and record what that shows.
     */
    const visit = async (label, sid, {author = false} = {}) => {
        let via;
        if (author) {
            await frame.gotoAuthor(sid);
            via = 'address (My Submissions)';
        } else {
            via = await openBook(page, app, sid, BOOKS[sid]);
        }
        const {labels, pages} = await pagesUnderVersion(page);
        fact(`${label} opened via`, via);
        fact(`${label} pages under version`, pages);
        const offered = pages.includes('Publication Formats');
        let shown;
        const from = log.mark();
        if (offered) {
            shown = await openFormatsPage(page);
            record(name(`${label}-formats`), await screen(page));
        } else {
            fact(`${label} menu`, labels);
            record(name(`${label}-menu`), await screen(page));
            const answer = page.waitForResponse((r) => GRID.test(r.url()), {timeout: 10_000}).catch(() => null);
            if (author) await frame.gotoAuthor(sid, {menuKey: menuKey(sid)});
            else await frame.gotoEditorial(sid, {menuKey: menuKey(sid)});
            shown = await readFormatsPage(page, answer);
            shown.typedAddress = true;
            shown.menuAfter = await menuLabels(page);
            record(name(`${label}-typed`), await screen(page));
        }
        shown.serverLog = log.since(from);
        fact(`${label} formats page`, shown);
        return {offered, list: shown.list > 0, refused: shown.request ? shown.request.jsonStatus === false : null};
    };

    try {
        if (MODE === 'neighbour') {
            await signIn(page, 'gcox');
            const layout = await visit('N1 gcox book4', 4);
            await signIn(page, 'aclark');
            const author = await visit('N2 aclark book1', 1, {author: true});
            await signIn(page, 'dbarnes');
            const editor = await visit('N3 dbarnes book1', 1);
            fact('neighbour verdict', {layout, author, editor});
            return;
        }

        // 1-4
        await signIn(page, 'svogt');
        const copyediting = await visit('3 svogt book1', 1);
        // 5-7
        const published = await visit('6 svogt book5', 5);
        // Control: the Press editor on book 1.
        await signIn(page, 'dbarnes');
        const editor = await visit('C dbarnes book1', 1);
        fact('verdict', {copyediting, published, editor});
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
