// Helpers for walk.js (issue report U45-A17). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;

/** Doi::STATUS_* as the DOIs page words them. */
const STATUS = {1: 'Unregistered', 2: 'Submitted', 3: 'Registered', 4: 'Error', 5: 'Needs Sync'};

/**
 * Every version of the submission with its work DOI and that DOI's stored
 * status (a read for the facts, not a step).
 */
function storedStatuses(sql, app, sid) {
    // 3.5 numbers versions in one column; main by stage, major and minor.
    const version = app.line === 'stable-3_5_0' ? `p.version::text` : `p.version_stage || ' ' || p.version_major || '.' || p.version_minor`;
    return sql(
        app,
        `select p.publication_id, ${version}, p.status, coalesce(d.doi, 'none'), coalesce(d.status, 0)
         from publications p left join dois d on d.doi_id = p.doi_id where p.submission_id = ${sid} order by p.publication_id`
    )
        .split('\n')
        .filter(Boolean)
        .map((l) => {
            const [id, v, status, doi, doiStatus] = l.split('|');
            return {id: Number(id), version: v, published: Number(status) === 3, doi, doiStatus: STATUS[doiStatus] || doiStatus};
        });
}

/**
 * 3.5: "Create New Version" on the open workflow's "Title & Abstract" page,
 * answered "Yes". Returns the window's words and the version request's status.
 */
async function createVersion35(page, frame) {
    await frame.menuLink('Title & Abstract').first().click();
    await idle(page);
    const button = page.getByRole('button', {name: 'Create New Version', exact: true}).first();
    await expect(button).toBeVisible({timeout: T});
    await button.click();
    const w = page.getByRole('dialog').filter({hasText: 'Are you sure you want to create a new version?'}).last();
    await expect(w).toBeVisible({timeout: T});
    const out = {window: (await w.innerText()).replace(/\s+/g, ' ').trim()};
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await w.getByRole('button', {name: 'Yes', exact: true}).click();
    const r = await created;
    out.status = r.status();
    if (r.ok()) out.version = (await r.json()).version;
    await idle(page);
    return out;
}

/**
 * 3.5: the open (newest) version's "Post" / "Publish", then the window's own
 * button of that name. Returns the window's words and the publish request's status.
 */
async function publish35(page, label) {
    const button = page.getByRole('button', {name: label, exact: true}).first();
    await expect(button).toBeVisible({timeout: T});
    await button.click();
    const w = page.getByRole('dialog').filter({has: page.getByRole('button', {name: label, exact: true})}).last();
    await expect(w).toBeVisible({timeout: T});
    await page.waitForTimeout(800);
    const out = {window: (await w.innerText()).replace(/\s+/g, ' ').trim().slice(0, 400)};
    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await w.getByRole('button', {name: label, exact: true}).last().click();
    out.status = (await published).status();
    await idle(page);
    return out;
}

module.exports = {STATUS, storedStatuses, createVersion35, publish35};
