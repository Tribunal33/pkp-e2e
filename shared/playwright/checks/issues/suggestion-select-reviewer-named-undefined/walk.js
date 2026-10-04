// Walk of U31 A8 (issue report docs/issues/U31-A8-suggestion-select-reviewer-named-undefined.md):
// in the Add Reviewer window's "Select a Reviewer from Reviewer Suggestions" list, read each
// "Select Reviewer" button's accessible name against "Locate a Reviewer"'s. OJS and OMP (OPS has no
// review stage). On PKP's default test dataset, fleet reset first:
//   PROBE_FEATURE=issues-q4 PROBE_AGENT=q4 node bin/probe.js all shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/walk.js
// (ONLY=ojs,omp; `all` skips OPS by itself). Neighbour (WALK_MODE=nb, alone, on the state a walk
// left): the "Locate a Reviewer" names, the suggestion buttons' visible text and the workflow
// panel's "{name} More Actions" names, to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const tagged = (n) => `a8-${n}`;

forEachApp(async (app) => {
    if (!H.WORDS[app.name]) return note(`a8 ${app.name}: no review stage, skipped`);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            await signIn(page, 'dbarnes');
            const id = H.submissionId(app);
            facts.id = id;
            await H.openReviewRound(page, app, id);
            facts.panelMenus = (await page.getByRole('button', {name: / More Actions$/}).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.innerText.trim()))).slice(0, 6);
            const modal = await H.openAddReviewer(page);
            facts.list = await H.readSuggestionList(page, modal);
            facts.locate = await H.readLocate(page, modal);
            await H.snap(page, tagged('nb-window'));
            await H.closeAddReviewer(page);
            note(`a8 ${facts.line} nb ${app.name}: suggestion buttons ${JSON.stringify(facts.list.rows.map((r) => r.buttons))}; locate ${JSON.stringify(facts.locate.map((l) => l.buttons))}; menus ${JSON.stringify(facts.panelMenus)}`);
            record(tagged('nb-facts'), facts);
            await signOut(page);
            return;
        }

        // 1-2
        await signIn(page, 'rvaca');
        facts.setting = await H.enableSuggestions(page, app);
        await H.snap(page, tagged('s2-setting'));
        await signOut(page);

        // 3-7
        await signIn(page, H.WORDS[app.name].author);
        facts.submission = await H.submitWithSuggestions(page, app);
        await H.snap(page, tagged('s7-submitted'));
        await signOut(page);

        // 8-9
        await signIn(page, 'dbarnes');
        facts.decision = await H.sendToReview(page, app, facts.submission.id);
        facts.round = await H.openReviewRound(page, app, facts.submission.id);
        await H.snap(page, tagged('s9-review-stage'));

        // 10-11
        const modal = await H.openAddReviewer(page);
        facts.list = await H.readSuggestionList(page, modal);
        facts.locate = await H.readLocate(page, modal);
        await H.snap(page, tagged('s11-add-reviewer'));
        facts.namedUndefined = await modal.getByRole('button', {name: 'Select undefined'}).count();
        facts.namedByName = {};
        for (const s of H.SUGGESTIONS) {
            const n = `${s.givenName} ${s.familyName}`;
            facts.namedByName[n] = await modal.getByRole('button', {name: `Select ${n}`, exact: true}).count();
        }
        await H.closeAddReviewer(page);

        note(`a8 ${facts.line} ${MODE} ${app.name}: suggestion buttons ${JSON.stringify(facts.list.rows.map((r) => r.buttons))}; "Select undefined" x${facts.namedUndefined}; by name ${JSON.stringify(facts.namedByName)}; locate ${JSON.stringify(facts.locate.map((l) => [l.name, l.buttons]))}`);
        record(tagged('facts'), facts);
        await signOut(page);
    } catch (e) {
        facts.error = H.flat(e.stack || e.message, 800);
        await H.snap(page, tagged('error'));
        record(tagged('facts'), facts);
        note(`a8 ${facts.line} ${MODE} ${app.name}: ERROR ${facts.error}`);
    } finally {
        await close();
    }
});
