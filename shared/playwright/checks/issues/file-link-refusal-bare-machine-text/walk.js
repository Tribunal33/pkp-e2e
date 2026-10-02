// U28 A6 walk (issue report docs/issues/U28-A6-file-link-refusal-bare-machine-text.md).
// On PKP's default test dataset (OJS submission 12, OMP submission 17). OPS has no review: there
// steps 1-2 are dbarnes reading the address of preprint 1's galley file from the workflow's
// "Galleys" list, step 3 is ckwantes (an author with no part in it), and steps 5-7 press the
// galley's name:
//   1-2  jjanssen opens her review request; under "Review Files" the file's name is a link; its
//        address is copied, and pressing it downloads the file (control);
//   3    amccrae, a reviewer with no assignment on the submission, types the address;
//   4    signed out, the address is typed again (with a fix in: Login, and signing in there as
//        jjanssen continues to the file);
//   5-7  dbarnes opens the submission's workflow, logs out in a second tab, and presses a file's
//        name under "Review Files" in the first;
//   8-10 jjanssen opens her review request again, logs out in a second tab, and presses the
//        file's name in the first (MODE=reviewer runs these alone).
// Every run also records the `Accept` header of each request to a component address.
// MODE=neighbour (runs alone): what a fix must leave unchanged. jjanssen and dbarnes typing the
// address get the file; and after dbarnes's session ended in a second tab, the answer to a
// request the workflow's own script sends ("Upload/Select Files"; "Add galley" on a preprint server) is still the JSON refusal.
//
//   npm run fleet-prep -- --feature issues-u28e --dataset 3 --reset
//   PROBE_FEATURE=issues-u28e PROBE_AGENT=u28e node bin/probe.js all shared/playwright/checks/issues/file-link-refusal-bare-machine-text/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');
const {openWorkflow} = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');
const {pressFileLink} = require('../press-media-download-refused-outside-production/lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    facts.accepts = H.watchAccepts(page.context());
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 1500)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        return facts[key];
    };
    const signOutOf = () => signOut(page, {origin: app.baseURL}).catch(() => {});
    // the workflow as dbarnes, with the first file name under "Review Files"
    const workflowLink = async () => {
        await signIn(page, 'dbarnes');
        const modal = await openWorkflow(page, app, c.submissionId);
        const link = modal.locator('a[href*="download-file"]').first();
        if (c.menu && !(await link.waitFor({timeout: 5_000}).then(() => true).catch(() => false))) {
            // a preprint server: the file link is the galley's name on the "Galleys" page of the side menu
            await modal.getByRole('link', {name: c.menu, exact: true}).or(modal.getByRole('button', {name: c.menu, exact: true})).first().click();
        }
        await link.waitFor({timeout: 30_000});
        return {modal, link, name: H.flat(await link.innerText(), 160)};
    };
    // a second tab of the same browser logs out and is closed
    const endSessionInSecondTab = async () => {
        const tab = await page.context().newPage();
        await tab.goto(app.url('/index.php/index/login/signOut')).catch(() => {});
        await tab.waitForLoadState('domcontentloaded').catch(() => {});
        const landed = H.path(tab.url());
        await tab.close();
        return landed;
    };
    // 8-10: the reviewer's own request, the session ended in a second tab, the name pressed
    const reviewerSessionEnded = () => step('reviewerSessionEnded', async () => {
        await signIn(page, c.reviewer);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${c.submissionId}`));
        const link = page.locator('#reviewFilesStep1 a[href*="download-file"]').first();
        await link.waitFor({timeout: 30_000});
        await idle(page);
        const answers = H.watchScriptAnswers(page);
        const out = {secondTabLanded: await endSessionInSecondTab()};
        let download = page.waitForEvent('download', {timeout: 8_000}).then((d) => d.suggestedFilename()).catch(() => null);
        await link.click();
        out.downloaded = await download;
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        out.answers = answers;
        out.tabNow = {page: H.path(page.url()), title: await page.title().catch(() => null), text: H.flat(await page.locator('body').innerText().catch(() => null), 300)};
        record(`${MODE}-9-reviewer-session-ended`, await screen(page).catch(() => ({})));
        // with a fix in, the tab shows Login: signing in there continues to the file
        if (/\/login/.test(out.tabNow.page) && await page.locator('input[name="username"]').count()) {
            download = page.waitForEvent('download', {timeout: 15_000}).then((d) => d.suggestedFilename()).catch(() => null);
            await page.locator('input[name="username"]').first().fill(c.reviewer);
            await page.locator('input[name="password"]').first().fill(c.reviewer + c.reviewer);
            await page.locator('form').filter({has: page.locator('input[name="password"]')}).first().locator('button[type="submit"]').first().click();
            out.afterSignIn = {downloaded: await download, page: H.path(page.url())};
        }
        return out;
    });
    let address = null;
    try {
        if (MODE === 'reviewer') { if (c.reviewer) await reviewerSessionEnded(); return; }
        // 1-2
        if (!c.reviewer) await step('editor', async () => {
            const {link, name} = await workflowLink();
            record(`${MODE}-1-workflow`, await screen(page));
            address = new URL(await link.getAttribute('href'), page.url()).href;
            return {fileName: name, address: H.path(address), typed: await H.openAddress(page, address)};
        });
        else await step('reviewer', async () => {
            await signIn(page, c.reviewer);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${c.submissionId}`));
            const link = page.locator('#reviewFilesStep1 a[href*="download-file"]').first();
            await link.waitFor({timeout: 30_000});
            await idle(page);
            record(`${MODE}-1-request`, await screen(page));
            address = new URL(await link.getAttribute('href'), page.url()).href;
            const out = {fileName: H.flat(await link.innerText(), 160), address: H.path(address)};
            if (MODE === 'walk') {
                const download = page.waitForEvent('download', {timeout: 15_000}).then((d) => d.suggestedFilename()).catch(() => null);
                await link.click();
                out.pressDownloaded = await download;
            } else {
                out.typed = await H.openAddress(page, address);
            }
            return out;
        });
        if (!address) throw new Error('no file link read');
        await signOutOf();

        if (MODE === 'neighbour') {
            if (c.reviewer) await step('editorTyped', async () => {
                await signIn(page, 'dbarnes');
                return await H.openAddress(page, address);
            });
            await step('scriptRefusal', async () => {
                const {modal, name} = await workflowLink();
                const answers = H.watchScriptAnswers(page);
                const out = {fileName: name, secondTabLanded: await endSessionInSecondTab()};
                const button = modal.getByRole('button', {name: c.reviewer ? 'Upload/Select Files' : 'Add galley'}).first();
                out.buttonOffered = await button.count() > 0;
                if (out.buttonOffered) await button.click();
                await page.waitForTimeout(5_000);
                record('neighbour-2-script-refusal', await screen(page));
                out.answers = answers;
                out.pageNow = H.path(page.url());
                return out;
            });
            return;
        }

        // 3
        await step('unassignedReviewer', async () => {
            await signIn(page, c.other);
            const out = await H.openAddress(page, address);
            record('walk-3-unassigned-reviewer', await screen(page));
            return out;
        });
        await signOutOf();
        // 4
        await step('signedOut', async () => {
            const out = await H.openAddress(page, address);
            record('walk-4-signed-out', await screen(page));
            // with a fix in, Login is shown: signing in there continues to the file
            if (/\/login/.test(out.landed || '') && await page.locator('input[name="username"]').count()) {
                const download = page.waitForEvent('download', {timeout: 15_000}).then((d) => d.suggestedFilename()).catch(() => null);
                await page.locator('input[name="username"]').first().fill(c.allowed);
                await page.locator('input[name="password"]').first().fill(c.allowed + c.allowed);
                await page.locator('form#login, form.cmp_form.login, form').filter({has: page.locator('input[name="password"]')}).first().locator('button[type="submit"]').first().click();
                out.afterSignIn = {downloaded: await download, page: H.path(page.url())};
            }
            return out;
        });
        await signOutOf();
        // 5-7
        await step('sessionEnded', async () => {
            const {link, name} = await workflowLink();
            record('walk-5-workflow', await screen(page));
            const out = {fileName: name, secondTabLanded: await endSessionInSecondTab()};
            out.press = await pressFileLink(page, link);
            return out;
        });
        await signOutOf();
        // 8-10
        if (c.reviewer) await reviewerSessionEnded();
    } finally {
        await signOutOf();
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
