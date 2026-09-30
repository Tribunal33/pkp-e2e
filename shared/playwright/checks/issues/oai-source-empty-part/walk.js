// Issue report walk: docs/issues/U19-A8-oai-source-empty-part.md (spec U19
// register A8). Takes the report's Steps on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"):
//   OJS: dbarnes publishes submission 5 with "Don't Assign To An Issue",
//        types "Pages" "15-20" on submission 6's "Publication Settings" and
//        publishes it the same way; then, signed out, GetRecord in oai_dc of
//        articles 5 and 6 and of article 1 (in Vol. 1 No. 2 (2014), the
//        control), reading each "Source" row.
//   OMP: signed out, ListRecords in oai_dc, each record's "Source" row.
// OPS writes no "Source" and is skipped. The kit builds nothing; the OJS
// steps change the dataset, so reset the fleet before each walk.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w11 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w11 PROBE_AGENT=w11 node bin/probe.js all shared/playwright/checks/issues/oai-source-empty-part/walk.js
// 3.5 (OMP only; OJS 3.5 cannot publish without an issue): both with PKP_E2E_LINE=stable-3_5_0 in front (feature issues-w11-3_5; PROBE_RUN=r35 ONLY=omp on the walk).
// Facts: .reports/<feature>/w11/walk[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {readSources} = require('./source');

const T = 30_000;

async function publishWithoutIssue(app, page, pub, submissionId, pages) {
    const out = {submissionId};
    await pub.gotoWorkflow(submissionId);
    await idle(page);
    if (pages) {
        // "Publication Settings" holds "Issue Assignment" too, preselected
        // to an issue, and its Save needs one: "Don't Assign To An Issue".
        await pub.openEntry('Publication Settings');
        const noIssue = page.getByRole('radio', {name: "Don't Assign To An Issue"});
        await noIssue.waitFor({state: 'visible', timeout: T});
        await pub.awaitAssignmentPreselected(page);
        await noIssue.check();
        const field = page.locator('input[name="pages"]');
        await field.waitFor({state: 'visible', timeout: T});
        await field.fill(pages);
        const saved = await pub.save();
        out.pagesSave = saved.status();
    } else {
        // The publish control sits on the Publication pages.
        await pub.openEntry('Title & Abstract');
    }
    const panel = await pub.openPublishPanel();
    await pub.fillVersionDetails(panel);
    const dontAssign = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
    out.dontAssignOffered = await dontAssign.isVisible().catch(() => false);
    if (!out.dontAssignOffered) {
        out.panel = await panel.innerText().catch(() => null);
        return out;
    }
    await dontAssign.check();
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    await confirm.waitFor({state: 'visible', timeout: T});
    const published = page.waitForResponse((r) => r.url().includes('/publish') && r.request().method() !== 'GET', {timeout: T});
    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
    out.publishStatus = (await published).status();
    await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T});
    await idle(page);
    out.statusLine = (await pub.leftControls().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    out.screen = await screen(page);
    return out;
}

async function openRecord(page, app, oaiQuery) {
    await page.goto(app.url(`/index.php/${app.contextPath}/oai?${oaiQuery}`));
    await idle(page);
    return readSources(page);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') {
        console.log('ops: no dc:source in its Dublin Core records; skipped');
        return;
    }
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null}};
    try {
        if (app.name === 'ojs') {
            // Steps 1-5: dbarnes publishes 5 and 6 in no issue.
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                const pub = new PublicationScreen(page, app.contextPath);
                facts.publish5 = await publishWithoutIssue(app, page, pub, 5, null);
                facts.publish6 = await publishWithoutIssue(app, page, pub, 6, '15-20');
            } finally {
                await close();
            }
            // Steps 6-7 and the control, signed out.
            const {page: visitor, close: closeVisitor} = await launch(app);
            try {
                const get = (id) => openRecord(visitor, app, `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/${id}`);
                facts.article5 = await get(5);
                facts.article6 = await get(6);
                facts.article1 = await get(1);
            } finally {
                await closeVisitor();
            }
            facts.summary = Object.fromEntries(['article5', 'article6', 'article1'].map((k) => [k, facts[k].error || facts[k].records.map((r) => r.source)]));
            facts.summary.publish = [facts.publish5, facts.publish6].map((p) => ({id: p.submissionId, offered: p.dontAssignOffered, status: p.publishStatus, line: p.statusLine, pagesSave: p.pagesSave}));
        } else {
            // OMP steps 1-2, signed out.
            const {page, close} = await launch(app);
            try {
                facts.listRecords = await openRecord(page, app, 'verb=ListRecords&metadataPrefix=oai_dc');
                facts.screen = await screen(page);
            } finally {
                await close();
            }
            facts.summary = facts.listRecords.records.map((r) => ({id: r.identifier, source: r.source}));
            facts.summary.push({rendered: facts.listRecords.rendered.map((t) => t.source)});
        }
        console.log(app.name, JSON.stringify(facts.summary));
    } finally {
        record('walk', facts);
    }
});
