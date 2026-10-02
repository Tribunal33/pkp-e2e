// Issue report docs/issues/U48-A2-body-text-save-offered-then-refused.md (U48 A2): on a version's
// "Body Text" page an assigned Layout Editor whose "Permissions" box is unticked is offered the
// toolbar, an editable editor and "Save", and "Save" is refused; the typed text is lost. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), OJS only (the page is a journal's):
//   1-3  `gcox` (Layout Editor on submission 5, "Permissions" unticked in the dataset): open
//        submission 5, Publication › "Body Text"
//   4    what the page offers (toolbar, editor editable, "Save")
//   5    click into the editor, type a line
//   6-7  "Save"; the "Error" window, "OK"; "Unsaved Changes"
//   8    reload, "Body Text" again; the editor's text
// WALK=neighbour runs alone (fix in and out): steps 1-8 as `dbuskins` (Section editor on submission
// 5, "Permissions" ticked in the dataset); the editor and "Save" must stay offered and the text hold.
// WALK=sidebar runs alone, with the fix applied: `dbarnes` saves a line, then `gcox` selects it and
// changes a field of the "Selected Element" panel and presses "Apply"; the text must not change.
// SIDEBAR_WHO=dbuskins takes the same as the neighbour, for whom the panel must still apply.
// A fix that hides "Save" or locks the editor is recorded, not thrown on.
//
// Reset first:  npm run fleet-prep -- --feature issues-u48r3 --dataset 3 --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r3 PROBE_AGENT=u48r3 node bin/probe.js ojs shared/playwright/checks/issues/body-text-save-offered-then-refused/walk.js
// 3.5, 3.4, 3.3: not walked; they have no "Body Text" page (the report's Affects, read in the code).
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {sleep, flat, errorWindow, pressAndAnswer, openPage} = require('../jats-make-available-offered-then-refused/lib');

