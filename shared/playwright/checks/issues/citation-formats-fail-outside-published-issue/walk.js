// Issue report walk: docs/issues/U13-OJS1-citation-formats-fail-outside-published-issue.md
// (spec U13 register OJS1). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"):
//   OJS  1-5  dbarnes ticks "Citation Style Language", publishes submission 5
//             with "Don't Assign To An Issue" and submission 6 with "Assign To
//             Future Issue and Publish Immediately" into "Vol. 2 No. 1 (2015)".
//        6-8  signed out: article 5 and article 6, "More Citation Formats" ›
//             "MLA", then "BibTeX".
//        9-10 ccorino (Reader), minoue (Section editor, not assigned): article 5.
//        11-12 controls: dbarnes on article 5; signed out on article 1 (in the
//             published issue Vol. 1 No. 2 (2014)).
//   OMP, OPS (control): dbarnes ticks the plugin; signed out, "MLA" and
//        "BibTeX" on a published book (OMP 5) and a posted preprint (OPS 2).
//   OJS on stable-3_5_0: steps 1-3 up to the publish panel, whose "Issue
//        Assignment" choices are recorded (3.5 publishes only through an issue).
// The kit builds nothing; the steps change the dataset, so reset the fleet
// before each walk.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs1 node bin/probe.js all shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u13ojs1 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/u13ojs1/walk[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, loc} = require('../../../probe');
const {tryFormats, enableCsl} = require('./cite');

const T = 30_000;

async function publishOjs(app, page, facts) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const one = async (id, opts) => {
        const out = {id};
        await pub.gotoWorkflow(id);
        await idle(page);
        await pub.openEntry('Title & Abstract');
        await pub.publish(opts);
        await idle(page);
        out.statusLine = (await pub.leftControls().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        return out;
    };
    // Step 3: "Don't Assign To An Issue" (publish() ticks it when no issue is named).
    facts.publish5 = await one(5, {});
    // Step 4: "Assign To Future Issue and Publish Immediately", Vol. 2 No. 1 (2015).
    facts.publish6 = await one(6, {futureIssueLabel: /Vol\. 2 No\. 1 \(2015\)/});
}

// 3.5: open the publish panel of submission 5 and record what it offers.
async function panel35(app, page, facts) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const out = {};
    try {
        await pub.gotoWorkflow(5);
        await idle(page);
        await pub.openEntry('Title & Abstract');
        const button = pub.publishButton();
        await button.waitFor({state: 'visible', timeout: T});
        out.button = (await button.innerText()).trim();
        await button.click();
        await page.locator('[data-cy="active-modal"], [role="dialog"]').last().waitFor({state: 'visible', timeout: T});
        await page.waitForTimeout(3000);
        await idle(page);
        const dlg = page.locator('[role="dialog"]:visible').last();
        out.radios = await dlg.locator('input[type=radio]').evaluateAll((els) => els.map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText.trim() : e.value)));
        out.dialogText = ((await dlg.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
        out.screen = await screen(page);
    } catch (e) {
        out.error = String(e).slice(0, 500);
        out.screen = await screen(page).catch(() => null);
    }
    facts.panel35 = out;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const line = app.line || 'main';
    const facts = {fleet: {line, dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        // Steps 1-2 (and 3-4 on OJS main), as dbarnes.
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                facts.plugin = await enableCsl(app, page);
                if (app.name === 'ojs' && line === 'stable-3_5_0') {
                    await panel35(app, page, facts);
                    return;
                }
                if (app.name === 'ojs') await publishOjs(app, page, facts);
            } finally {
                await close();
            }
        }
        const as = async (who, key, articleId) => {
            const {page, close} = await launch(app);
            try {
                if (who) await signIn(page, who);
                facts[key] = await tryFormats(app, page, articleId, `${key}`);
            } finally {
                await close();
            }
        };
        if (app.name === 'ojs') {
            await as(null, 'visitor-article5', 5);       // steps 6-7
            await as(null, 'visitor-article6', 6);       // step 8
            await as('ccorino', 'ccorino-article5', 5);  // step 9
            await as('minoue', 'minoue-article5', 5);    // step 10
            await as('dbarnes', 'dbarnes-article5', 5);  // step 11 (control)
            await as(null, 'visitor-article1', 1);       // step 12 (control)
        } else {
            await as(null, `visitor-${app.name === 'omp' ? 'book5' : 'preprint2'}`, app.name === 'omp' ? 5 : 2);
        }
        facts.summary = Object.fromEntries(Object.entries(facts)
            .filter(([k, v]) => v && v.format)
            .map(([k, v]) => [k, {format: `${v.format.status} changed=${v.format.changed}`, download: v.download.file || `${v.download.status} ${v.download.pageText}`}]));
        if (facts.publish5) facts.summary.publish = [facts.publish5.statusLine, facts.publish6.statusLine];
        console.log(app.name, line, JSON.stringify(facts.summary, null, 1));
    } finally {
        record('walk', facts);
    }
});
