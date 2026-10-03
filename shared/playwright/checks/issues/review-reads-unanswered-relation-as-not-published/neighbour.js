// Neighbour check of the fix for issue report U75 A9
// (docs/issues/U75-A9-review-reads-unanswered-relation-as-not-published.md), OPS only: what the fix
// must leave alone. ccorino starts a draft and, on "For Readers", answers in turn
// "This preprint has not been published elsewhere.", "This preprint's relations have not been
// entered." and "This preprint has been published elsewhere." (no DOI); after each, "Review"'s
// "Relation status" panel must read the answer given. The steps themselves are walked by
// ../preprint-submits-without-required-relation-status/walk.js.
//
//   npm run fleet-prep -- --feature issues-u75r4 --dataset 4 --apps ops --reset
//   PROBE_FEATURE=issues-u75r4 PROBE_AGENT=u75r4 node bin/probe.js ops shared/playwright/checks/issues/review-reads-unanswered-relation-as-not-published/neighbour.js
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('../preprint-submits-without-required-relation-status/lib.js');
const W = require('../wizard-refused-save-hangs-saving/lib.js');

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', answers: []};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: H.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `u75a9-nb-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
    };
    try {
        await signIn(page, H.AUTHOR);
        o.id = await H.beginSubmission(page, app, {title: 'u75r4 relation answers', section: 'Preprints'});
        let first = true;
        for (const key of ['none', 'unknown', 'published']) {
            if (first) {
                await H.toReview(page, app, {relation: H.RELATION[key]});
                first = false;
            } else {
                // the rail's "For Readers", the choice, "Continue" to "Review"
                await page.locator('.pkpSteps__step__label').filter({hasText: /For Readers\s*$/}).first().click();
                await page.locator('.pkpSteps__step__label--current').filter({hasText: /For Readers\s*$/}).waitFor({timeout: H.T});
                await page.getByRole('radio', {name: H.RELATION[key], exact: true}).check();
                await idle(page);
                await W.pressContinue(page);
                await idle(page);
                await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: H.T}).catch(() => {});
                await H.sleep(500);
            }
            const r = await H.readReviewRelation(page);
            o.answers.push({answered: H.RELATION[key], line: r.line, banner: r.review.banner, submit: r.review.controls.submit});
            await snap(`review-${key}`, r);
        }
    } catch (e) {
        o.error = H.flat(e.stack || e.message, 800);
        await snap('error', {error: o.error});
    } finally {
        record('u75a9-nb-facts', o);
        console.log(JSON.stringify(o, null, 1));
        await close();
    }
});
