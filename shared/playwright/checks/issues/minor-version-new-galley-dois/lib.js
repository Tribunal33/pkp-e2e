// Helpers for walk.js (issue report U45-OPS4). Requiring this file runs nothing.
const {expect} = require('@playwright/test');

const T = 30_000;

/** The app's words: the work, its galley kind box, the row type of its galley / format DOI. */
const APP = {
    ojs: {sid: 17, work: 'Article', kind: 'Article galleys, such as a published PDF', fileRow: 'PDF', group: 'Publication', post: 'Publish'},
    omp: {sid: 14, work: 'Monograph', kind: 'Publication Formats', fileRow: 'Format / PDF', group: 'Publication', post: 'Publish'},
    ops: {sid: 2, work: 'Preprint', kind: 'Preprint galleys, such as a published PDF', fileRow: 'PDF', group: 'Preprint', post: 'Post'},
};

/**
 * Every version of the submission with its work DOI and its galleys' /
 * formats' DOIs, as stored (a read for the facts, not a step).
 */
function storedDois(sql, app, sid) {
    const file =
        app.name === 'omp'
            ? `(select string_agg(f.publication_format_id || ':' || coalesce(fd.doi, 'none'), ',' order by f.publication_format_id) from publication_formats f left join dois fd on fd.doi_id = f.doi_id where f.publication_id = p.publication_id)`
            : `(select string_agg(g.galley_id || ':' || coalesce(gd.doi, 'none'), ',' order by g.galley_id) from publication_galleys g left join dois gd on gd.doi_id = g.doi_id where g.publication_id = p.publication_id)`;
    // 3.5 numbers versions in one column; main by stage, major and minor.
    const version = app.line === 'stable-3_5_0' ? `p.version::text` : `p.version_stage || ' ' || p.version_major || '.' || p.version_minor`;
    return sql(
        app,
        `select p.publication_id, ${version}, p.status, coalesce(d.doi, 'none'), ${file}
         from publications p left join dois d on d.doi_id = p.doi_id where p.submission_id = ${sid} order by p.publication_id`
    )
        .split('\n')
        .filter(Boolean)
        .map((l) => {
            const [id, version, status, doi, files] = l.split('|');
            return {id: Number(id), version, status: Number(status), doi, files};
        });
}

/**
 * "Create New Version" on the open workflow, "Revision Significance" chosen
 * by label; returns {status, id, version, selects} from the window and the
 * version request's answer.
 */
async function createVersion(page, frame, significance) {
    const item = await frame.revealPublicationEntry('Create New Version');
    await frame.expectVersionLoaded().catch(() => {});
    await item.click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="versionIsMinor"]')}).last();
    await expect(dialog.locator('select[name="versionIsMinor"]')).toBeVisible({timeout: T});
    const out = {};
    out.selects = await dialog
        .locator('select')
        .evaluateAll((ss) => ss.map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => `${o.text.trim()}${o.disabled ? ' [disabled]' : ''}`)})));
    await dialog.getByLabel('Revision Significance').selectOption({label: significance});
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await created;
    out.status = r.status();
    if (r.ok()) {
        const j = await r.json();
        out.id = j.id;
        out.version = `${j.versionStage} ${j.versionMajor}.${j.versionMinor}`;
    }
    await expect(dialog).toHaveCount(0, {timeout: T});
    return out;
}

/**
 * Open the newest version's "Title & Abstract" page, press the header's
 * "Post" / "Publish" and confirm it (through the "Review Publishing
 * Details" step when one comes first). Returns the publish answer's status.
 */
async function publishLatest(page, frame, label, ojsScreen = null) {
    const pages = frame.menuLink('Title & Abstract');
    await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
    if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    await expect(pages.last()).toBeVisible({timeout: T});
    await pages.last().click();
    await frame.expectVersionLoaded().catch(() => {});
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to (post this|publish this|schedule this|make this catalog entry public)/}).last();
    if (ojsScreen) {
        // A journal's "Publish" opens "Review Publishing Details" first (its
        // issue preselected once its status answers), then the confirmation.
        const panel = await ojsScreen.pressPublish({or: confirm});
        if (panel) await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    } else {
        const button = page.getByRole('button', {name: label, exact: true}).first();
        await expect(button).toBeVisible({timeout: T});
        await button.click();
    }
    await expect(confirm).toBeVisible({timeout: T});
    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await confirm.getByRole('button', {name: label, exact: true}).last().click();
    const r = await published;
    await expect(page.getByRole('button', {name: label === 'Post' ? 'Unpost' : 'Unpublish', exact: true}).first()).toBeVisible({timeout: T});
    return r.status();
}

/** Expand a DOIs-page row and read its DOI table: {rowBadge, versionsBar, rows: [{type, doi, badge}]}. */
async function readDoiRow(page, dois, id) {
    const row = dois.row(id);
    await dois.expand(row, id);
    const rows = [];
    for (const type of await dois.doiTypes(row)) {
        rows.push({type, doi: await dois.doiBox(row, type).inputValue(), badge: (await dois.doiBadge(row, type).innerText().catch(() => '')).trim()});
    }
    const out = {
        rowBadge: (await dois.rowBadge(row).innerText().catch(() => '')).trim(),
        version: (await dois.versionName(row).innerText().catch(() => '')).trim(),
        versionsBar: (await dois.versionsBar(row).innerText().catch(() => '')).replace(/\s+/g, ' ').trim() || null,
        rows,
    };
    return out;
}

/** The "View all" window's blocks: [{heading, rows: [{type, doi}]}], or null when not offered. */
async function readVersionsWindow(page, dois, id) {
    const row = dois.row(id);
    if (!(await dois.viewAllButton(row).count())) return null;
    await dois.openVersionsWindow(row);
    const blocks = await dois
        .versionsWindow()
        .locator('.doiListItem__versionContainer')
        .evaluateAll((cs) =>
            cs.map((c) => ({
                heading: (c.querySelector(':scope > a')?.textContent || '').replace(/\s+/g, ' ').trim(),
                rows: [...c.querySelectorAll('tbody tr')].map((tr) => ({
                    type: (tr.querySelector('td label')?.textContent || '').replace(/\s+/g, ' ').trim(),
                    doi: /** @type {HTMLInputElement|null} */ (tr.querySelector('input[type="text"]'))?.value ?? null,
                    badge: (tr.querySelector('.doiListItem__itemMetadata--badge')?.textContent || '').replace(/\s+/g, ' ').trim(),
                })),
            }))
        );
    await dois.closeVersionsWindow();
    return blocks;
}

module.exports = {APP, storedDois, createVersion, publishLatest, readDoiRow, readVersionsWindow};
