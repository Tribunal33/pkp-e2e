// Neighbour check for the fix of docs/issues/U19-A7-oai-section-save-drops-peer-reviewed.md.
// Runs after walk.js on the same dataset fleet (the journal u19w10 and its
// article 21 exist). Through the screens, as `admin`, on u19w10's "Articles":
//   a  publicknowledge's article 1 read signed out (its "Articles" was saved
//      with the box empty when the dataset was built): the fix's intended reach
//   b  "Will not be peer-reviewed" ticked, the box empty, "Save"; article 21 read:
//      no "Peer-reviewed Article", fix in or out (what the fix must leave alone)
//   c  the box unticked again, "u19w10 Research Note" typed in the English
//      "Identify items published in this section as a(n)", "Save"; article 21
//      read: the typed words alone, fix in or out
// Run with the fix in and out:
//   PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w10 PROBE_AGENT=w10 node bin/probe.js ojs shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/neighbour.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const TAG = 'u19w10';
const REPO = path.resolve(__dirname, '../../../../..');
const dcTypes = (body) => [...body.matchAll(/<dc:type(?:\s+xml:lang="([^"]*)")?\s*>([^<]*)<\/dc:type>/g)].map((m) => (m[1] ? `${m[2]} [${m[1]}]` : m[2]));

forEachApp(async (app) => {
    if (!app.dataset || app.name !== 'ojs') throw new Error('neighbour.js runs on an OJS dataset fleet only, after walk.js');
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    const facts = {run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const read = async (ctxPath, id) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${ctxPath}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:${repoId}:article/${id}`;
            await page.goto(app.url(rel));
            record(`nb-${ctxPath}-${id}-${Object.keys(facts).length}`, await screen(page));
            const body = await (await page.request.get(app.url(rel))).text();
            return {error: (body.match(/<error code="([^"]+)"/) || [])[1] || null, dcType: dcTypes(body)};
        } finally { await close(); }
    };
    const editArticles = async (label, {notReviewed, words}) => {
        const {SectionsTab} = require('../../../pages/SectionsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const tab = new SectionsTab(page, TAG, {locale: 'en'});
            await tab.goto();
            const win = await tab.openEdit('Articles');
            const box = win.checkbox('Will not be peer-reviewed');
            if ((await box.isChecked()) !== notReviewed) await box.click();
            await win.box('identifyType[en]').fill(words);
            record(`nb-window-${label}`, await screen(page));
            const r = await win.saveAndClose();
            await idle(page);
            await signOut(page);
            return r.status();
        } finally { await close(); }
    };

    fact('a publicknowledge article 1', await read(app.contextPath, 1));
    fact('b save: not reviewed, box empty', await editArticles('b', {notReviewed: true, words: ''}));
    fact('b u19w10 article 21', await read(TAG, 21));
    fact('c save: reviewed, typed words', await editArticles('c', {notReviewed: false, words: `${TAG} Research Note`}));
    fact('c u19w10 article 21', await read(TAG, 21));
    record('neighbour', facts);
});
