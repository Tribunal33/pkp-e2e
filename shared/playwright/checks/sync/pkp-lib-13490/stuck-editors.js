// PR check: pkp/pkp-lib#13490 (`main`) and #13491 (stable-3_5_0), issue pkp/pkp-lib#13489, "Skip
// placeholder check on deactivate for uninitialized TinyMCE editors". SiteHandler's `deactivate`
// handler called getContent() on an editor TinyMCE had made active (EditorManager.add) before it
// was initialized; the editor finishing first calls focus(true) in initEditor(), setActive() fires
// `deactivate` on the loading one, getContent() throws (no serializer yet) and the finishing box
// keeps its loading indicator. The PR checks `initialized` first.
//
// Steps on PKP's default test dataset as the manager `rvaca` (Settings › Website › "Setup" ›
// "Navigation"): "Add item", type "Custom Page", title and path, "Save"; then the item's "Edit"
// form, whose Content field holds one legacy TinyMCE box per language (English, French).
//   natural  the Edit form opened and closed ROUNDS times, nothing forced (Chromium; the issue's
//            users see it in Safari, which the VM cannot run without system libraries).
//   forced   the same form with the French box's iframe `load` event held for HOLD ms (a capture
//            listener stops it before TinyMCE's own listener, then dispatches it again), so the
//            French editor is really uninitialized while the English one finishes. Read at
//            1.5 s (during the hold) and after the release.
// It asserts nothing; it records per box whether the editor is initialized and its loading
// indicator shows, plus every page error with the top of its stack, so it runs unchanged at the
// PR's base and head and with `enable_minified = On`.
//
//   npm run reset:ojs -- --dataset 1
//   PROBE_FEATURE=r13489 PROBE_AGENT=<side> node bin/probe.js ojs \
//     shared/playwright/checks/sync/pkp-lib-13490/stuck-editors.js
//   PKP_E2E_LINE=stable-3_5_0 … the same on the 3.5 line's dataset fleet.
// The sides as run (each resets the fleet, each puts lib/pkp back on the app's pointer):
//   sides.sh <main|stable-3_5_0> <pointer> <PR sha>   base, head (PR cherry-picked), head-min
//                                                    (head with enable_minified = On)
//   bundle.sh <line> <pointer> <PR sha>              head with bundle-main.diff / bundle-3_5.diff
//                                                    through bin/try-fix.js, enable_minified = On
//   src35.sh <pointer> <PR sha>                      3.5 base and head with enable_minified = Off
//   a20.sh <line> <PR sha>                           U09 A20's issue walk (checks/issues/
//                                                    first-language-content-box-stuck-loading/)
//                                                    on OJS, OMP, OPS at the pointers, then the PR
// bundle-*.diff stand in for a rebuilt js/pkp.min.js (no Java for Closure on the VM): the same
// guard written into the committed bundle's handler, `!d.target.initialized||`.
//
// Before the fix (forced): a TypeError "…serializer…" from SiteHandler's deactivate handler and the
// English box keeps its loading indicator. Fixed: no SiteHandler error, both boxes ready, no
// indicator. MultilingualInputHandler.isIncomplete_()'s 500 ms timer throws the same TypeError at
// both sides under the hold (pkp/pkp-lib#13180, its PRs #13381 / #13380); it leaves no box stuck.
//
// Read 2026-10-14 (PR review, slot s1), Chromium, OJS:
//   main  lib/pkp 266505ecd8 (pointer)          enable_minified Off   stuck, 2 errors
//         + #13490 65f1315455 (2680d06a6c)      Off                   ready, isIncomplete_ only
//         + #13490, committed pkp.min.js        On (CI, campaign)     stuck, 2 errors
//         + #13490 + bundle-main.diff           On                    ready, isIncomplete_ only
//   3.5   lib/pkp 2196fa2775 (pointer)          On (dataset, release) stuck;  Off: stuck
//         + #13491 a6dd49f958                   On                    stuck;  Off: ready
//         + #13491 + bundle-3_5.diff            On                    ready, isIncomplete_ only
//   Unforced: 0 of 8 windows stuck at every side (U09 f-a20: the order needs a busy browser).
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, idle, shot, record} = require('../../../probe');

const ROUNDS = Number(process.env.ROUNDS || 8);
const HOLD = Number(process.env.HOLD || 3000);
const TITLE = 'Walk page 13489';

function holdFrenchLoad(hold) {
    if (window.top !== window) return;
    Error.stackTraceLimit = 40;
    let held = false;
    document.addEventListener('load', (e) => {
        const t = e.target;
        if (held || !t || t.tagName !== 'IFRAME' || !/^content-fr_CA-.*_ifr$/.test(t.id)) return;
        held = true;
        e.stopImmediatePropagation();
        window.__held = t.id;
        setTimeout(() => t.dispatchEvent(new Event('load')), hold);
    }, true);
}

async function boxes(page) {
    return page.evaluate(() => {
        const out = {};
        document.querySelectorAll('textarea[id^="content-"]').forEach((ta) => {
            const lang = ta.id.split('-')[1];
            const ed = window.tinymce && tinymce.get(ta.id);
            const container = ed && ed.getContainer();
            const throbber = container && container.querySelector('.tox-throbber');
            out[lang] = {
                editor: !!ed,
                initialized: !!(ed && ed.initialized),
                indicator: !!(throbber && getComputedStyle(throbber).display !== 'none'),
            };
        });
        out.active = window.tinymce && tinymce.activeEditor ? tinymce.activeEditor.id.split('-')[1] : null;
        return out;
    });
}

