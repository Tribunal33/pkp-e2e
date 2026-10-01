// Helpers for walk.js (U69 A6). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {T, sleep, flat, rel} = require('../older-version-tab-current-title/lib');

/** A book page as a reader sees it: the authors named at the top and the table of contents, chapter by chapter. */
async function readBook(page) {
    return {
        url: rel(page.url()),
        title: flat(await page.locator('.obj_monograph_full h1.title').first().innerText({timeout: T}).catch(() => null), 160),
        // The names at the top of the page (the author list's labels).
        bookAuthors: await page
            .locator('.obj_monograph_full .main_entry > .item.authors .sub_item .label, .obj_monograph_full .main_entry > .item.authors .author .label')
            .evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim())),
        bookAuthorsText: flat(await page.locator('.obj_monograph_full .main_entry > .item.authors').first().innerText({timeout: 2000}).catch(() => null), 400),
        chapters: await page.locator('.obj_monograph_full .item.chapters > ul > li').evaluateAll((items) =>
            items.map((li) => ({
                title: (li.querySelector('.title')?.textContent || '').replace(/\s+/g, ' ').trim(),
                // The author line: null when the page leaves it out.
                authors: li.querySelector(':scope > .authors') ? li.querySelector(':scope > .authors').textContent.replace(/\s+/g, ' ').trim() : null,
            }))
        ),
    };
}

/**
 * 3.5 only (main has no such box): Settings › Users & Roles › Roles › the
 * role's row › Edit, set "Show role title in contributor list", OK.
 * Returns what the box read before and after.
 */
async function setShowRoleTitle(page, app, roleName, on) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
    await idle(page);
    await page.getByRole('tab', {name: 'Roles', exact: true}).or(page.getByRole('link', {name: 'Roles', exact: true})).first().click();
    await idle(page);
    const row = page.locator('tr.gridRow', {has: page.getByText(roleName, {exact: true})}).filter({visible: true}).first();
    await row.waitFor({timeout: T});
    await row.locator('a.show_extras').click();
    const edit = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true});
    await edit.waitFor({timeout: T});
    await edit.click();
    const box = page.getByRole('checkbox', {name: 'Show role title in contributor list'});
    await box.waitFor({timeout: T});
    await idle(page);
    const before = await box.isChecked();
    await box.setChecked(on);
    const after = await box.isChecked();
    const dialog = page.getByRole('dialog').last();
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await sleep(1500);
    await idle(page);
    return {role: roleName, before, after};
}

module.exports = {readBook, setShowRoleTitle};
