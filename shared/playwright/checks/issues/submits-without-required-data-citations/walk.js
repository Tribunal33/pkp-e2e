// Issue report U42 A9 (docs/issues/U42-A9-submits-without-required-data-citations.md), OJS, OMP and OPS.
// PKP's default test dataset for main, as a person on screen:
//   1-3   rvaca: Settings › Workflow › Submission › "Metadata", "Data Citations" at "Require…", "Save"
//   4-8   the author (ccorino; OMP aclark): "New Submission" "u42r1 no data citation", a file, an
//         abstract, the Data section left empty, the other steps
//   9     "Review": the "Data Citations" item, the problems banner and "Submit"
//   10    "Submit", "Submit" in the confirmation
//   11-13 control: rvaca sets "References" at "Require…"; the author's second submission
//         "u42r1 no references" reaches "Review" with the box empty: its "References" item and "Submit"
// MODE=neighbour (the fix's neighbour; a fresh install): steps 1-6, then "Add Data Citation"
//   "u42r1 ocean dataset" on "Details", and "Review" / "Submit" as above: it must still submit.
//
//   npm run fleet-prep -- --feature issues-u42r1 --dataset 1 --apps ojs --reset
//   PROBE_FEATURE=issues-u42r1 PROBE_AGENT=u42r1 node bin/probe.js ojs shared/playwright/checks/issues/submits-without-required-data-citations/walk.js
//   (MODE=neighbour in front for the neighbour; PROBE_RUN=<tag> keeps a run's records apart)
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const author = H.AUTHORS[app.name];
    const {page, close} = await launch(app);
    const checks = H.watchSubmitChecks(page);
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: H.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `u42a9-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const stored = (id) => {
        try {
            return sql(app, `select s.status, s.submission_progress, (select count(*) from data_citations d where d.publication_id = s.current_publication_id) from submissions s where s.submission_id = ${Number(id)}`);
        } catch (e) { return `sql: ${H.flat(e.message, 200)}`; }
    };
    try {
        // 1-3
        await signIn(page, H.MANAGER);
        o.setting = await H.requireSetting(page, app, 'dataCitations');
        await snap('setting-data-citations', o.setting);
        await signOut(page);
        // 4-8
        await signIn(page, author.author);
        const title = MODE === 'walk' ? 'u42r1 no data citation' : 'u42r1 with a data citation';
        o.id = await H.beginSubmission(page, app, app.contextPath, {title, section: author.section});
        await snap('begun', {id: o.id});
        const onDetails = MODE === 'neighbour' ? (p) => H.addDataCitation(p, {title: 'u42r1 ocean dataset'}) : null;
        o.details = await H.toReview(page, app, {onDetails});
        // 9
        o.review = {
            dataCitations: await H.readReviewItem(page, 'Data Citations'),
            page: await H.readReview(page),
            checks: checks.slice(),
        };
        await snap('review', o.review);
        // 10
        o.submit = await H.submitIfOffered(page).catch((e) => ({error: H.flat(e.message, 300)}));
        await snap('after-submit', o.submit);
        o.storedAfter = stored(o.id);
        if (MODE === 'walk') {
            // 11-13: the control
            await signOut(page);
            await signIn(page, H.MANAGER);
            o.controlSetting = await H.requireSetting(page, app, 'references');
            await snap('setting-references', o.controlSetting);
            await signOut(page);
            await signIn(page, author.author);
            o.controlId = await H.beginSubmission(page, app, app.contextPath, {title: 'u42r1 no references', section: author.section});
            const from = checks.length;
            o.controlDetails = await H.toReview(page, app);
            o.control = {
                references: await H.readReviewItem(page, 'References'),
                dataCitations: await H.readReviewItem(page, 'Data Citations'),
                page: await H.readReview(page),
                checks: checks.slice(from),
            };
            await snap('control-review', o.control);
        }
    } catch (e) {
        o.error = H.flat(e.stack || e.message, 800);
        await snap('error', {error: o.error});
    } finally {
        o.checks = checks;
        record(`u42a9-${MODE}-facts`, o);
        console.log(JSON.stringify(o, null, 1).slice(0, 6000));
        await close();
    }
});