async function openNavigation(page) {
    await page.goto('/index.php/publicknowledge/en/management/settings/website');
    await idle(page);
    await page.locator('#setup-button').click();
    await page.getByRole('tab', {name: 'Navigation', exact: true}).click();
    await idle(page);
}

const modal = (page) => page.getByRole('dialog').last();

async function closeModal(page) {
    await modal(page).getByRole('button', {name: 'Close'}).first().click();
    await page.getByRole('dialog').waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    await page.waitForTimeout(1500);
}

async function openEdit(page) {
    const row = page.locator('tr.gridRow', {hasText: TITLE}).last();
    const id = await row.getAttribute('id');
    const edit = page.locator(`[id="${id}-control-row"] a.pkp_linkaction_edit:not([disabled])`);
    if (!(await edit.isVisible())) await row.locator('a.show_extras').click();
    await edit.waitFor();
    // Right after a close the link can swallow a click while the modal leaves: retry.
    for (let attempt = 0; ; attempt++) {
        await edit.click();
        try {
            await page.locator('textarea[id^="content-en-"]').waitFor({state: 'attached', timeout: 8000});
            return;
        } catch (e) {
            if (attempt >= 2) throw e;
        }
    }
}

forEachApp(async (app) => {
    const lib = execFileSync('git', ['-C', `${app.root}/lib/pkp`, 'rev-parse', '--short=10', 'HEAD']).toString().trim();
    const ini = require('fs').readFileSync(`${app.root}/config.test.ds1.inc.php`, 'utf8');
    const minified = /^enable_minified\s*=\s*On/mi.test(ini);
    const label = `${lib}${minified ? '-min' : ''}`;
    const facts = {lib, minified, natural: [], forced: null};

    // natural rounds (and the item they edit)
    {
        const {page, close} = await launch(app);
        const errors = [];
        const dialogs = [];
        page.on('pageerror', (e) => errors.push({at: Date.now(), message: e.message, stack: String(e.stack).split('\n').slice(0, 4).join(' | ')}));
        // Closing the form asks "The data on this form has changed…" even untouched: accept it.
        page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
        try {
            await signIn(page, 'rvaca', {contextPath: 'publicknowledge'});
            await openNavigation(page);
            if (!(await page.locator('tr.gridRow', {hasText: TITLE}).count())) {
                await page.getByRole('link', {name: 'Add item'}).click();
                const m = modal(page);
                await m.locator('select#menuItemType').selectOption('NMI_TYPE_CUSTOM');
                await m.locator('input[id^="title-en-"]').fill(TITLE);
                await m.locator('input[id^="path-"]').fill('walk-page-13489');
                await page.waitForTimeout(2000);
                await m.getByRole('button', {name: 'Save'}).click();
                await page.locator('tr.gridRow', {hasText: TITLE}).first().waitFor();
                await idle(page);
            }
            for (let i = 0; i < ROUNDS; i++) {
                const from = errors.length;
                const asked = dialogs.length;
                await openEdit(page);
                await page.waitForTimeout(3000);
                const state = await boxes(page);
                facts.natural.push({round: i + 1, ...state, errors: errors.slice(from).map((e) => e.message)});
                if (i === 0) await shot(page, `${label}-natural`);
                await closeModal(page);
                facts.natural[i].closeConfirm = dialogs.length > asked;
            }
        } finally {
            await close();
        }
    }

    // forced
    {
        const {page, close} = await launch(app);
        const errors = [];
        page.on('pageerror', (e) => errors.push({message: e.message, stack: String(e.stack).split('\n').slice(0, 40).join(' | ')}));
        page.on('dialog', (d) => d.accept());
        try {
            await signIn(page, 'rvaca', {contextPath: 'publicknowledge'});
            await openNavigation(page);
            await page.evaluate(holdFrenchLoad, HOLD);
            await openEdit(page);
            await page.waitForTimeout(1500);
            const during = await boxes(page);
            const held = await page.evaluate(() => window.__held || null);
            const duringErrors = errors.length;
            await shot(page, `${label}-forced-during`);
            await page.waitForTimeout(HOLD + 2500);
            const after = await boxes(page);
            await modal(page).locator('.mceEditor, .tox-tinymce').first().click().catch(() => {});
            await page.waitForTimeout(800);
            await shot(page, `${label}-forced-after`);
            facts.forced = {held, during, after, duringErrors, errors};
        } finally {
            await close();
        }
    }
    const summary = {
        lib, minified,
        naturalRoundsWithError: facts.natural.filter((r) => r.errors.length).length,
        naturalCloseConfirms: facts.natural.filter((r) => r.closeConfirm).length,
        naturalRoundsStuck: facts.natural.filter((r) => r.en && r.fr_CA && (!r.en.initialized || !r.fr_CA.initialized || r.en.indicator || r.fr_CA.indicator)).length,
        forced: facts.forced && {held: facts.forced.held, during: facts.forced.during, after: facts.forced.after,
            errors: facts.forced.errors.map((e) => `${e.message} ← ${(e.stack.match(/\/(?:lib\/pkp\/)?js\/(?:(?:controllers|classes)\/[^:]+|pkp\.min\.js[^:]*):\d+/g) || ['bundle only']).join(' ← ')}`)},
    };
    console.log(JSON.stringify(summary, null, 1));
    record(`stuck-editors-${label}`, facts);
});
