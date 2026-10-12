// Issue report docs/issues/U45-A2-A9-unfinished-doi-assigned.md (U45 A2, A9):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as
// the dataset's `dbarnes`, on its own context `publicknowledge`, with the
// dataset's own submissions. The kit builds nothing.
//
// "None":
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" 10.1234
//      (the dataset has none), "DOI Format" "None - …", "Save"
//   3. "DOIs": tick the two "None" items, "Bulk Actions" › "Assign DOIs",
//      confirm "Assign DOIs"
//   4. expand each row, read its DOI
//   5. the published item's reader page: its "DOI" line
// "Custom pattern":
//   6. "Setup": "DOI Format" "Custom pattern - (not recommended)", the
//      "Submissions" box the app's pattern (below), "Save"
//   7. "DOIs": tick the two "Custom pattern" items, "Assign DOIs", confirm
//   8. expand each row, read its DOI
// Besides the screens it reads the stored `dois` rows after each group.
//
// With WALK=neighbour it takes the paths the fix must leave alone, on
// other items: "Default" (an eight-character suffix), a "Custom pattern"
// whose symbols every item fills ("%j.%a" / "%p.%m"), and under "None" a
// DOI typed by hand on the DOIs page ("Edit", type, "Save").
//
// With WALK=issue (OJS only) it takes the report's issue steps, on a fresh
// dataset: "Setup" with "Issues" ticked under "Items with DOIs", "DOI
// Format" "None" and "Automatic DOI Assignment" "Never"; Issues › "Future
// Issues" › "Vol. 2 No. 1 (2015)" › "Publish Issue" › "OK"; "DOIs" ›
// "Issues": that issue's DOI; then "Assign DOIs" on "Vol. 1 No. 2 (2014)";
// then the published issue's reader page.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/unfinished-doi-assigned/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature>-3_5 --dataset <n> --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/unfinished-doi-assigned/walk.js
// Facts: .reports/<feature>/<agent>/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 20_000;
const NEIGHBOUR = process.env.WALK === 'neighbour';
const ISSUE = process.env.WALK === 'issue';
const FUTURE_ISSUE = {id: 2, name: 'Vol. 2 No. 1 (2015)'};
const BACK_ISSUE = {id: 1, name: 'Vol. 1 No. 2 (2014)'};
const PREFIX = '10.1234';

