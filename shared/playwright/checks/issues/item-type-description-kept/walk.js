// U08 A12: the item window's line under "Navigation Menu Type" keeps the
// last type's description once "Choose a type..." is chosen again. The
// report's Steps, on PKP's default test dataset, all three apps:
//   1-2  `rvaca`, Settings › Website › "Setup" › "Navigation"
//   3    "Add item": read the "Navigation Menu Type" box's heading and the line under it
//   4    choose "Announcements": read them again
//   5    choose "Choose a type..." again: read them again
// `neighbour` as the argument (for the fix trial) takes the path the fix
// must leave alone instead: an item's "Edit" ("Contact") opens with its
// type's description, then "Remote URL" is chosen.
// At each read it records every label of the type box (the heading and the
// line under the list), the section's text and a screenshot; at the end
// `screen()` records the window's accessibility tree, which gives the
// list's accessible name. The kit builds nothing; nothing is saved.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/item-type-description-kept/walk.js [neighbour]
// Facts:       .reports/<feature>/<id>/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, screen, shot, idle} = require('../../../probe');

const MODE = process.argv[2] || 'steps';

/** The type box's section as the window shows it now. */
async function typeSection(win) {
    return win.form.evaluate((f) => {
        const flat = (t) => (t || '').replace(/\s+/g, ' ').trim();
        const sec = f.querySelector('#menuItemTypeSection');
        const sel = f.querySelector('select[name="menuItemType"]');
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        return {
            chosen: sel ? flat(sel.options[sel.selectedIndex]?.text) : null,
            value: sel ? sel.value : null,
            labels: sec ? [...sec.querySelectorAll('label')].map((l) => ({for: l.getAttribute('for'), text: flat(l.innerText), shown: vis(l)})) : null,
            sectionText: sec ? flat(sec.innerText).replace(flat(sel ? sel.innerText : ''), '<options>') : null,
            urlBoxShown: !!f.querySelector('input[name^="remoteUrl"]') && vis(f.querySelector('input[name^="remoteUrl"]')),
        };
    });
}

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { await d.accept(); });
    const read = async (win, name) => {
        const s = await typeSection(win).catch((e) => ({error: String(e.message || e)}));
        await shot(page, name).catch(() => {});
        fact(name, s);
    };
    try {
        // 1-2
        await signIn(page, 'rvaca');
        const tab = new NavigationTab(page, app.contextPath);
        await tab.goto();
        await idle(page);

        if (MODE === 'neighbour') {
            const win = await tab.editItem('Contact');
            await read(win, 'nb1-edit-contact');
            await win.chooseType('Remote URL');
            await read(win, 'nb2-remote-url');
        } else {
            // 3
            const win = await tab.addItem();
            await read(win, 's3-opened');
            // 4
            await win.chooseType('Announcements');
            await read(win, 's4-announcements');
            // 5
            await win.chooseType('Choose a type...');
            await read(win, 's5-choose-a-type');
        }
        record(`screen-${MODE}`, await screen(page));
    } finally {
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
