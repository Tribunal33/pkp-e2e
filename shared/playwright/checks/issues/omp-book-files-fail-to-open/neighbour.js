// Neighbour check for docs/issues/U69-A9-omp-book-files-fail-to-open.md
// (spec U69 register A9), walked with fix.diff in and out. The fix changes
// only which publication the file's usage event carries; it must not open a
// file to anyone the press keeps it from:
//   - rvaca (Press manager) ticks "Users must be registered and log in to
//     view open access content." (Settings › Users & Roles › Site Access
//     Options) and saves
//   - signed out, the book's Chapter 1 "PDF" and the file's download address
//     both lead to the Login page, not to the file
//   - signed in there as aclark (a Reader), the view page opens; its viewer
//     and download are read (the file with the fix, the failure without)
//   - the lines the day's usage event log gains are read
// On PKP's default test dataset, OMP only. Records every screen with screen().
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=r5 PROBE_RUN=<fix|nofix> node bin/probe.js omp shared/playwright/checks/issues/omp-book-files-fail-to-open/neighbour.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const BOOK = 'From Bricks to Brains';
const CHAPTER = 'Chapter 1: Mind Control';

function usageSize(app) {
    const conf = fs.readFileSync(app.configFile, 'utf8');
    const dir = (conf.match(/^files_dir\s*=\s*"?([^"\n]+)"?/m) || [])[1].trim();
    const d = new Date();
    const f = path.join(dir, 'usageStats/usageEventLogs', `usage_events_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.log`);
    return {
        size: () => (fs.existsSync(f) ? fs.statSync(f).size : 0),
        since: (off) => (fs.existsSync(f) ? fs.readFileSync(f).subarray(off).toString('utf8').split('\n').filter(Boolean).map((l) => {
            const j = JSON.parse(l);
            return {assocType: j.assocType, canonicalUrl: (j.canonicalUrl || '').replace(/^https?:\/\/[^/]+/, ''), submissionFileId: j.submissionFileId || null};
        }) : []),
    };
}

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const ulog = usageSize(app);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`nb-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
    try {
        await signIn(page, 'rvaca');
        await page.goto(cu('/management/settings/access'));
        await idle(page);
        await page.locator('#access-button').first().click();
        const box = page.getByRole('checkbox', {name: 'Users must be registered and log in to view open access content.'});
        await box.waitFor({timeout: T});
        await box.check();
        const form = page.locator('[id="access"] form').first();
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: T});
        await snap('access-saved');
        fact('restrict ticked and saved', await box.isChecked());
        await signOut(page);

        // Signed out: the book's Chapter 1 "PDF".
        await page.goto(cu('/catalog'));
        await idle(page);
        await page.getByRole('link', {name: new RegExp(BOOK)}).first().click();
        await page.waitForURL(/\/catalog\/book\//, {timeout: T});
        await idle(page);
        const link = page.locator('li').filter({hasText: CHAPTER}).last().getByRole('link', {name: 'PDF', exact: true}).first();
        const viewHref = await link.getAttribute('href');
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await idle(page);
        await snap('signed-out-pdf-pressed');
        fact('signed out, PDF pressed', {url: rel(page.url()), h1: await page.locator('h1').first().innerText().catch(() => null)});

        // Signed out: the file's download address typed.
        const dlUrl = viewHref.replace('/catalog/view/', '/catalog/download/') + '?inline=1';
        const r = await page.goto(dlUrl);
        await idle(page);
        await snap('signed-out-download-typed');
        fact('signed out, download address typed', {status: r ? r.status() : null, url: rel(page.url()),
            h1: await page.locator('h1').first().innerText().catch(() => null)});

        // Sign in there as aclark (a Reader): back to the file.
        await page.goto(cu('/catalog'));
        await idle(page);
        await page.getByRole('link', {name: new RegExp(BOOK)}).first().click();
        await page.waitForURL(/\/catalog\/book\//, {timeout: T});
        await page.locator('li').filter({hasText: CHAPTER}).last().getByRole('link', {name: 'PDF', exact: true}).first().click();
        await page.waitForURL(/\/login/, {timeout: T});
        const u0 = ulog.size();
        await page.locator('input[name="username"]').fill('aclark');
        await page.locator('input[name="password"]').fill('aclarkaclark');
        await page.getByRole('button', {name: /^Login$|^Log In$/i}).first().click();
        await page.waitForURL(/\/catalog\/view\//, {timeout: T});
        await idle(page);
        const frame = page.frameLocator('iframe').first();
        let viewer = {};
        for (let i = 0; i < 30; i++) {
            await pause(500);
            viewer = {
                errorBar: await frame.locator('#errorWrapper').isVisible().catch(() => false)
                    ? await frame.locator('#errorMessage').innerText().catch(() => null) : null,
                numPages: await frame.locator('#numPages').innerText().catch(() => null),
            };
            if (viewer.errorBar || (viewer.numPages && !/of 0\b/.test(viewer.numPages))) break;
        }
        await snap('reader-view-page');
        fact('aclark signed in from Login', {url: rel(page.url()), title: await page.title(), viewer, usage: ulog.since(u0)});
        await signOut(page);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
