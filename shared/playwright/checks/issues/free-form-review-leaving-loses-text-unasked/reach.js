// docs/issues/U09-A19-static-page-content-change-lost-on-close.md: the fix's reach on the windows
// whose message a script fills after the editor loads (`setContent()`), and the two other ways a
// side window closes. Walked with the fix in and out on PKP's default test dataset, OJS, `dbarnes`,
// submission 12 "Sodium butyrate improves growth performance of weaned piglets…" (Review, round 1).
// Nothing is typed in a1–b2: with the fix in, none may ask more than it asks with the fix out.
//   a0  "Add Reviewer", "Select Reviewer" on Aisla McCrae, the window's "Close"
//   a1  the same, the message clicked into and out of before "Close"
//   a2  the same, " u28j" typed in the message instead (the fix's own case: it must ask)
//   b0  Participants › Stephanie Berardo › "Notify", untouched, "Close"
//   b1  "Notify", a predefined message chosen, "Close"
//   b2  the same, the message clicked into and out of before "Close"
//   c1  "Add Static Page", text typed in "Content" only, Escape with the caret still in the box
//   c2  the same window, its heading clicked, Escape
//   c3  "Add Static Page", text typed in "Content" only, a click on the page beside the panel
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run:          PROBE_RUN=<reach-out|reach-in> PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/reach.js [a2,c]
//               (part prefixes after the path run those parts alone)
// Facts: .reports/<feature>/<id>/reach-<run>-ojs.json
const {forEachApp, launch, signIn, idle, record} = require('../../../probe');
const L = require('./lib');
const S = require('../static-page-content-change-lost-on-close/lib');
const SUB = 12;
const REVIEWER = 'Aisla McCrae';
const PARTICIPANT = 'Stephanie Berardo';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const R = require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const {StaticPagesTab} = require('../../../pages/CustomContentPages.js');
    const fact = (k, v) => { record('reach', {[k]: v}, {merge: true}); console.log('[reach]', k, JSON.stringify(v).slice(0, 600)); };
    const {page} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    await signIn(page, 'dbarnes');

    const ONLY = (process.argv[2] || '').split(',').filter(Boolean); // part prefixes, e.g. `a2,c`
    const wanted = (key) => !ONLY.length || ONLY.some((o) => key.startsWith(o));
    const part = async (key, fn) => {
        if (!wanted(key)) return;
        try { fact(key, await fn()); } catch (e) { fact(key, {error: L.flat(e.message, 300)}); }
        await L.asking(page, () => page.goto('about:blank')).catch(() => {});
    };
    /** Do `action` on an open window: the question (or null), and whether `shown` is still on screen. */
    const closing = async (action, shown) => {
        const asked = await L.asking(page, action, {answer: 'cancel'});
        await L.sleep(700);
        return {asked, closed: !(await shown.isVisible().catch(() => false))};
    };
    /** Click into a rich-text box and out again, on `outside`; nothing is typed. */
    const inAndOut = async (textarea, outside) => {
        const id = await textarea.getAttribute('id');
        await page.waitForFunction((i) => { const e = window.tinymce && window.tinymce.get(i); return !!(e && e.initialized); }, id, {timeout: L.T});
        await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
        await L.sleep(300);
        await outside.click();
        await L.sleep(500);
    };

    const addReviewer = async (touch) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${SUB}`));
        await page.locator('[data-cy="reviewer-manager"]').first().waitFor({timeout: L.T});
        await idle(page);
        const modal = await R.openAddReviewerModal(page);
        await R.selectReviewer(page, modal, REVIEWER);
        const form = modal.locator('#regularReviewerForm');
        const textarea = modal.locator('#reviewerFormFooter textarea[name="personalMessage"]');
        const message = (await S.editorText(page, textarea)).length;
        if (touch === 'type') {
            const id = await textarea.getAttribute('id');
            await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
            await page.keyboard.type(' u28j');
            await L.sleep(300);
        } else if (touch) await inAndOut(textarea, modal.locator('[id^="selectedReviewerName"]').first());
        return {message, ...(await closing(() => modal.getByRole('button', {name: 'Close', exact: true}).first().click(), form))};
    };
    await part('a0-add-reviewer-picked', () => addReviewer(false));
    await part('a1-add-reviewer-message-in-out', () => addReviewer(true));
    await part('a2-add-reviewer-message-typed', () => addReviewer('type'));

    const notify = async ({template, touch}) => {
        const panel = new ParticipantsPanel(page, app.contextPath);
        await panel.goto(SUB);
        const win = await panel.openNotify(PARTICIPANT);
        const out = {};
        if (template) {
            out.template = (await win.templateOptions()).filter((t) => t)[0];
            await win.chooseTemplate(out.template);
        }
        out.message = (await win.messageText()).trim().length;
        if (touch) await inAndOut(win.root.locator('textarea[name="message"]'), win.title());
        return {...out, ...(await closing(() => win.root.getByRole('button', {name: 'Close', exact: true}).first().click(), win.notifyButton()))};
    };
    await part('b0-notify-untouched', () => notify({template: false, touch: false}));
    await part('b1-notify-template', () => notify({template: true, touch: false}));
    await part('b2-notify-template-message-in-out', () => notify({template: true, touch: true}));

    if (!wanted('c')) { fact('scriptErrors', errs); return; }
    await S.openPlugins(app, page);
    fact('c-enable', await S.setPluginEnabled(page, 'staticpagesplugin', true));
    const tab = new StaticPagesTab(page, app.contextPath);
    const staticWindow = async () => {
        await tab.goto();
        await tab.tabButton.click();
        await tab.waitList();
        const win = await tab.addPage();
        await win.content('en').type('u28j text typed in Content only');
        return win;
    };
    await part('c1-c2-escape', async () => {
        const win = await staticWindow();
        const out = {c1: await closing(() => page.keyboard.press('Escape'), win.form)};
        if (!out.c1.closed) {
            await page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last().getByRole('heading').first().click();
            out.c2 = await closing(() => page.keyboard.press('Escape'), win.form);
            if (!out.c2.closed) out.kept = await S.editorText(page, win.content('en').textarea);
        }
        return out;
    });
    await part('c3-click-outside', async () => {
        const win = await staticWindow();
        const box = await page.locator('[role="dialog"]:visible').filter({has: page.locator('form#staticPageForm')}).last().boundingBox();
        const out = {panelLeft: box && Math.round(box.x), ...(await closing(() => page.mouse.click(12, 450), win.form))};
        if (!out.closed) out.kept = await S.editorText(page, win.content('en').textarea);
        return out;
    });
    fact('scriptErrors', errs);
});
