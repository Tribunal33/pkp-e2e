// U21 A10 diagnosis (not the Steps): at which load widths the rail stays uncollapsed, and what size change of the
// wizard, after the resize sensor is ready, rescues the loads that do collapse.
//   [WIDTHS=1000,1024 REPEAT=3] PROBE_FEATURE=issues-ir35 PROBE_AGENT=ir35 node bin/probe.js all shared/playwright/checks/issues/phone-load-step-rail-not-collapsed/diag.js
const {forEachApp, launch, record, signIn, idle} = require('../../../probe');
const {beginSubmission} = require('../wizard-refused-save-hangs-saving/lib.js');
const L = require('./lib.js');

const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [375, 414, 480, 540, 600, 700, 800, 900, 1024, 1100, 1200];
const REPEAT = Number(process.env.REPEAT || 1);

/** Init script: size changes of the wizard (.pkpSteps), the sensor's load, and the rail's states, all timed. */
function watchSizes() {
    window.__sizes = [];
    const t = () => Math.round(performance.now());
    document.addEventListener('load', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('resize-sensor')) window.__sizes.push({at: t(), sensorLoaded: true});
    }, true);
    const hook = () => {
        const el = document.querySelector('.pkpSteps');
        if (!el) return false;
        new ResizeObserver((es) => {
            for (const e of es) {
                const r = e.contentRect;
                const what = [...document.querySelectorAll('.pkpStep:not([hidden]) > *, .pkpStep:not([hidden]) .tox-tinymce, .pkpStep:not([hidden]) .listPanel__items')].length;
                window.__sizes.push({at: t(), w: Math.round(r.width), h: Math.round(r.height), visibleParts: what});
            }
        }).observe(el);
        return true;
    };
    const mo = new MutationObserver(() => { if (hook()) mo.disconnect(); });
    const start = () => { if (!hook()) mo.observe(document.documentElement, {subtree: true, childList: true}); };
    if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
}

forEachApp(async (app) => {
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const o = {app: app.name, line: app.line || 'main', loads: {}};
    const {page, close} = await launch(app);
    await page.addInitScript(L.watchRail);
    await page.addInitScript(watchSizes);
    try {
        await signIn(page, author);
        o.submissionId = await beginSubmission(page, app, {title: 'u21ir35 diagnosis', section: 'Articles'});
        for (const width of WIDTHS.flatMap((w) => Array(REPEAT).fill(w))) {
            await page.setViewportSize({width, height: 900});
            await page.reload();
            await page.locator('.pkpSteps__step__label--current').waitFor({timeout: 30_000});
            await idle(page);
            await L.railSettled(page, 1200, 10_000);
            const rail = await L.readRail(page);
            o.loads[`${width}-${Object.keys(o.loads).length}`] = o.loads[width] = {
                collapsed: rail.collapsed, wrapper: rail.rail.wrapperWidth, stepsSum: rail.rail.stepsWidthSum,
                firstStep: rail.stepLabels[0],
                rail: await page.evaluate(() => window.__rail),
                sizes: await page.evaluate(() => window.__sizes),
            };
            console.log(app.name, width, `collapsed=${rail.collapsed} wrapper=${rail.rail.wrapperWidth} steps=${rail.rail.stepsWidthSum}`, JSON.stringify(o.loads[width].sizes).slice(0, 400));
        }
    } catch (e) {
        o.error = String(e.stack || e).slice(0, 600);
        console.log(o.error);
    } finally {
        record('diag', o);
        await close();
    }
});
