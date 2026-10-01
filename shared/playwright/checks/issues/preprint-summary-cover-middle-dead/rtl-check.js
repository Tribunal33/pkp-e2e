// Neighbour check for docs/issues/U13-OPS9-preprint-summary-cover-middle-dead.md,
// OJS only: the article summary's page numbers (`.pages`, absolutely placed
// at the top right of `.meta`) against the cover, left to right and right to
// left. The dataset has no right-to-left language, so the page's `dir` is
// flipped in the browser (rtl.less keys every rule on `body[dir="rtl"]`),
// which is what an Arabic or Persian interface sets.
// Steps: `dbarnes` opens submission 17, "Publication Settings", uploads a
// cover and types "71-98" in "Pages", "Save"; then, signed out, the current
// issue's table of contents. Read four ways, by adding the stylesheet rules
// in the browser, so no checkout is touched:
//   today          the shipped CSS
//   lift           + the fix's `.cover { position: relative; z-index: 1 }`
//   lift+rtlPages  + rtl.less moving `.pages` to the left in RTL
// With fix-ojs.diff applied, the "today" reads show what "lift+rtlPages" shows.
// Run (reset the fleet first):
//   npm run fleet-prep -- --feature issues-ir9 --dataset 3 --apps ojs --reset
//   PROBE_FEATURE=issues-ir9 PROBE_AGENT=ir9 node bin/probe.js ojs shared/playwright/checks/issues/preprint-summary-cover-middle-dead/rtl-check.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');

const COVER = path.resolve(__dirname, '../../../../../apps/ops/playwright/fixtures/files/profile-image-400.png');
const T = 30_000;
const LIFT = '@media (min-width: 768px) { .obj_article_summary .cover { position: relative; z-index: 1; } }';
const RTL_PAGES = '@media (min-width: 768px) { body[dir="rtl"] .obj_article_summary .pages { right: auto; left: 0; } }';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('rtl-check.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=17`));
        const dialog = page.getByRole('dialog').first();
        const entry = app.line === 'stable-3_5_0' ? 'Issue' : 'Publication Settings';
        await dialog.getByRole('link', {name: entry, exact: true}).or(dialog.getByRole('button', {name: entry, exact: true})).first().click({timeout: T});
        await idle(page);
        const form = dialog.locator('form').filter({hasText: 'Cover Image'}).first();
        await form.waitFor({timeout: T});
        const uploaded = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await form.locator('input[type=file]').first().setInputFiles(COVER);
        await uploaded;
        await form.getByRole('textbox', {name: /Alternate text/i}).first().waitFor({timeout: T});
        await form.getByRole('textbox', {name: 'Pages', exact: true}).fill('71-98');
        const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        fact('save', (await saved).status());
        await signOut(page);

        const read = async (label, dir, css) => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/issue/current`));
            await idle(page);
            await page.evaluate((d) => document.body.setAttribute('dir', d), dir);
            for (const c of css) await page.addStyleTag({content: c});
            const box = page.locator('.obj_article_summary').filter({has: page.locator('[id="article-17"]')}).first();
            await box.locator('.cover img').scrollIntoViewIfNeeded();
            const out = await box.evaluate((el) => {
                const r = (n) => (n ? (({x, y, width, height}) => ({x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)}))(n.getBoundingClientRect()) : null);
                const cover = el.querySelector('.cover img');
                const pages = el.querySelector('.pages');
                const at = (x, y) => {
                    const e = document.elementFromPoint(x, y);
                    return e ? (e.className || e.tagName.toLowerCase()) + (e.closest('a') ? ' (link)' : '') : null;
                };
                const pc = r(pages);
                const cc = r(cover);
                const column = [0.05, 0.15, 0.25, 0.35, 0.5, 0.75, 0.95].map((f) => at(cc.x + cc.w / 2, cc.y + cc.h * f));
                const overlap = pc && cc && pc.x < cc.x + cc.w && pc.x + pc.w > cc.x && pc.y < cc.y + cc.h && pc.y + pc.h > cc.y;
                return {cover: cc, pages: pc, pagesText: pages && pages.innerText, overlap, atPagesCentre: pc ? at(pc.x + pc.w / 2, pc.y + pc.h / 2) : null, column};
            });
            fact(`${label} ${dir}`, out);
        };
        for (const dir of ['ltr', 'rtl']) {
            await read('today', dir, []);
            await read('lift', dir, [LIFT]);
            await read('lift+rtlPages', dir, [LIFT, RTL_PAGES]);
        }
    } finally {
        record('rtl-facts', facts);
        await close();
    }
});
