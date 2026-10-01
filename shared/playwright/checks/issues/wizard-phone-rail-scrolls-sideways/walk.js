// Issue report walk: docs/issues/U21-A10-wizard-phone-rail-scrolls-sideways.md
// (spec U21 register A10). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
//   1-2  in a 1280 px window the Author (ccorino; OMP aclark) begins
//        "u21w38 phone rail"; the wizard opens with the full step rail
//   3    the window narrowed to 375 x 812: the rail collapses (control)
//   4    the page reloaded at 375 px: the rail as it loads, the page's width;
//        then four more reloads, since whether the rail collapses is a race
//   5    a phone: a new 375 px browser signs in and opens the draft's wizard
//        address (what "Complete submission" opens), three times
// Then the neighbour (the fix must leave it alone): reloaded at 1280 px the
// rail stays a full, uncollapsed row.
// The kit builds nothing; every change is made on screen. (The draft is begun
// at desktop width because at 375 px the start page's Title box is 0 px wide.)
//
// Reset first:  npm run fleet-prep -- --feature issues-w38 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-w38 PROBE_AGENT=w38 node bin/probe.js all shared/playwright/checks/issues/wizard-phone-rail-scrolls-sideways/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w38-3_5 PROBE_AGENT=w38 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w38/a10-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('../wizard-footer-last-saved-without-save/lib.js');

const PHONE = {width: 375, height: 812};

/** What the rail and the page look like now, and what the rail's own width check reads. */
async function rail(page) {
    await L.pause(400); // the rail's resize check is debounced 100 ms
    return page.evaluate(() => {
        const steps = document.querySelector('.pkpSteps');
        const wrap = document.querySelector('.pkpSteps__buttonWrapper');
        const labels = wrap ? [...wrap.querySelectorAll('li>span')] : [];
        const sum = labels.reduce((t, s) => t + s.offsetWidth, 0);
        const chain = [];
        for (let el = wrap; el && el !== document.documentElement; el = el.parentElement) {
            chain.push(`${el.tagName.toLowerCase()}.${String(el.className || '').trim().split(/\s+/)[0]}=${el.offsetWidth}`);
        }
        const controls = document.querySelector('.pkpSteps__controls');
        return {
            viewport: window.innerWidth,
            pageWidth: document.documentElement.scrollWidth,
            scrollsSideways: document.documentElement.scrollWidth > window.innerWidth,
            collapsed: !!(steps && steps.classList.contains('pkpSteps--collapsed')),
            progress: controls ? controls.innerText.trim() : null,
            showAllSteps: !!(controls && controls.querySelector('button')),
            railRowWidth: wrap ? wrap.offsetWidth : null,
            stepLabelsWidth: sum,
            labelsShown: labels.filter((s) => !s.closest('li').classList.contains('-screenReader')).map((s) => s.innerText.replace(/\s+/g, ' ').trim()),
            widthChain: chain,
        };
    });
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${L.flat(JSON.stringify(v), 900)}`); record('a10-facts', facts); };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const {errors} = L.watchWrites(page);
    const snap = L.snapper(page, 'a10-');
    try {
        // Steps 1-2, at desktop width
        await page.setViewportSize({width: 1280, height: 812});
        await signIn(page, L.AUTHOR[app.name]);
        const id = await L.startDraft(page, app, 'u21w38 phone rail', snap);
        fact('draft', id);
        fact('step 2: wizard opened at 1280', await rail(page));
        await snap('wizard-1280');

        // Step 3 (control): the window narrowed, no reload
        await page.setViewportSize(PHONE);
        await idle(page);
        fact('step 3: narrowed to 375 without reload', await rail(page));
        await snap('narrowed-375');

        // Step 4: reloaded at 375
        await page.reload();
        await page.locator('.pkpSteps').waitFor();
        await idle(page);
        fact('step 4: reloaded at 375', await rail(page));
        await L.pause(3000);
        fact('step 4: 3 s later', await rail(page));
        await snap('reload-375');
        // The outcome is a race (see the report's Cause): four more reloads, each read 3 s on.
        const again = [];
        for (let i = 0; i < 4; i++) {
            await page.reload();
            await page.locator('.pkpSteps').waitFor();
            await idle(page);
            await L.pause(3000);
            const r = await rail(page);
            again.push({collapsed: r.collapsed, pageWidth: r.pageWidth});
        }
        fact('step 4: four more reloads at 375', again);

        // Step 5: a phone (a new browser, 375 px, nothing cached) signs in and
        // opens the draft from "My Submissions" ("Complete submission" opens
        // this address); three times, each in its own new browser.
        const phone = [];
        for (let i = 0; i < 3; i++) {
            const b = await launch(app);
            try {
                await b.page.setViewportSize(PHONE);
                await signIn(b.page, L.AUTHOR[app.name]);
                await b.page.goto(app.url(`/index.php/${app.contextPath}${L.localeSeg(app)}/submission?id=${id}`));
                await b.page.locator('.pkpSteps').waitFor({timeout: L.T});
                await idle(b.page);
                await L.pause(3000);
                const r = await rail(b.page);
                phone.push({collapsed: r.collapsed, pageWidth: r.pageWidth, progress: r.progress});
                if (i === 0) { const sn = L.snapper(b.page, 'a10-phone-'); await sn('opened-375'); }
            } finally {
                await b.close();
            }
        }
        fact('step 5: opened in a new 375 px browser, three times', phone);

        // Neighbour: reloaded at desktop width the rail stays a full row.
        await page.setViewportSize({width: 1280, height: 812});
        await page.reload();
        await page.locator('.pkpSteps').waitFor();
        await idle(page);
        fact('neighbour: reloaded at 1280', await rail(page));
        await snap('reload-1280');
        fact('page errors', errors);
    } finally {
        await close();
    }
});
