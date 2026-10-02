// Helpers for walk.js (U16 A10, A20, OMP2, OMP3, OMP4: the "Browse" block).
// The "Plugins" tick and the "Sidebar" save come from the sibling
// setup-save-refused-disabled-block and custom-block libs. Requiring this
// file runs nothing.
const {idle} = require('../../../probe');
const S = require('../setup-save-refused-disabled-block/lib');

const {T, sleep, flat} = S;
const PLUGIN = 'browseblockplugin';

/**
 * Open a public page; a press's page that comes back empty right after a
 * settings save (U16 OMP5, PHP 8.3's code cache, the server restarts) is
 * opened once more, and the retry is returned so Evidence can say so.
 */
async function openPublic(page, url) {
    let retried = null;
    try {
        await page.goto(url);
    } catch (e) {
        if (!/ERR_EMPTY_RESPONSE|ERR_CONNECTION/.test(String(e.message))) throw e;
        retried = flat(e.message, 120);
        await sleep(1500);
        await page.goto(url);
    }
    await page.waitForLoadState('load');
    await idle(page).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    return retried;
}

/**
 * The sidebar's "Browse" block as drawn: present or not, its text, how a
 * screen reader meets its title (the aria snapshot: `heading "Browse"
 * [level=2]` or plain text), the line "Categories", and every link with its
 * nesting depth (lists it sits in), left edge and whether it is drawn
 * marked (a left bar).
 */
async function readBlock(page) {
    const block = page.locator('.pkp_structure_sidebar .block_browse');
    if (!(await block.count())) return {present: false};
    const facts = await block.first().evaluate((b) => {
        const title = b.querySelector('.title');
        const nav = b.querySelector('nav');
        const links = [...b.querySelectorAll('nav a')].map((a) => {
            let depth = 0;
            for (let n = a.parentElement; n && n !== nav; n = n.parentElement) if (n.tagName === 'UL') depth++;
            const s = getComputedStyle(a);
            const li = a.closest('li');
            return {
                name: (a.textContent || '').replace(/\s+/g, ' ').trim(),
                depth,
                x: Math.round(a.getBoundingClientRect().x),
                liClass: li ? li.className.trim() : null,
                aClass: a.className.trim() || null,
                bar: s.borderLeftStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0 ? `${s.borderLeftWidth} ${s.borderLeftStyle} ${s.borderLeftColor}` : null,
            };
        });
        const r = b.getBoundingClientRect();
        return {
            titleTag: title ? title.tagName.toLowerCase() : null,
            text: b.innerText.replace(/\s+/g, ' ').trim(),
            lines: [...b.querySelectorAll('nav li.has_submenu')].map((li) => {
                const head = li.querySelector(':scope > .category_header') || li.firstChild;
                return (head && head.textContent || '').replace(/\s+/g, ' ').trim();
            }),
            categoryHeader: !!b.querySelector('.category_header'),
            navItems: b.querySelectorAll('nav li').length,
            links,
            height: Math.round(r.height),
            inlineStyle: [...b.parentElement.querySelectorAll('style')].map((st) => st.textContent.replace(/\s+/g, ' ').trim()),
        };
    });
    return {present: true, aria: await block.first().ariaSnapshot(), ...facts};
}

/** The headings a screen reader lists in the sidebar. */
async function sidebarHeadings(page) {
    const side = page.locator('.pkp_structure_sidebar');
    if (!(await side.count())) return [];
    return (await side.first().ariaSnapshot()).split('\n').filter((l) => /heading/.test(l)).map((l) => l.trim());
}

/** The breadcrumb's last step as drawn: its text and its left bar, padding and colour. */
async function breadcrumbLast(page) {
    const li = page.locator('.cmp_breadcrumbs li.current').first();
    if (!(await li.count())) return {present: false};
    return li.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
            present: true,
            text: el.innerText.replace(/\s+/g, ' ').trim(),
            bar: s.borderLeftStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0 ? `${s.borderLeftWidth} ${s.borderLeftStyle} ${s.borderLeftColor}` : null,
            paddingLeft: s.paddingLeft,
            color: s.color,
        };
    });
}

/** Settings › Website › "Plugins": tick "Browse Block" (already ticked on a press). */
async function enableBrowse(app, page) {
    await S.openPlugins(app, page);
    return S.setPluginEnabled(page, PLUGIN, true);
}

