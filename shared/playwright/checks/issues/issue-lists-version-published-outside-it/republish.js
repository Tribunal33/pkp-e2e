// After the report's steps 1-10 (main), can the version "Remove" took offline
// be published again on screen? dbarnes opens submission 1's first version in
// the workflow and presses its own "Publish" with what the window preselects;
// then, signed out, the issue's page and that version's page.
// Reset first; run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-version-published-outside-it/republish.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const facts = {};
    try {
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                await L.openNewestVersion(page, app, 1);
                facts.publish = (await L.publishShown(page, app, "Don't Assign To An Issue", 'rp-step4')).status;
                const toc = await L.openToc(page, app);
                const title = toc.outline.find((t) => /Signalling/.test(t));
                facts.remove = (await L.removeFromToc(page, toc.win, title)).removeStatus;
                // The first version, by its workflow address.
                const frame = L.frameFor(page, app);
                await frame.gotoEditorial(1, {menuKey: 'publication_1_titleAbstract'});
                await idle(page);
                await L.sleep(1500);
                facts.v1Controls = L.flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
                facts.v1Buttons = L.flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => null), 200);
                record('rp-v1-workflow', await screen(page));
                if (/Publish/.test(facts.v1Buttons || '')) {
                    const radios = await (async () => {
                        const path = require('path');
                        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                        const pub = new PublicationScreen(page, app.contextPath);
                        const panel = await pub.pressPublish();
                        const r = await panel.locator('input[name="assignment"]').evaluateAll((els) => els.map((e) => ({label: (e.closest('label')?.textContent || '').trim(), checked: e.checked})));
                        const issue = await panel.locator('select[name="issueId"] option:checked').innerText().catch(() => null);
                        const stage = await panel.locator('select[name="versionStage"]').inputValue().catch(() => null);
                        const minor = await panel.locator('select[name="versionIsMinor"]').inputValue().catch(() => null);
                        const question = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
                        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                        const shown = await question.waitFor({state: 'visible', timeout: 20_000}).then(() => true).catch(() => false);
                        const q = shown ? L.flat(await question.innerText(), 400) : L.flat(await panel.innerText().catch(() => null), 600);
                        let status = null;
                        if (shown) {
                            const done = page.waitForResponse((x) => /\/publish$/.test(new URL(x.url()).pathname) && x.request().method() !== 'GET', {timeout: 60_000});
                            await question.getByRole('button', {name: 'Publish', exact: true}).click();
                            status = (await done).status();
                            await idle(page);
                        }
                        return {radios: r, issue, stage, minor, question: q, status};
                    })();
                    facts.republish = radios;
                    facts.v1After = L.flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
                }
            } finally {
                await close();
            }
        }
        {
            const {page, close} = await launch(app);
            try {
                facts.issue = (await L.readIssuePage(page, app, 'issue/current')).outline;
                const v1 = await L.readArticlePage(page, app, `/index.php/${app.contextPath}/article/view/1/version/1`);
                facts.v1Page = {status: v1.status, heading: v1.heading, issuePart: v1.issuePart};
                const cur = await L.readArticlePage(page, app, `/index.php/${app.contextPath}/article/view/1`);
                facts.articlePage = {url: cur.url, heading: cur.heading, issuePart: cur.issuePart, versionLinks: cur.versionLinks};
            } finally {
                await close();
            }
        }
    } finally {
        record('republish', facts);
        console.log(`[fact] ${JSON.stringify(facts)}`);
    }
});
