// Neighbour check for docs/issues/U19-A4-oai-last-part-offers-resume.md:
// what the fix must leave alone, on the same fleet and precondition as
// walk.js (serve.js on). No sign-in; nothing changes.
//   a. ListSets, paged one set per answer: every part before the last keeps
//      "There are more results." and a "Resume" that opens the next part;
//      the last part is the finding again (a second list, same template).
//   b. ListIdentifiers (500 per answer, not oai_max_records): the whole list
//      in one answer, no paging table at all, before and after the fix.
// Run:  PROBE_FEATURE=issues-w08 PROBE_AGENT=w08 PROBE_RUN=n node bin/probe.js all shared/playwright/checks/issues/oai-last-part-offers-resume/neighbour.js
const {forEachApp, launch, record, idle} = require('../../../probe');
const {readPart} = require('./part');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    const oai = `/index.php/${app.contextPath}/oai`;
    try {
        await page.goto(app.url(`${oai}?verb=ListSets`));
        await idle(page);
        let part = await readPart(page);
        const sets = [part];
        const resumeOpenedNext = [];
        for (let i = 0; i < 20 && part.token; i++) {
            const before = part.cursor;
            await page.getByRole('link', {name: 'Resume', exact: true}).click();
            await page.waitForLoadState('load');
            await idle(page);
            part = await readPart(page);
            sets.push(part);
            resumeOpenedNext.push(!part.error && Number(part.cursor) === Number(before) + 1);
        }
        facts.listSets = sets;
        facts.listIdentifiers = await (async () => {
            await page.goto(app.url(`${oai}?verb=ListIdentifiers&metadataPrefix=oai_dc`));
            await idle(page);
            return readPart(page);
        })();
        facts.summary = {
            setParts: sets.length,
            earlierSetPartsOfferResume: sets.slice(0, -1).every((p) => p.moreResults && p.resume && p.token),
            everyResumeOpenedNextPart: resumeOpenedNext.every(Boolean),
            lastSetPart: {moreResults: part.moreResults, resume: part.resume, token: part.token, cursor: part.cursor},
            listIdentifiers: {
                headers: facts.listIdentifiers.headers,
                moreResults: facts.listIdentifiers.moreResults,
                tokenRow: facts.listIdentifiers.tokenRow,
                resume: facts.listIdentifiers.resume,
            },
        };
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('neighbour', facts);
        await close();
    }
});
