// Issue reports U75 A8 (docs/issues/U75-A8-preprint-submits-without-required-relation-status.md) and
// U75 A9 (docs/issues/U75-A9-review-reads-unanswered-relation-as-not-published.md), OPS only.
// PKP's default test dataset, as a person on screen:
//   1-3  ccorino: "New Submission", title "u75r4 relation never answered", "Preprints", the boxes, "Begin Submission"
//   4-6  a PDF galley on "Upload Files", an abstract on "Details", "Contributors" as it is
//   7    "For Readers": "Relation status * Required" left unanswered; "Continue"
//   8    "Review": the "Relation status" panel's line (A9), the problems banner and "Submit" (A8)
//   9    "Submit", "Submit" in the confirmation (A8)
//   10   dbarnes: the new submission, "Title & Abstract", "Relations": which choice is ticked
//   11   "Post": the window's "Related Publication" line (A9's control), closed without posting
// MODE=neighbour (A8 fix's neighbour): a second draft answered "This preprint's relations have not been
//   entered." on "For Readers" reaches "Review" without a problem and submits.
//
//   npm run fleet-prep -- --feature issues-u75r4 --dataset 4 --apps ops --reset
//   PROBE_FEATURE=issues-u75r4 PROBE_AGENT=u75r4 node bin/probe.js ops shared/playwright/checks/issues/preprint-submits-without-required-relation-status/walk.js
//   (MODE=neighbour in front for the neighbour; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: H.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `u75a8-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    try {
        await signIn(page, H.AUTHOR);
        const title = MODE === 'walk' ? 'u75r4 relation never answered' : 'u75r4 relations not entered';
        o.id = await H.beginSubmission(page, app, {title, section: 'Preprints'});
        await snap('begun', {id: o.id});
        const relation = MODE === 'walk' ? null : H.RELATION.unknown;
        o.forReaders = await H.toReview(page, app, {relation});
        await loc(page, 'Review: the "Relation status" panel', page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('#review-relation')}));
        o.review = await H.readReviewRelation(page);
        await snap('review', o.review);
        o.submit = await H.submitIfOffered(page).catch((e) => ({error: H.flat(e.message, 300)}));
        await snap('after-submit', o.submit);
        if (MODE === 'walk') {
            await signOut(page);
            await signIn(page, H.EDITOR);
            o.relations = await H.readRelations(page, app, o.id).catch((e) => ({error: H.flat(e.message, 300)}));
            await snap('relations', o.relations);
            o.postWindow = await H.readPostWindow(page).catch((e) => ({error: H.flat(e.message, 300)}));
            await snap('post-window', o.postWindow);
        }
    } catch (e) {
        o.error = H.flat(e.stack || e.message, 800);
        await snap('error', {error: o.error});
    } finally {
        record(`u75a8-${MODE}-facts`, o);
        console.log(JSON.stringify(o, null, 1).slice(0, 4000));
        await close();
    }
});