const ITEMS = {
    ojs: {
        none: [17, 15],
        noneReader: '/article/view/17',
        pattern: '%j.%p',
        custom: [1, 5],
        // neighbour
        // on 3.5 the journal's DOIs page lists only works past review
        nbDefault: [6],
        nbPattern: '%j.%a',
        nbCustom: [9],
        nbTyped: 3,
    },
    omp: {
        none: [5, 4],
        noneReader: '/catalog/book/5',
        pattern: '%p.%x',
        custom: [14, 7],
        nbDefault: [11],
        nbPattern: '%p.%m',
        nbCustom: [13],
        nbTyped: 1,
    },
    ops: {
        none: [2, 5],
        noneReader: '/preprint/view/2',
        pattern: '%j.%x',
        custom: [8, 9],
        nbDefault: [10],
        nbPattern: '%j.%a',
        nbCustom: [11],
        nbTyped: 12,
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const items = ITEMS[app.name];
    const {DoiSettings, DoisPage, recordNotices, readerDoiItem} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line || 'main', mode: NEIGHBOUR ? 'neighbour' : ISSUE ? 'issue' : 'walk', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const name = (s) => `${NEIGHBOUR ? 'nb-' : ISSUE ? 'issue-' : ''}${s}`;
    if (ISSUE && app.name !== 'ojs') {
        console.log(`[fact] ${app.name} issue mode: OJS only, nothing driven`);
        return;
    }
    const storedDois = (ids) =>
        sql(
            app,
            `select p.submission_id, d.doi, d.status from publications p join submissions s on s.current_publication_id = p.publication_id left join dois d on d.doi_id = p.doi_id where p.submission_id in (${ids.join(',')}) order by 1`
        );

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);

    /** "Setup": optional prefix, a "DOI Format" radio, an optional "Submissions" pattern, "Save". */
    const setFormat = async (label, format, pattern) => {
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        await settings.formatRadio(format).check();
        if (pattern !== undefined) {
            // the "Submissions" box of "Custom DOI Suffix Pattern" (read in the Setup form: on 3.5 the group has no name)
            const box = settings.setup.getByRole('textbox', {name: 'Submissions', exact: true});
            await expect(box).toBeVisible({timeout: T});
            await box.fill(pattern);
        }
        const r = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact(`${label} save`, {status: r.status(), format, pattern: pattern ?? null});
        record(name(`${label}-setup-saved`), await screen(page));
    };

    /** Expand a row and read its DOI table: [{type, doi}]. */
    const readRow = async (id, type = 'submission') => {
        const row = dois.row(id, type);
        await dois.expand(row, id);
        const types = await dois.doiTypes(row);
        const out = [];
        for (const type of types) out.push({type, doi: await dois.doiBox(row, type).inputValue(), badge: (await dois.doiBadge(row, type).innerText().catch(() => '')).trim()});
        await dois.collapse(row, id);
        return out;
    };

    /** "DOIs": tick `ids`, "Assign DOIs", confirm; read the answer, any failure window, the notices, the rows. */
    const assign = async (label, ids) => {
        await dois.goto();
        const response = await dois.runBulk('Assign DOIs', ids);
        const body = await response.text().catch(() => '');
        let failed = null;
        if (await dois.failedDialog().isVisible().catch(() => false)) {
            failed = (await dois.failedDialog().innerText()).replace(/\s+/g, ' ').trim();
            record(name(`${label}-failed-window`), await screen(page));
            await shot(page, name(`${label}-failed-window`)).catch(() => {});
            await dois.closeFailedDialog();
        }
        await page.waitForTimeout(500);
        const notices = await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []]);
        const rows = {};
        for (const id of ids) rows[id] = await readRow(id);
        record(name(`${label}-dois`), await screen(page));
        await shot(page, name(`${label}-dois`)).catch(() => {});
        fact(`${label} assign`, {status: response.status(), body: body.slice(0, 600), failedWindow: failed, notices, rows});
        fact(`${label} stored`, storedDois(ids));
    };

    try {
        await signIn(page, 'dbarnes');
        if (ISSUE) {
            // "Setup": "Issues" ticked, "None", "Never"
            await settings.goto('Setup');
            if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
            await settings.setup.getByRole('checkbox', {name: 'Issues', exact: true}).check();
            await settings.formatRadio('None').check();
            await settings.creationTimeSelect().selectOption({label: 'Never'});
            const saved = await settings.pressSave(settings.setup);
            await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
            fact('i1 save', {status: saved.status(), kinds: await settings.kinds().catch((e) => String(e).slice(0, 120)), creationTime: await settings.creationTimeShown()});
            record(name('i1-setup-saved'), await screen(page));

            // Issues › "Future Issues" › "Publish Issue" › "OK"
            const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
            const issues = new IssuesAdmin(page, app.contextPath);
            await issues.goto('Future Issues');
            const win = await issues.openPublish(FUTURE_ISSUE.name);
            record(name('i2-publish-window'), await screen(page));
            await win.ok();
            fact('i2 published', {issue: FUTURE_ISSUE.name});

            // "DOIs" › "Issues": the published issue's DOI
            const issueRows = () => sql(app, 'select i.issue_id, d.doi, d.status from issues i left join dois d on d.doi_id = i.doi_id order by 1');
            fact('i2 stored', issueRows());
            await dois.goto();
            await dois.openTab('Issues');
            const futureRow = dois.row(FUTURE_ISSUE.id, 'issue');
            await dois.expand(futureRow, FUTURE_ISSUE.id);
            fact('i3 issue row', {
                types: await dois.doiTypes(futureRow),
                boxes: await dois.expanded(futureRow).locator('input[type="text"]').evaluateAll((bs) => bs.map((b) => b.value)),
                text: (await futureRow.innerText()).replace(/\s+/g, ' ').trim(),
            });
            record(name('i3-issue-dois'), await screen(page));
            await shot(page, name('i3-issue-dois')).catch(() => {});
            await dois.collapse(futureRow, FUTURE_ISSUE.id);

            // the Issues tab's own "Assign DOIs", on the issue the dataset published
            const response = await dois.runBulk('Assign DOIs', [BACK_ISSUE.id], {type: 'issue', list: 'issues'});
            let failed = null;
            if (await dois.failedDialog().isVisible().catch(() => false)) {
                failed = (await dois.failedDialog().innerText()).replace(/\s+/g, ' ').trim();
                await dois.closeFailedDialog();
            }
            await page.waitForTimeout(500);
            const backRow = dois.row(BACK_ISSUE.id, 'issue');
            await dois.expand(backRow, BACK_ISSUE.id);
            fact('i4 assign', {
                status: response.status(),
                body: (await response.text().catch(() => '')).slice(0, 400),
                failedWindow: failed,
                notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []]),
                boxes: await dois.expanded(backRow).locator('input[type="text"]').evaluateAll((bs) => bs.map((b) => b.value)),
                text: (await backRow.innerText()).replace(/\s+/g, ' ').trim(),
            });
            record(name('i4-issue-assign'), await screen(page));
            await shot(page, name('i4-issue-assign')).catch(() => {});
            fact('i4 stored', issueRows());

            // the issue's reader page: its DOI link
            await page.goto(`/index.php/${app.contextPath}/issue/view/${FUTURE_ISSUE.id}`);
            await idle(page);
            fact('i5 issue page', {
                url: page.url(),
                doiLinks: await page.locator('a[href*="doi.org"]').evaluateAll((as) => as.map((a) => `${a.textContent.trim()} -> ${a.getAttribute('href')}`)),
            });
            record(name('i5-issue-page'), await screen(page));
        } else if (!NEIGHBOUR) {
            // "None": steps 2-5
            await setFormat('2', 'None');
            await assign('3-none', items.none);
            await page.goto(`/index.php/${app.contextPath}${items.noneReader}`);
            await idle(page);
            const doiItem = readerDoiItem(page);
            const bodyText = await page.locator('body').innerText();
            fact('5 reader', {
                url: page.url(),
                doiItem: (await doiItem.count()) ? (await doiItem.first().innerText()).replace(/\s+/g, ' ').trim() : null,
                doiLinks: await page.locator('a[href*="doi.org"]').evaluateAll((as) => as.map((a) => `${a.textContent.trim()} -> ${a.getAttribute('href')}`)),
                doiLines: bodyText.split('\n').filter((l) => /doi/i.test(l)).map((l) => l.trim()).slice(0, 6),
            });
            record(name('5-reader'), await screen(page));
            await shot(page, name('5-reader')).catch(() => {});

            // "Custom pattern": steps 6-8
            await setFormat('6', 'Custom pattern', items.pattern);
            await assign('7-custom', items.custom);
        } else {
            // the paths the fix must leave alone
            await setFormat('n1', 'Default');
            await assign('n1-default', items.nbDefault);
            await setFormat('n2', 'Custom pattern', items.nbPattern);
            await assign('n2-custom-filled', items.nbCustom);
            await setFormat('n3', 'None');
            await dois.goto();
            const row = dois.row(items.nbTyped);
            await dois.expand(row, items.nbTyped);
            const type = (await dois.doiTypes(row))[0];
            await dois.startEditing(row);
            await dois.doiBox(row, type).fill(`${PREFIX}/u45rf2-typed`);
            const statuses = await dois.saveEditing(row);
            await page.waitForTimeout(500);
            await dois.collapse(row, items.nbTyped);
            fact('n3 typed save', {type, statuses, rows: await readRow(items.nbTyped), notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []])});
            fact('n3 stored', storedDois([items.nbTyped]));
            record(name('n3-typed'), await screen(page));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
