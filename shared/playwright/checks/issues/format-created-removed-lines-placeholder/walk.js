// U38 OMP1 walk (issue report docs/issues/U38-OMP1-format-created-removed-lines-placeholder.md).
// OMP only, on PKP's default test dataset (main or stable-3_5_0). dbarnes opens book 4 "How
// Canadians Communicate", "Publication" › "Publication Formats": "Add publication format"
// "Paperback u38d" › "OK"; its "Not Available" › "OK"; its "Delete" › "OK"; then "Activity Log" ›
// "History": the created and removed lines, and the availability line beside them.
// MODE=neighbour (a fresh load, nothing created): what a fix must leave alone. Book 5 "Bomb
// Canada" (published): its approval and availability lines for "PDF"; book 4's dataset line for
// "PDF" read in English and with the interface in French (the address's fr_CA).
//
//   npm run fleet-prep -- --feature issues-u38d --dataset 4 --reset
//   PROBE_FEATURE=issues-u38d PROBE_AGENT=u38d node bin/probe.js omp shared/playwright/checks/issues/format-created-removed-lines-placeholder/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const NAME = 'Paperback u38d';
const BOOK4 = {id: 4, title: 'How Canadians Communicate'};
const BOOK5 = {id: 5, title: 'Bomb Canada'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {line: app.line || 'main', mode: MODE};
    const fact = (k, v) => { facts[k] = v; record(`${MODE}-facts`, {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const step = async (label, fn) => {
        try { const out = await fn(); fact(label, out === undefined ? 'ok' : out); return out; } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 1200)); return null; }
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'walk') {
            fact('stored.before', H.storedFormatLines(app, BOOK4.id));
            let f = null;
            await step('2-3 open book 4, Publication Formats', async () => {
                const via = await H.L.openBook(page, app, BOOK4.id, BOOK4.title);
                const r = await H.L.openFormatsPage(page, app, BOOK4.id, null);
                f = r.formats;
                record('walk-formats', await screen(page));
                return {via, page: r.via};
            });
            await step('4 add format', () => H.L.addFormat(page, f, NAME));
            await step('5 make available', () => H.makeAvailable(page, f, NAME));
            await step('6 delete format', () => H.deleteFormat(page, f, NAME));
            await step('7 history', async () => {
                const h = await H.readHistory(page, 'walk-history');
                await shot(page, 'walk-history').catch(() => {});
                return h;
            });
            fact('stored.after', H.storedFormatLines(app, BOOK4.id));
        } else {
            await step('N1 book 5 history (en)', async () => {
                await H.L.openBook(page, app, BOOK5.id, BOOK5.title);
                return H.readHistory(page, 'neighbour-book5-history');
            });
            await step('N2 book 4 history (en)', async () => {
                await H.N.openWorkflow(page, app, BOOK4.id);
                return H.readHistory(page, 'neighbour-book4-history-en');
            });
            await step('N3 book 4 history (fr_CA)', async () => {
                await page.goto('about:blank');
                await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?workflowSubmissionId=${BOOK4.id}`));
                await H.N.workflow(page).locator('[data-cy="sidemodal-header"]').waitFor({timeout: 60_000});
                await H.sleep(1500);
                await page.waitForLoadState('networkidle').catch(() => {});
                await H.N.workflow(page).getByRole('button', {name: /Activity Log|Historique|Journal/i}).first().click();
                const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
                await win.waitFor({timeout: 30_000});
                await win.getByRole('tab').first().waitFor({timeout: 30_000});
                const tabs = (await win.getByRole('tab').allInnerTexts()).map((t) => H.flat(t));
                // The history tab: the second of the window's two tabs on main ("Notes" first? read both).
                const historyTab = win.getByRole('tab').filter({hasText: /Historique|History/i}).first();
                if (await historyTab.count()) await historyTab.click();
                await win.locator('tbody tr.gridRow').first().waitFor({timeout: 30_000}).catch(() => {});
                await H.sleep(1000);
                const lines = await win.locator('tbody tr.gridRow').evaluateAll((rows) => rows.filter((tr) => tr.getClientRects().length).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
                record('neighbour-book4-history-fr', await screen(page));
                return {tabs, formatLines: lines.filter((l) => /format/i.test(l))};
            });
        }
    } finally {
        await close();
    }
});
