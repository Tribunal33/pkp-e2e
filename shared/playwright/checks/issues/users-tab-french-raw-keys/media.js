// Issue report docs/issues/U53-A11-users-tab-french-raw-keys.md, joined by U47 A7: in French
// (Canada) the publication's "Media" page shows the code "##common.moreActions##" for its last
// column heading and for each row's "…" button. Takes the report's "Media page" Steps on PKP's
// default test dataset, all three apps:
//   7. dbarnes opens the Production submission's "Publication" ("Preprint") > "Media"
//   8. "Add Media File": figure.png, "Image", "Web resolution", "Upload Files"
//   9. the initials menu > "Change Language" > "français"
//  10. the submission's "Media" page again: the column headings and the row button's name,
//      and every code on the page (rawKeys), for the record
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/media.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, rawKeys, sql} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {T, flat} = require('./lib');

const REPO = path.resolve(__dirname, '../../../../..');
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('media.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const id = SUBMISSION[app.name];
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${id}`).trim());
    const facts = {app: app.name, line: app.line || 'main', submission: id, publication: pubId};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: app.name === 'ops' ? {publicationGroup: 'Preprint'} : {}});
    const media = new MediaFileManager(page, frame);
    const table = () => page.locator('[role="dialog"] table').filter({has: page.locator('tbody tr', {hasText: 'figure.png'})}).first();
    const readTable = async () => {
        const t = table();
        await t.waitFor({timeout: T});
        await idle(page);
        const row = t.locator('tbody tr', {hasText: 'figure.png'}).first();
        const button = row.getByRole('button').last();
        return {
            heading: flat(await t.locator('xpath=..').locator('h3').first().innerText().catch(() => null)),
            columns: await t.locator('thead th').evaluateAll((ths) => ths.map((th) => ({
                shown: th.innerText.replace(/\s+/g, ' ').trim(),
                text: th.textContent.replace(/\s+/g, ' ').trim(),
            }))),
            rowButton: {
                ariaLabel: await button.getAttribute('aria-label').catch(() => null),
                name: flat(await button.innerText().catch(() => null)),
            },
        };
    };
    try {
        // 7-8
        await signIn(page, 'dbarnes');
        await media.open(id, pubId);
        await idle(page);
        await media.addFiles([{file: path.join(REPO, `apps/${app.name}/playwright/fixtures/files/figure.png`), name: 'figure.png', mediaType: 'Image', resolution: MEDIA_TEXT.web}]);
        await idle(page);
        fact('8 en', await readTable());
        record('u47r6-media-en', await screen(page));
        // 9
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        await changeLanguage(page, 'français', 'fr_CA');
        fact('9 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        // 10
        await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=publication_${pubId}_media`));
        await idle(page);
        fact('10 fr_CA', await readTable());
        const keys = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
        fact('10 raw keys', Array.isArray(keys) ? [...new Set(keys.map((k) => (typeof k === 'string' ? k : k.key)))] : keys);
        record('u47r6-media-fr', await screen(page));
    } catch (e) {
        fact('error', e.message.split('\n')[0]);
        throw e;
    } finally {
        record('u47r6-media-facts', facts);
        await close();
    }
});
