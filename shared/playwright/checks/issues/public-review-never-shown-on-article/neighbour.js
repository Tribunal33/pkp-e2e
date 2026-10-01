// Neighbour check for docs/issues/U13-OJS12-public-review-never-shown-on-article.md:
// on PKP's default test dataset as loaded (no review marked public), the
// published articles 1 ("Signalling Theory Dividends") and 17 ("Antimicrobial,
// heavy metal resistance …") must show no peer-review section, no "Peer review
// data is not available" line and no script error, with the fix in or out.
// Walked by trial.sh beside this file (fix in, then out).
//   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u13ojs12 node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown-on-article/neighbour.js
const {forEachApp, launch, screen, shot, record, idle} = require('../../../probe');

const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    try {
        for (const sid of [1, 17]) {
            const r = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${sid}`));
            await idle(page);
            record(`nb-article-${sid}`, await screen(page)); await shot(page, `nb-article-${sid}`);
            const body = flat(await page.locator('body').innerText(), 20000);
            facts[`article-${sid}`] = {status: r ? r.status() : null,
                section: await page.locator('#peer-review-record').count(),
                peerReviewHeading: (await page.locator('h2').allInnerTexts()).map((h) => flat(h, 60)).filter((h) => /Peer Review/i.test(h)),
                notAvailableLine: body.includes('Peer review data is not available'),
                pageErrors: [...errors]};
            console.log(`[ojs] nb article ${sid}: ${JSON.stringify(facts[`article-${sid}`])}`);
        }
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