const MODE = process.env.WALK || 'walk';
const SID = 5;
const TYPED = 'Layout note u48r3.';
const isSave = (r) => /\/bodyText(\?|$)/.test(r.url()) && r.request().method() !== 'GET';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {BodyTextPage} = require('../../../pages/JatsBodyTextPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `u48r3-body-${s}${run}`;
    const who = MODE === 'neighbour' ? 'dbuskins' : 'gcox';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, who};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath);
    const body = new BodyTextPage(page, frame);
    const openBody = async () => {
        await frame.gotoEditorial(SID);
        await idle(page).catch(() => {});
        const fetched = body.loaded().catch(() => null);
        const r = await openPage(frame, 'Body Text');
        await fetched;
        await body.editor().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
        return r;
    };
    const offers = async () => ({
        toolbar: (await body.toolbar().count()) > 0 && (await body.toolbar().isVisible()),
        editorEditable: (await body.editor().count()) ? await body.editor().getAttribute('contenteditable') : null,
        save: (await body.saveButton().count()) > 0 && (await body.saveButton().isVisible()) ? flat(await body.saveButton().innerText()) : null,
        unsavedBadge: (await body.unsavedBadge().count()) > 0 && (await body.unsavedBadge().isVisible()),
        editorText: (await body.editor().count()) ? await body.editorText() : null,
    });

    // WALK=sidebar (fix trial only): `dbarnes` writes and saves a line, then `gcox` selects it and
    // tries the "Selected Element" panel: a field changed there and "Apply" must not change the text.
    const sidebar = async () => {
        await signIn(page, 'dbarnes');
        fact('S1 dbarnes Body Text', await openBody());
        await body.typeAtEnd('Sidebar check u48r3.');
        const saved = await pressAndAnswer(page, isSave, () => body.saveButton().click());
        fact('S1 dbarnes save', saved && saved.status);
        await sleep(1500);
        await signOut(page);
        const sbWho = process.env.SIDEBAR_WHO || 'gcox';
        await signIn(page, sbWho);
        fact(`S2 ${sbWho} Body Text`, await openBody());
        fact('S2 offers', await offers());
        const para = body.paragraphs().first();
        const before = await para.evaluate((el) => el.outerHTML).catch(() => null);
        fact('S2 paragraph before', before);
        await para.click({clickCount: 3}).catch((e) => fact('S3 select failed', flat(String(e), 200)));
        await sleep(800);
        const section = body.section('selected-element');
        const listed = (await section.count()) > 0;
        fact('S3 "Selected Element" listed', listed);
        if (!listed) {
            await signOut(page);
            return;
        }
        fact('S3 section open after selecting', await section.evaluate((el) => el.open).catch(() => null));
        if (!(await section.evaluate((el) => el.open).catch(() => false))) {
            // Opening a section while another is open closes both (U48 A17): a person presses twice.
            const presses = [];
            for (let i = 0; i < 4 && !(await section.evaluate((el) => el.open).catch(() => false)); i++) {
                await body.sectionHeading('selected-element').click().catch(() => {});
                await sleep(1000);
                presses.push(await body.root().locator('details[data-sidebar-section]').evaluateAll((ds) => ds.map((d) => `${d.dataset.sidebarSection}:${d.open}`)));
            }
            fact('S3 presses (sections open after each)', presses);
        }
        fact('S3 section open', await section.evaluate((el) => el.open).catch(() => null));
        const panel = page.locator('sciflow-selection-editor');
        fact('S3 panel text', flat(await panel.innerText().catch(() => null), 600));
        const fields = panel.locator('input.selection-editor-input, select.selection-editor-input');
        const n = await fields.count();
        const labels = [];
        for (let i = 0; i < n; i++) labels.push(await fields.nth(i).getAttribute('id'));
        fact('S3 fields', labels);
        const align = panel.locator('#selection-editor-attr-text-align');
        let target = (await align.count()) && (await align.isVisible()) ? align : null;
        fact('S3 Selected Element offered', !!target || (await body.section('selected-element').count()) > 0);
        if (target) {
            const tag = await target.evaluate((el) => el.tagName);
            if (tag === 'SELECT') {
                const opts = await target.locator('option').allInnerTexts();
                await target.selectOption({index: opts.length - 1});
            } else {
                await target.fill('center');
                await target.press('Tab');
            }
            await sleep(500);
            const apply = panel.locator('.selection-editor-button--primary');
            fact('S4 Apply offered', (await apply.count()) > 0 && (await apply.isVisible()));
            if (await apply.count()) await apply.click().catch((e) => fact('S4 apply failed', flat(String(e), 200)));
            await sleep(800);
        } else {
            fact('S4 no field to change', true);
        }
        const after = await body.paragraphs().first().evaluate((el) => el.outerHTML).catch(() => null);
        fact('S4 paragraph after', after);
        fact('S4 changed on screen', before !== after);
        record(name('S4-after-apply'), await screen(page));
        await require('../../../probe').shot(page, name('S4-after-apply'));
        await signOut(page);
    };

    try {
        if (MODE === 'sidebar') {
            await sidebar();
            return;
        }
        // 1-3
        await signIn(page, who);
        fact('3 Body Text reached', await openBody());
        // 4
        fact('4 offers', await offers());
        record(name('04-page'), await screen(page));
        // 5
        await body.typeAtEnd(TYPED).catch((e) => fact('5 typing failed', flat(String(e), 300)));
        await sleep(800);
        fact('5 after typing', await offers());
        // 6-7
        if (await body.saveButton().isVisible().catch(() => false)) {
            const answer = await pressAndAnswer(page, isSave, () => body.saveButton().click());
            fact('6 save answer', answer);
            fact('7 error window', await errorWindow(page));
            await sleep(1800);
            fact('7 after save', await offers());
            record(name('07-after-save'), await screen(page));
        } else {
            fact('6 Save not offered', true);
        }
        // 8
        await page.reload();
        await idle(page).catch(() => {});
        fact('8 Body Text reached again', await openBody());
        fact('8 after reload', await offers());
        record(name('08-after-reload'), await screen(page));
        await signOut(page);
    } finally {
        record(name('facts'), facts);
        await idle(page).catch(() => {});
        await close();
    }
});
