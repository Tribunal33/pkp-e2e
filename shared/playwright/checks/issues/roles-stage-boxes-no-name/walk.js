// Issue report walk: docs/issues/U54-A8-roles-stage-boxes-no-name.md (spec
// U54 register A8). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `rvaca` (the context's manager):
//   1-2 Settings › Users & Roles › "Roles"; 3 the "Author" row's "Settings"
//   arrow focused; 4-5 Tab through the row's stage boxes. For each focused
//   control it records what the browser hands a screen reader (Chromium's
//   accessibility node: role, name, the name's sources, checked) and its
//   markup. 6 (N1 below) reads a greyed box of the manager row, which Tab
//   skips, as the accessibility inspector would.
// Neighbour (what a fix must leave alone or reaches on purpose): a greyed
// box (the first row whose boxes are all disabled) stays disabled; the
// "Author" row's last box still saves when pressed (assign-stage /
// unassign-stage answer and notice, the box flipped after a reload) and is
// pressed back; the role window's own "Stage Assignment" boxes keep their
// names; Website › Plugins' "Installed Plugins" boxes (the same shared
// cell) are read for their name. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w53 --dataset 9 --reset
//   PROBE_FEATURE=issues-w53 PROBE_AGENT=w53 node bin/probe.js all shared/playwright/checks/issues/roles-stage-boxes-no-name/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w53-3_5 --dataset 9 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w53-3_5 PROBE_AGENT=w53 node bin/probe.js all shared/playwright/checks/issues/roles-stage-boxes-no-name/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w53/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ROW = 'Author';

/**
 * What the browser hands a screen reader for one element: Chromium's
 * accessibility node for `expression` (a JS expression that yields the
 * element), with its markup.
 */
async function axNode(page, expression) {
    const cdp = await page.context().newCDPSession(page);
    try {
        await cdp.send('Accessibility.enable');
        const {result} = await cdp.send('Runtime.evaluate', {expression});
        if (!result.objectId) return null;
        const {nodes} = await cdp.send('Accessibility.getPartialAXTree', {objectId: result.objectId, fetchRelatives: false});
        const n = nodes.find((x) => !x.ignored) || nodes[0];
        const prop = (k) => (n.properties || []).find((p) => p.name === k)?.value?.value;
        const {result: html} = await cdp.send('Runtime.callFunctionOn', {
            objectId: result.objectId,
            functionDeclaration: 'function () { return this.outerHTML.replace(/\\s+/g, " ").slice(0, 300); }',
            returnByValue: true,
        });
        return {
            role: n.role?.value,
            name: n.name?.value ?? '',
            nameFrom: (n.name?.sources || []).filter((s) => s.value || s.attributeValue).map((s) => `${s.type}${s.attribute ? ':' + s.attribute : ''}`),
            checked: prop('checked'),
            disabled: prop('disabled') ?? false,
            html: html.value,
        };
    } finally {
        await cdp.detach().catch(() => {});
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab, RoleWindow} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const focused = () => axNode(page, 'document.activeElement');
    try {
        // 1-2
        await signIn(page, 'rvaca');
        const roles = new RolesTab(page, app.contextPath, {stages: []});
        await roles.goto();
        const columns = await roles.columns();
        fact('02-columns', columns);
        await snap('roles');

        // 3: the "Author" row's "Settings" arrow (the keyboard focus lands on it by Tab).
        const row = roles.row(ROW);
        const boxCount = await row.locator('input[type="checkbox"]').count();
        fact('03-row', {name: ROW, boxes: boxCount, aria: await row.ariaSnapshot()});
        await row.locator('a.show_extras').focus();
        fact('03-focused (arrow)', await focused());

        // 4-5: Tab through the row's boxes.
        const tabbed = [];
        for (let i = 0; i < boxCount; i++) {
            await page.keyboard.press('Tab');
            tabbed.push({column: columns[2 + i], ...(await focused())});
        }
        fact('05-focused boxes', tabbed);
        fact('05-named boxes', tabbed.filter((b) => b.role === 'checkbox' && b.name).length);
        await snap('author-row-focused');

        // Neighbour 1: a greyed box stays greyed (the first all-disabled row).
        const greyed = await page.evaluate(() => {
            for (const tr of document.querySelectorAll('#roleGridContainer tbody tr.gridRow')) {
                const boxes = [...tr.querySelectorAll('input[type="checkbox"]')];
                if (boxes.length && boxes.every((b) => b.disabled)) {
                    return {row: tr.querySelector('[id$="-name"] .label')?.textContent.trim(), id: boxes[0].id};
                }
            }
            return null;
        });
        if (greyed) fact('N1-greyed box', {row: greyed.row, ...(await axNode(page, `document.getElementById(${JSON.stringify(greyed.id)})`))});

        // Neighbour 2: the row's last box still saves, then is pressed back.
        const last = row.locator('input[type="checkbox"]').last();
        const before = await last.isChecked();
        const press = async () => {
            const answer = page.waitForResponse((r) => /user-group-grid\/(un)?assign-stage/.test(r.url()), {timeout: 30_000});
            await last.click();
            const r = await answer;
            await pause(800);
            const notice = ((await page.locator('.app__notifications').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
            return {url: r.url().replace(/^.*\$\$\$call\$\$\$\//, '').split('?')[0], status: r.status(), notice};
        };
        const first = await press();
        await roles.reload();
        const flipped = await roles.row(ROW).locator('input[type="checkbox"]').last().isChecked();
        const second = await (async () => { await roles.row(ROW).locator('input[type="checkbox"]').last().click(); await idle(page); await pause(800); return true; })();
        await roles.reload();
        const restored = await roles.row(ROW).locator('input[type="checkbox"]').last().isChecked();
        fact('N2-press', {column: columns[columns.length - 1], before, first, afterReload: flipped, pressedBack: second, restored: restored === before});

        // Neighbour 3: the role window's "Stage Assignment" boxes keep their names.
        const win = await roles.openEdit(ROW);
        const winBoxes = await win.stageSection.getByRole('checkbox').evaluateAll((els) => els.map((e) => e.id));
        const winNames = [];
        for (const id of winBoxes) winNames.push((await axNode(page, `document.getElementById(${JSON.stringify(id)})`))?.name);
        fact('N3-window stage boxes', winNames);
        await snap('author-window');
        await win.cancel();

        // Neighbour 4: Website › Plugins (the same shared cell).
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
        await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).click();
        const pluginBox = page.locator('#pluginGridContainer input[type="checkbox"][id^="select-cell-"]').first();
        await pluginBox.waitFor({state: 'attached', timeout: 30_000}).catch(() => {});
        const pluginId = await pluginBox.getAttribute('id').catch(() => null);
        if (pluginId) {
            const plugin = await pluginBox.evaluate((b) => b.closest('tr').querySelector('.label, td')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 80));
            fact('N4-plugin box', {plugin, ...(await axNode(page, `document.getElementById(${JSON.stringify(pluginId)})`))});
        } else {
            fact('N4-plugin box', null);
        }
        await snap('plugins');
    } finally {
        record('facts', facts);
        await close();
    }
});
