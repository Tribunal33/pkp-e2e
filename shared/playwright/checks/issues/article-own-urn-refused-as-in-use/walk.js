// Issue report docs/issues/U44-A4-article-own-urn-refused-as-in-use.md (U44 A4): the article's own
// URN is refused as "already in use" on a later "Save" and on a new version, and (same cause) a URN
// another article carries passes when that article's number equals the version's. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no
// URN plugin):
//   1-3   sign in; Settings › Website › Plugins: "URN" enabled; its "Settings": "Articles"/"Monographs",
//         prefix urn:nbn:de:0000-, namespace urn:nbn:de, individual suffix, resolver, "Save"
//   4-6   OJS submission 5 / OMP book 4: "Identifiers", type urn:nbn:de:0000-u44b5, "Save", "Save" again
//   7-11  OJS 17 / OMP 14: "Create New Version" (Minor), its "Identifiers": urn:nbn:de:0000-u44b17,
//         "Save"; "Publish" it; "Create New Version" again; its "Identifiers" shows the URN; "Save"
//   12-13 OJS only: submission 6 saves urn:nbn:de:0000-u44b6; submission 5 then saves the same URN
// WALK=neighbour runs alone (fix in and out): steps 1-3 and 12, then submission 9 (OMP: book 7)
// saves urn:nbn:de:0000-u44b6: refused both ways (a URN another submission carries).
// On stable-3_5_0 "Create New Version" is the publication header's button, answered "Yes".
//
// Reset first:  npm run fleet-prep -- --feature issues-u44b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u44b PROBE_AGENT=u44b node bin/probe.js all shared/playwright/checks/issues/article-own-urn-refused-as-in-use/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44b-3_5 PROBE_AGENT=u44b node bin/probe.js all shared/playwright/checks/issues/article-own-urn-refused-as-in-use/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {createVersion, publishLatest} = require('../minor-version-new-galley-dois/lib');
const {createVersion35, publish35} = require('../major-version-earlier-doi-stays-registered/lib');
const {PREFIX, setUpUrn, openIdentifiers, saveUrn} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {kind: 'Articles', first: 5, versioned: 17, other: 6, neighbour: 9},
    omp: {kind: 'Monographs', first: 4, versioned: 14, other: null, neighbour: 7},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    if (!a) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    const stable35 = app.line === 'stable-3_5_0';
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    // Reads for the facts, not steps.
    const currentPub = (sid) => Number(sql(app, `select max(publication_id) from publications where submission_id = ${sid}`).trim());
    const storedUrns = () =>
        sql(app, `select p.submission_id, p.publication_id, ps.setting_value from publication_settings ps join publications p on p.publication_id = ps.publication_id where ps.setting_name = 'pub-id::other::urn' order by 2`)
            .split('\n')
            .filter(Boolean);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const step = async (label, sid, pubId, urn) => {
        const ids = await openIdentifiers(page, app, frame, sid, pubId);
        const shown = await ids.box().inputValue();
        const out = {submission: sid, publication: pubId, shown, ...(await saveUrn(page, app, frame, ids, urn))};
        fact(label, out);
        record(name(label.replace(/\s+/g, '-')), await screen(page));
        return {ids, out};
    };

    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, a.kind));

        if (MODE === 'neighbour') {
            if (a.other) await step('12 other saves', a.other, currentPub(a.other), `${PREFIX}u44b6`);
            else await step('12 other saves', a.first, currentPub(a.first), `${PREFIX}u44b6`);
            const n = await step('N neighbour takes it', a.neighbour, currentPub(a.neighbour), `${PREFIX}u44b6`);
            fact('neighbour verdict', {refused: !n.out.saved && n.out.status === 400, stored: storedUrns()});
            return;
        }

        // 4-6
        const p5 = currentPub(a.first);
        const {ids: ids5} = await step('5 first save', a.first, p5, `${PREFIX}u44b5`);
        const again = {submission: a.first, publication: p5, ...(await saveUrn(page, app, frame, ids5, null))};
        fact('6 save again', again);
        record(name('6-save-again'), await screen(page));

        // 7-11
        await frame.gotoEditorial(a.versioned);
        await frame.expectVersionLoaded().catch(() => {});
        const v1 = stable35 ? await createVersion35(page, frame) : await createVersion(page, frame, 'Minor Revision');
        fact('7 create', v1);
        const p11 = stable35 ? currentPub(a.versioned) : v1.id;
        await step('8 new version save', a.versioned, p11, `${PREFIX}u44b17`);
        await frame.gotoEditorial(a.versioned);
        await frame.expectVersionLoaded().catch(() => {});
        if (stable35) {
            fact('9 publish', await publish35(page, 'Publish'));
        } else {
            const ojsScreen = app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
            fact('9 publish', await publishLatest(page, frame, 'Publish', ojsScreen));
        }
        await frame.gotoEditorial(a.versioned);
        await frame.expectVersionLoaded().catch(() => {});
        const v2 = stable35 ? await createVersion35(page, frame) : await createVersion(page, frame, 'Minor Revision');
        fact('10 create', v2);
        const p12 = stable35 ? currentPub(a.versioned) : v2.id;
        const s11 = await step('11 inherited save', a.versioned, p12, null);

        // 12-13
        let s13 = null;
        if (a.other) {
            await step('12 other saves', a.other, currentPub(a.other), `${PREFIX}u44b6`);
            s13 = (await step('13 duplicate', a.first, p5, `${PREFIX}u44b6`)).out;
        }
        fact('verdict', {
            saveAgainRefused: !again.saved,
            inheritedShown: s11.out.shown,
            inheritedRefused: !s11.out.saved,
            duplicateAccepted: s13 ? s13.saved : null,
            stored: storedUrns(),
        });
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
