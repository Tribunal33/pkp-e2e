// Walk of U38 A7 (issue report docs/issues/U38-A7-file-lines-empty-name-other-language.md):
// as dbarnes, read submission 1's "Activity Log" in English, switch the interface to
// "Français (Canada)" from the initials menu, and read the same log in French. On PKP's default
// test dataset (its submissions were made in English), fleet reset first.
//
//   MODE=walk (default): the Steps. Facts: the file lines and the "assigned" lines in both languages.
//   MODE=neighbour: what the fix must leave alone. In French, a value stored in French stays French
//     (the "assigned" lines' role "Réviseur-e" on OJS and OMP), and an email line stays as sent;
//     in English, every line reads as before (compare its `english` with the walk's).
//
//   PROBE_FEATURE=issues-u38c PROBE_AGENT=u38c node bin/probe.js all shared/playwright/checks/issues/file-lines-empty-name-other-language/walk.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        // Steps 2-3: the log in English
        await H.openSubmission(page, app, c.submissionId, 'en');
        const en = await H.readLog(page, `a7-${MODE}-1-log-en`);
        // Step 4: close the submission; step 5: "Français (Canada)" in the initials menu
        facts.closedEn = await H.closeSubmission(page);
        facts.languageLink = await H.chooseLanguage(page, /^(Français \(Canada\)|français)$/, 'fr_CA');
        // Steps 6-7: the log in French
        await H.openSubmission(page, app, c.submissionId, 'fr_CA');
        const fr = await H.readLog(page, `a7-${MODE}-2-log-fr`);
        facts.labels = {en: {button: en.buttonText, title: en.title, headers: en.headers}, fr: {button: fr.buttonText, title: fr.title, headers: fr.headers}};
        const pe = H.pick(en.lines);
        const pf = H.pick(fr.lines);
        facts.counts = {en: en.lines.length, fr: fr.lines.length};
        if (MODE === 'walk') {
            facts.english = pe;
            facts.french = pf;
            facts.observed = {
                fileLinesFr: pf.file.length,
                fileLinesFrEmptyName: pf.file.filter((e) => /« »/.test(e)).length,
                fileLinesEnEmptyName: pe.file.filter((e) => /""/.test(e)).length,
                assignedFrNoName: pf.assigned.filter((e) => /^\(/.test(e)),
            };
            facts.stored = H.stored(app, c.submissionId);
        } else {
            facts.english = en.lines.map((l) => `${l.user} | ${l.event}`);
            facts.frenchAssigned = pf.assigned;
            facts.frenchEmail = fr.lines.map((l) => l.event).filter((e) => /^(Un courriel a été envoyé|An email has been sent)/.test(e));
            facts.frenchEnglishRoleWords = pf.assigned.filter((e) => /as a (Copyeditor|Author|Layout Editor|Proofreader|Section editor)|en tant que (Copyeditor|Author|Layout Editor|Proofreader|Section editor)\./.test(e));
        }
        // Back to English, as a person leaving the walk would
        facts.closedFr = await H.closeSubmission(page);
        await H.chooseLanguage(page, 'English', 'en');
        await signOut(page);
    } finally {
        record(`a7-${MODE}-facts`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
