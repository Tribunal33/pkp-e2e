// PR review of pkp/pkp-lib#13308 (pkp/ui-library#982, pkp/pkp-lib#13318, pkp/ojs#5812): the
// References page's progress box counts every reference and treats a failed lookup (FAILED, -1) as
// finished; a failed row carries the badge "Metadata lookup failed"; once every reference has
// finished with at least one failed, the box reads "{processed} of {total} references processed,
// {failed} incomplete" with its own description, and the page stops refreshing itself.
//
// A real FAILED takes eight retries over about 21 hours (CitationLookupJob), so the SQL stands in for
// it: it writes what CitationLookupJob::failed() stores (processingStatus -1), and PROCESSED (5) as
// IsProcessedJob::handle() stores it. Every other database call is a read. Runs as `dbarnes` on PKP's
// default dataset for `main`, on the submission of ../../issues/citation-author-row-kept-after-close/lib.js
// SUBMISSION. Names tagged u42r8.
//
// Reset first:  npm run fleet-prep -- --feature sync --dataset 7 --reset
// Run:          PROBE_FEATURE=sync PROBE_AGENT=pr982 node bin/probe.js <app|all> shared/playwright/checks/sync/ui-library-982/failed.js
// Before (tip): PROBE_RUN=tip, the same; at the PR head: PROBE_RUN=pr.
// Facts: .reports/sync/pr982/failed-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, shot, idle, sql} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const LINES = ['one', 'two', 'three', 'four', 'five'].map((n) => `u42r8 Reference ${n}. Test Press; 2020.`);
const FAILED = -1; // CitationProcessingStatus::FAILED, what CitationLookupJob::failed() stores
const PROCESSED = 5; // CitationProcessingStatus::PROCESSED, what IsProcessedJob::handle() stores

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('failed.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 600)}`);
    };
    const {page, close} = await launch(app);
    const gets = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/submissions\/\d+/.test(r.url())) gets.push(Date.now());
    });
    const refreshes = async (ms) => {
        const t0 = Date.now();
        await L.sleep(ms);
        return gets.filter((t) => t >= t0).length;
    };
    /** The box: its title and description, or null (any title, the PR adds a third wording). */
    const box = async () => {
        const holder = page.locator('div.align-middle').filter({has: page.locator('span.font-semibold')}).filter({hasText: /references/i}).first();
        if (!(await holder.isVisible().catch(() => false))) return null;
        return L.flat(await holder.innerText(), 400);
    };
    const rows = async (refs) =>
        refs.rows().evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td, th') || tr).innerText.replace(/\s+/g, ' ').trim().slice(0, 140)));
    const setStatus = (lines, status) => {
        const list = lines.map((l) => `'${l.replace(/'/g, "''")}'`).join(', ');
        sql(app, `UPDATE citation_settings SET setting_value = '${status}' WHERE setting_name = 'processingStatus' AND citation_id IN (SELECT citation_id FROM citations WHERE raw_citation IN (${list}))`);
    };
    const reopen = async () => {
        const {pg} = await L.openPublicationPage(page, app, 'References');
        await L.sleep(1500);
        return pg;
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 400));
            await shot(page, `pr982-${key}-error${run}`).catch(() => {});
        }
    };

    try {
        await signIn(page, 'dbarnes');
        let refs;
        await step('f1', async () => fact('f1 lookup on', await L.tickMetadata(page, app, ['lookup'])));
        await step('f2', async () => {
            refs = await reopen();
            await refs.add(LINES);
            await idle(page);
            await L.sleep(1500);
            fact('f2 box after Add', await box());
        });
        // Two found, one failed for good, two still waiting.
        await step('f3', async () => {
            setStatus(LINES.slice(0, 2), PROCESSED);
            setStatus(LINES.slice(2, 3), FAILED);
            refs = await reopen();
            fact('f3 box (2 processed, 1 failed, 2 waiting)', await box());
            fact('f3 rows', await rows(refs));
            fact('f3 failed row menu', await refs.openRowMenu('u42r8 Reference three').then((i) => i.allInnerTexts()).catch((e) => `error: ${L.flat(e.message, 120)}`));
            await refs.closeRowMenu('u42r8 Reference three').catch(() => {});
            await shot(page, `pr982-f3${run}`);
            fact('f3 refresh in 22 s', await refreshes(22000));
        });
        // The other two found: every reference finished, one of them failed.
        await step('f4', async () => {
            setStatus(LINES.slice(3), PROCESSED);
            refs = await reopen();
            fact('f4 box (4 processed, 1 failed)', await box());
            fact('f4 rows', await rows(refs));
            await shot(page, `pr982-f4${run}`);
            fact('f4 refresh in 22 s', await refreshes(22000));
        });
    } finally {
        record(`failed-facts${run}`, facts);
        await close();
    }
});
