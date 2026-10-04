// Walk of U31 A9 (issue report docs/issues/U31-A9-suggestion-added-reviewer-leaves-blank-row.md):
// in the Add Reviewer window's "Select a Reviewer from Reviewer Suggestions" list, turn Nova
// Newcomer's suggestion into a reviewer through the inner "Add Reviewer" window and read the list's
// rows; then close and reopen the window (control). OJS and OMP (OPS has no review stage). On PKP's
// default test dataset, fleet reset first:
//   PROBE_FEATURE=issues-q4 PROBE_AGENT=q4 node bin/probe.js all shared/playwright/checks/issues/suggestion-added-reviewer-leaves-blank-row/walk.js
// Neighbour (WALK_MODE=nb, alone, on the state a walk left): the reopened window's suggestions list
// (Kim Keeper still pending, with her button), Nova under "Locate a Reviewer" with the assigned
// notice, and the Reviewers panel, to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const H = require('../suggestion-select-reviewer-named-undefined/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const tagged = (n) => `a9-${n}`;
const NOVA = 'Nova Newcomer';

const rowsBrief = (list) => (list.heading ? list.rows.map((r) => `${r.text ? r.text.slice(0, 40) : '(empty)'}[${r.height}px]`) : ['(no list)']);

async function reviewersPanel(page) {
    return page.locator('[role="dialog"]:visible').first().getByRole('table').filter({hasText: /Reviewer/}).first()
        .evaluate((t) => [...t.querySelectorAll('tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)))
        .catch(() => null);
}

forEachApp(async (app) => {
    if (!H.WORDS[app.name]) return note(`a9 ${app.name}: no review stage, skipped`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            await signIn(page, 'dbarnes');
            const id = H.submissionId(app);
            facts.id = id;
            await H.openReviewRound(page, app, id);
            facts.reviewers = await reviewersPanel(page);
            const modal = await H.openAddReviewer(page);
            facts.list = await H.readSuggestionList(page, modal);
            facts.novaLocated = await H.readLocate(page, modal, {n: 1, phrase: 'Newcomer'});
            await H.snap(page, tagged('nb-window'));
            await H.closeAddReviewer(page);
            note(`a9 ${facts.line} nb ${app.name}: list ${JSON.stringify(rowsBrief(facts.list))}; Nova located ${JSON.stringify(facts.novaLocated)}; reviewers ${JSON.stringify(facts.reviewers)}`);
            record(tagged('nb-facts'), facts);
            await signOut(page);
            return;
        }

        // 1-2
        await signIn(page, 'rvaca');
        facts.setting = await H.enableSuggestions(page, app);
        await signOut(page);

        // 3-7
        await signIn(page, H.WORDS[app.name].author);
        facts.submission = await H.submitWithSuggestions(page, app);
        await signOut(page);

        // 8-9
        await signIn(page, 'dbarnes');
        facts.decision = await H.sendToReview(page, app, facts.submission.id);
        facts.round = await H.openReviewRound(page, app, facts.submission.id);

        // 10
        let modal = await H.openAddReviewer(page);
        facts.before = await H.readSuggestionList(page, modal);
        await H.snap(page, tagged('s10-list-before'));

        // 11-13
        facts.add = await H.addFromSuggestion(page, modal, NOVA, H.NOVA_USERNAME);
        facts.after = await H.readSuggestionList(page, modal);
        await H.snap(page, tagged('s13-list-after-add'));

        // 14 (control)
        await H.closeAddReviewer(page);
        facts.reviewers = await reviewersPanel(page);
        modal = await H.openAddReviewer(page);
        facts.reopened = await H.readSuggestionList(page, modal);
        await H.snap(page, tagged('s14-list-reopened'));
        await H.closeAddReviewer(page);

        note(`a9 ${facts.line} ${MODE} ${app.name}: before ${JSON.stringify(rowsBrief(facts.before))}; add ${JSON.stringify({grid: facts.add.gridStatus, refetch: facts.add.refetch && facts.add.refetch.status, windows: facts.add.windowsAfter, notice: facts.add.notice})}; after ${JSON.stringify(rowsBrief(facts.after))}; reopened ${JSON.stringify(rowsBrief(facts.reopened))}; reviewers ${JSON.stringify(facts.reviewers)}`);
        record(tagged('facts'), facts);
        await signOut(page);
    } catch (e) {
        facts.error = H.flat(e.stack || e.message, 800);
        await H.snap(page, tagged('error'));
        record(tagged('facts'), facts);
        note(`a9 ${facts.line} ${MODE} ${app.name}: ERROR ${facts.error}`);
    } finally {
        await close();
    }
});