/** "Appearance" › "Setup": tick "Browse Block" under "Sidebar" and "Save". */
async function placeBrowse(app, page) {
    const before = await S.openSidebarList(app, page, app.contextPath);
    const save = await S.placeAndRead(page, [PLUGIN]);
    return {offered: before.map((b) => `${b.label}${b.checked ? ' [x]' : ''}`), save};
}

/**
 * Settings › Journal (Press, Server) › "Categories": delete a top-level
 * category through "More Actions" › "Delete Category", typing its name.
 */
async function deleteCategory(app, page, name) {
    if (app.line === 'stable-3_5_0') return deleteCategory35(app, page, name);
    const {CategoriesTab} = require('../../../pages/CategoriesPages');
    const tab = new CategoriesTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    await idle(page);
    const dialog = await tab.openDelete(name);
    const text = flat(await dialog.root().innerText(), 600);
    await dialog.confirmBox().fill(name);
    const r = await dialog.confirm();
    await dialog.deletedDialog().waitFor({timeout: T});
    const deleted = flat(await dialog.deletedDialog().innerText(), 300);
    await dialog.backButton().click();
    await sleep(600);
    await idle(page);
    const left = (await tab.nameCells().allInnerTexts()).map((t) => flat(t));
    return {dialog: text, status: r.status(), deleted, left};
}

/**
 * 3.5's "Categories" tab is a legacy grid, and a category with
 * sub-categories offers no "Remove": each sub-category row's "Settings" ›
 * "Remove" › "OK" first, then the category's own remove control, "OK".
 */
async function deleteCategory35(app, page, name) {
    const done = [];
    const grid = () => page.locator('[id^="component-grid-settings-category-categorycategorygrid"]').first();
    const open = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
        await idle(page);
        await page.locator('#categories-button').first().click();
        await grid().waitFor({timeout: T});
        await sleep(500);
        await idle(page);
    };
    const confirm = async () => {
        const dlg = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
        await dlg.waitFor({timeout: T});
        const text = flat(await dlg.innerText(), 200);
        const answered = page.waitForResponse((r) => /delete|remove/i.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dlg.getByRole('button', {name: /^(OK|Delete|Yes)$/}).first().click();
        const r = await answered;
        await idle(page);
        await sleep(500);
        return {text, status: r.status()};
    };
    for (let i = 0; i < 12; i++) {
        await open();
        const head = grid().locator('tr.gridRow.category').filter({hasText: name}).first();
        if (!(await head.count())) break;
        const headId = await head.getAttribute('id');
        const catPrefix = headId.replace(/-row-\d+$/, '');
        const child = grid().locator(`tr.gridRow.has_extras[id^="${catPrefix}-row-"]`).first();
        if (await child.count()) {
            const label = flat(await child.innerText()).replace(/^Settings /, '');
            const id = await child.getAttribute('id');
            await child.locator('a.show_extras').click();
            await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Remove', exact: true}).click();
            done.push({removed: label, ...(await confirm())});
            continue;
        }
        const del = head.locator('a[id*="deleteCategory"]');
        if (!(await del.count())) { done.push({removed: name, error: 'no remove control', links: await head.locator('a').evaluateAll((as) => as.map((a) => a.id + ':' + a.innerText))}); break; }
        await del.first().click();
        done.push({removed: name, ...(await confirm())});
    }
    await open();
    const left = (await grid().locator('tr.gridRow').allInnerTexts()).map((t) => flat(t).replace(/^Settings /, ''));
    return {removed: done, left};
}

/** {OMP} "Browse Block"'s "Settings": set the three boxes, "Save"; returns the boxes before and the answer. */
async function setBrowseBoxes(app, page, want) {
    const {PluginsTab} = require('../../../pages/CustomContentPages');
    const {BrowseBlockSettings} = require('../../../pages/CategoriesPages');
    const tab = new PluginsTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    const w = new BrowseBlockSettings(page);
    await w.open(tab);
    const before = await w.boxes();
    for (const [name, on] of Object.entries(want)) await w.box(name).setChecked(on);
    const status = await w.save();
    await idle(page);
    return {before, status};
}

module.exports = {...S, PLUGIN, openPublic, readBlock, sidebarHeadings, breadcrumbLast, enableBrowse, placeBrowse, deleteCategory, setBrowseBoxes};
