// Walk of U58 A7 (issue report docs/issues/U58-A7-reviewer-suggestion-help-describes-contributors.md):
// as rvaca, open Settings › Workflow › "Submission" › "Author Guidance" and read the help under
// "Contributors" (control) and under "For Reviewer Suggestion", with that box's own text. OJS and
// OMP have the box; OPS is the control (no box). On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-u58g PROBE_AGENT=u58g node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-help-describes-contributors/walk.js
// Neighbour (WALK_MODE=nb, alone): every other box's label and help on "Author Guidance" in English,
// and the "For Reviewer Suggestion" help in French (fr_CA), to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');

        if (MODE === 'nb') {
            await H.openAuthorGuidance(page, app);
            const en = await H.readGuidanceBoxes(page);
            facts.en = en.error ? en : en.boxes.filter((b) => b.field !== 'reviewerSuggestionsHelp');
            record('nb-en', await screen(page));
            await H.openAuthorGuidance(page, app, 'fr_CA');
            const fr = await H.readGuidanceBoxes(page);
            facts.frReviewerSuggestions = fr.error ? fr : (fr.boxes.find((b) => b.field === 'reviewerSuggestionsHelp') || null);
            facts.frContributors = fr.error ? null : (fr.boxes.find((b) => b.field === 'contributorsHelp') || null);
            record('nb-fr', await screen(page));
            note(`u58g ${facts.line} nb ${app.name}: en ${JSON.stringify(Array.isArray(facts.en) ? facts.en.map((b) => [b.label, b.help]) : facts.en)}; fr ${JSON.stringify(facts.frReviewerSuggestions)}`);
            record('nb-facts', facts);
            await signOut(page);
            return;
        }

        // 2-3
        await H.openAuthorGuidance(page, app);
        record('s3-author-guidance', await screen(page));
        const all = await H.readGuidanceBoxes(page);
        facts.labels = all.error ? all : all.boxes.map((b) => b.label);

        // 4 (control)
        facts.contributors = all.error ? null : (all.boxes.find((b) => b.field === 'contributorsHelp') || null);

        // 5
        facts.reviewerSuggestions = all.error ? null : (all.boxes.find((b) => b.field === 'reviewerSuggestionsHelp') || null);
        if (facts.reviewerSuggestions) facts.reviewerSuggestionsBoxText = await H.boxText(page, 'reviewerSuggestionsHelp');
        facts.secondSentenceSame = !!(facts.contributors && facts.reviewerSuggestions && facts.reviewerSuggestions.help
            && facts.contributors.help.split('. ').slice(1).join('. ') === facts.reviewerSuggestions.help.split('. ').slice(1).join('. '));

        note(`u58g ${facts.line} ${MODE} ${app.name}: reviewer help ${JSON.stringify(facts.reviewerSuggestions && facts.reviewerSuggestions.help)}; same second sentence as Contributors: ${facts.secondSentenceSame}`);
        record('facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
