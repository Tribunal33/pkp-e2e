// Issue report docs/issues/U58-A2-media-page-offers-deleted-component.md (U58 A2): a component the
// manager deleted (a dependent one: "Multimedia", on a press "HTML Stylesheet") is still offered under
// "What kind of media is this?" on the "Media" page's "Upload Media File" window, and a file uploaded
// with it is filed under the deleted component. Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), on OJS, OMP and OPS; the kit builds nothing.
//
//   1-3   sign in as rvaca; Settings › Workflow › "Submission" › "Components"; the deleted component's
//         arrow, "Delete", "OK"
//   4     sign out, sign in as dbarnes
//   5-6   open submission 1, side menu "Media"
//   7-8   "Add Media File", "Click to upload files" with figure.png
//   9     read the card's "What kind of media is this?" choices
//   10    choose the deleted component, "Upload Files"; read the "Media Files" list
// The browser's own GET of the components (`/api/v1/genres`) is recorded with each row's `enabled`.
//
// WALK=neighbour runs alone (fix in and out): no delete; as dbarnes, the same window offers every
// dependent component and an upload as "Image" lands as "Image".
//
// Reset first:  npm run fleet-prep -- --feature issues-u58a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u58a PROBE_AGENT=u58a node bin/probe.js all shared/playwright/checks/issues/media-page-offers-deleted-component/walk.js
// Neighbour:    WALK=neighbour PROBE_RUN=nb-in|nb-out (same command); the fix trial PROBE_RUN=fix
// 3.5 (no "Media" page there; WALK=where reads submission 1's side menu instead):
//               PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u58a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 WALK=where PROBE_RUN=r35 PROBE_FEATURE=issues-u58a-3_5 PROBE_AGENT=u58a node bin/probe.js all <this script>
// Facts: .reports/<feature>/u58a/[neighbour-]facts[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const REPO = path.resolve(__dirname, '../../../../..');
const APP = {
    ojs: {list: 'Article Components', deleted: 'Multimedia', title: 'Signalling Theory Dividends'},
    omp: {list: 'Monograph Components', deleted: 'HTML Stylesheet', title: 'The ABCs of Human Survival'},
    ops: {list: 'Preprint Components', deleted: 'Multimedia', title: 'The influence of lactation'},
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const figure = path.join(REPO, `apps/${app.name}/playwright/fixtures/files/figure.png`);
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    // The browser's own fetch of the components list, as the "Media" page's store makes it.
    const genreReads = [];
    page.on('response', async (resp) => {
        if (!/\/api\/v1\/genres(\?|$)/.test(resp.url())) return;
        try {
            const json = await resp.json();
            genreReads.push({status: resp.status(), itemsMax: json.itemsMax,
                items: (json.items || []).map((g) => ({name: g.name && (g.name.en || Object.values(g.name)[0]), dependent: g.dependent, enabled: g.enabled}))});
        } catch (e) {
            genreReads.push({status: resp.status(), error: String(e.message).slice(0, 120)});
        }
    });
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => {});
    };
    const snap = async (s) => {
        record(name(s), await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)})));
        await shot(page, name(s)).catch(() => {});
    };
    const uploadWin = () => page.getByRole('dialog', {name: 'Upload Media File'});
    const wf = () => page.getByRole('dialog').first();

    async function openMedia() {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=1`));
        await idle(page);
        await wf().getByText(a.title, {exact: false}).first().waitFor({timeout: 30000});
        const media = wf().getByRole('button', {name: 'Media', exact: true}).or(wf().getByRole('link', {name: 'Media', exact: true})).first();
        await media.click();
        await idle(page);
        await wf().getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: 30000});
        await sleep(300);
        return {titleShown: await wf().getByText(a.title, {exact: false}).count(), heading: (await wf().locator('h1, h2').allInnerTexts()).slice(0, 4)};
    }
    async function openUploadAndChoose() {
        await page.getByRole('button', {name: 'Add Media File', exact: true}).click();
        await uploadWin().waitFor({timeout: 30000});
        await idle(page);
        await sleep(500);
        const noTypes = await uploadWin().getByText('No media types are configured', {exact: false}).count();
        if (noTypes) return {noMediaTypesLine: true};
        const chooserP = page.waitForEvent('filechooser', {timeout: 15000});
        await uploadWin().getByRole('button', {name: 'Click to upload files', exact: true}).click();
        await (await chooserP).setFiles(figure);
        await uploadWin().locator('select').first().waitFor({timeout: 60000});
        await idle(page);
        await sleep(300);
        return {card: await uploadWin().getByText('figure.png', {exact: true}).count()};
    }
    // The card's "What kind of media is this?" list: its label and its choices as shown.
    async function typeChoices() {
        const sel = uploadWin().locator('select').first();
        const label = await sel.evaluate((s) => {
            const l = s.id && document.querySelector(`label[for="${s.id}"]`);
            return l ? l.textContent.replace(/\s+/g, ' ').trim() : null;
        }).catch(() => null);
        const options = await sel.evaluate((s) => [...s.options].map((o) => o.textContent.trim())).catch(() => []);
        return {label, options};
    }
    // Choose a type, press "Upload Files", read the "Media Files" list's rows.
    async function uploadAs(type) {
        const sel = uploadWin().locator('select').first();
        await sel.selectOption({label: type});
        await sleep(200);
        const up = uploadWin().getByRole('button', {name: 'Upload Files', exact: true});
        const enabled = await up.isEnabled();
        if (!enabled) return {chosen: type, uploadFilesEnabled: false};
        const answered = page.waitForResponse((r) => /\/mediaFiles(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
        await up.click();
        const resp = await answered;
        await uploadWin().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page);
        await sleep(500);
        const rows = (await wf().locator('table tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
        return {chosen: type, uploadFilesEnabled: true, post: resp ? resp.status() : null, windowOpen: await uploadWin().isVisible().catch(() => false), rows};
    }

    try {
        if (MODE === 'walk') {
            await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));
            const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: a.list});
            await step('2 Settings › Workflow › Submission › Components', async () => {
                await settings.goto('Components');
                return settings.components.names();
            });
            await step(`3 delete "${a.deleted}"`, async () => {
                const win = await settings.components.openDelete(a.deleted);
                const question = (await win.root().innerText()).replace(/\s+/g, ' ').trim();
                const resp = await settings.components.confirmDelete(win);
                // The grid redraws after the answer: read the list once the row is gone.
                await settings.components.row(a.deleted).first().waitFor({state: 'detached', timeout: 15000}).catch(() => {});
                await idle(page);
                return {question, status: resp.status(), listAfter: await settings.components.names()};
            });
            await snap('03-components');
            await step('4 sign out, sign in as dbarnes', async () => {
                await signOut(page);
                await signIn(page, 'dbarnes');
            });
            await step('5-6 submission 1 › Media', openMedia);
            await snap('06-media');
            await step('7-8 Add Media File, figure.png', openUploadAndChoose);
            await step('9 What kind of media is this? choices', typeChoices);
            await snap('09-choices');
            await step(`10 upload as "${a.deleted}"`, () => uploadAs(a.deleted));
            await snap('10-media-list');
        } else if (MODE === 'where') {
            // A line without the "Media" page (stable-3_5_0): read submission 1's workflow side menu.
            await step('w1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step('w2 submission 1, side menu', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=1`));
                await idle(page);
                await wf().getByText(a.title, {exact: false}).first().waitFor({timeout: 30000}).catch(() => {});
                const menu = (await wf().locator('nav, [role="navigation"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
                const media = await wf().getByRole('button', {name: 'Media', exact: true}).or(wf().getByRole('link', {name: 'Media', exact: true})).count();
                return {titleShown: await wf().getByText(a.title, {exact: false}).count(), menu, mediaEntries: media};
            });
            await snap('w2-workflow');
        } else {
            await step('n1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step('n2 submission 1 › Media', openMedia);
            await step('n3 Add Media File, figure.png', openUploadAndChoose);
            await step('n4 What kind of media is this? choices', typeChoices);
            await snap('n4-choices');
            await step('n5 upload as "Image"', () => uploadAs('Image'));
            await snap('n5-media-list');
        }
    } finally {
        fact('browser GET /api/v1/genres', genreReads);
        record(name('facts'), facts);
        await close();
    }
});
