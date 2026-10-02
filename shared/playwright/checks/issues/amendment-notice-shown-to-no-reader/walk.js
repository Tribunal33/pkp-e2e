// Issue report docs/issues/U49-A5-amendment-notice-shown-to-no-reader.md (U49 A5):
// the Summary of Changes, which every entry page promises "will appear publicly
// as the version amendment notice", shows on no reader page once the version is
// published. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet), as `dbarnes`, on OJS submission 17, OMP book 14 and OPS preprint 2:
//   1. sign in as dbarnes
//   2. open the submission's workflow
//   3. "Create New Version", the window untouched, "Confirm"
//   4. the new version's "Publication Settings" / "Catalog Entry" / "Preprint entry"
//   5. "Update Type" "Correction", "Figure 2 corrected." in "Summary of Changes", "Save"
//   6. "Publish" / "Post" (OJS: "Confirm" in "Review Publishing Details" when it opens)
//   7. signed out, the reader page
//   8. the earlier version's page from its "Versions" list
// WALK=neighbour (fix in and out): steps 1-5 with "Draft note u49v1." and no
// publish; the signed-out reader page, whose live version 1.0 has no summary,
// must show neither the draft's text nor any notice.
// On stable-3_5_0 (no such field): steps 1-2, then every publication entry of
// the side menu is read for an "Update Type" or "Summary of Changes" field.
//
// Reset first:  npm run fleet-prep -- --feature issues-v1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-v1 PROBE_AGENT=v1 node bin/probe.js all shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/walk.js
// Neighbour:    WALK=neighbour PROBE_RUN=nb-out (or nb-in with fix.diff applied) … the same command
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-v1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-v1-3_5 PROBE_AGENT=v1 node bin/probe.js all shared/playwright/checks/issues/amendment-notice-shown-to-no-reader/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {APP, createVersion, publishLatest} = require('../minor-version-new-galley-dois/lib');

const T = 30_000;
const MODE = process.env.WALK || 'walk';
const SUMMARY = MODE === 'neighbour' ? 'Draft note u49v1.' : 'Figure 2 corrected.';
const PROMISE = 'This will appear publicly as the version amendment notice.';
const ENTRY = {
    main: {ojs: 'Publication Settings', omp: 'Catalog Entry', ops: 'Preprint entry'},
};
const READER = {ojs: (id) => `article/view/${id}`, omp: (id) => `catalog/book/${id}`, ops: (id) => `preprint/view/${id}`};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const a = APP[app.name];
    const stable35 = app.line === 'stable-3_5_0';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: a.sid, summary: SUMMARY};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: a.group}});
    /** The page's full HTML read for the summary, the word "Correction" and a notice block. */
    const readReader = async (label) => {
        const html = await page.content();
        const text = await page.locator('body').innerText();
        const out = {
            url: page.url(),
            summaryInHtml: html.includes(SUMMARY),
            correctionInHtml: /Correction/.test(html),
            noticeBlocks: await page.locator('.amendment_notice').count(),
            noticeText: (await page.locator('.amendment_notice').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()),
            dateLine: (await page.locator('.published .value, .item.date_published .value, .item.published .value').allInnerTexts().catch(() => [])).map((t) =>
                t.replace(/\s+/g, ' ').trim()
            ),
            versions: (await page.locator('.versions li').allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim()),
            outdatedNotice: /outdated version/.test(text),
        };
        fact(label, out);
        record(name(label), await screen(page));
        return out;
    };

    try {
        // 1, 2
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(a.sid);
        await frame.expectVersionLoaded().catch(() => {});

        if (stable35) {
            // 3.5: the entry pages carry no Update Type / Summary of Changes; read every one.
            const entries = await frame.menuEntries();
            fact('35 menu', entries.map((e) => `${e.level}:${e.label}`));
            const pages = entries.filter((e) => e.level >= 2).map((e) => e.label);
            const seen = {};
            for (const label of ['Title & Abstract', 'Issue', 'Catalog Entry', 'Preprint entry', 'Metadata', 'Contributors', 'Permissions & Disclosure']) {
                if (!pages.includes(label)) continue;
                await frame.menuLink(label).first().click().catch(() => {});
                await idle(page);
                await page.waitForTimeout(1500);
                const s = await screen(page);
                const body = String(s.text?.dialog || s.text?.main || '');
                seen[label] = {
                    updateType: await page.locator('select[name="updateType"]').count(),
                    summaryField: await page.locator('[id*="summaryOfChanges"]').count(),
                    promise: body.includes(PROMISE),
                    words: /Summary of Changes|Update Type|Amendment/.test(body),
                };
                record(name(`35-${label.replace(/\W+/g, '-').toLowerCase()}`), s);
            }
            fact('35 entry pages', seen);
            return;
        }

        // 3
        const created = await createVersion(page, frame, 'Minor Revision');
        fact('3 created', {status: created.status, id: created.id, version: created.version, selects: created.selects});

        // 4
        const label = ENTRY.main[app.name];
        const entry = frame.menuLink(label);
        if (!(await entry.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        await expect(entry.last()).toBeVisible({timeout: T});
        await entry.last().click();
        const form = page.locator('form').filter({has: page.locator('select[name="updateType"]')}).first();
        await expect(form.locator('select[name="updateType"]')).toBeVisible({timeout: T});
        const summaryFrame = form.locator('iframe[id*="summaryOfChanges-control-en"]').first();
        await expect(summaryFrame).toBeVisible({timeout: T});
        const formText = (await form.innerText()).replace(/\s+/g, ' ');
        fact('4 entry page', {
            heading: (await page.getByRole('heading', {name: /: /}).first().innerText().catch(() => '')).trim(),
            promise: formText.includes(PROMISE),
            summaryLabel: /Summary of Changes \(Amendment Notice\)/.test(formText),
            updateType: await form.locator('select[name="updateType"] option:checked').innerText(),
        });
        record(name('4-entry'), await screen(page));

        // 5
        await form.locator('select[name="updateType"]').selectOption({label: 'Correction'});
        const body = page.frameLocator('iframe[id*="summaryOfChanges-control-en"]').first().locator('body');
        await body.click();
        await body.fill(SUMMARY);
        await body.blur();
        const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const sr = await saved;
        await expect(page.locator('[role="status"]:has-text("Saved")').first()).toBeVisible({timeout: T});
        let stored = null;
        try {
            const j = await sr.json();
            stored = {updateType: j.updateType, summaryOfChanges: j.summaryOfChanges, status: j.status};
        } catch {}
        fact('5 saved', {status: sr.status(), stored});
        record(name('5-saved'), await screen(page));

        // 6
        if (MODE !== 'neighbour') {
            const ojsScreen =
                app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
            fact('6 publish', await publishLatest(page, frame, a.post, ojsScreen));
            record(name('6-published'), await screen(page));
        }

        // 7
        await signOut(page);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/${READER[app.name](a.sid)}`));
        await idle(page);
        const current = await readReader('7-reader');

        // 8
        const earlier = page.locator('.versions a[href*="/version/"]');
        const hrefs = await earlier.evaluateAll((as) => as.map((x) => x.getAttribute('href')));
        fact('8 version links', hrefs);
        for (const [i, href] of hrefs.entries()) {
            await page.goto(href);
            await idle(page);
            await readReader(`8-version-${i + 1}`);
        }
        fact('verdict', {
            shownOnCurrent: current.summaryInHtml,
            noticeBlocks: current.noticeBlocks,
            expected: MODE === 'neighbour' ? 'no draft text, no notice block' : 'summary and "Correction" on the current page',
        });
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
