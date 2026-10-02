// Helpers for walk.js (issue report U49 OPS1). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {expect} = require('@playwright/test');
const {screen, idle, outFile} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PUBLISH_TASK = 'PKP\\task\\PublishSubmissions';

/** A date as YYYY-MM-DD in a time zone (the server's is UTC). */
function ymd(date, timeZone = 'UTC') {
    return new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
}

/** The UTC date `days` days from now, YYYY-MM-DD. */
function daysAhead(days) {
    return ymd(new Date(Date.now() + days * 86_400_000));
}

/**
 * A copy of the fleet's config whose `time_zone` is `zone`: the app sets
 * PHP's zone from it (PKPApplication), so `Core::getCurrentDate()` reads
 * that zone's clock. Written into the run folder; the database is untouched.
 */
function shiftedConfig(app, zone) {
    const src = path.resolve(app.root, path.basename(app.configFile));
    const text = fs.readFileSync(src, 'utf8').replace(/^time_zone\s*=.*$/m, `time_zone = "${zone}"`);
    const out = outFile(`config-${zone.replace(/\W+/g, '-')}.inc.php`);
    fs.writeFileSync(out, text);
    return out;
}

/** `php lib/pkp/tools/scheduler.php <args>` in the app's root, under a config (the fleet's by default). */
function scheduler(app, args, configFile = null) {
    const cfg = configFile || path.resolve(app.root, path.basename(app.configFile));
    const command = `php lib/pkp/tools/scheduler.php ${args.join(' ')}`;
    try {
        const out = execFileSync('php', ['lib/pkp/tools/scheduler.php', ...args], {
            cwd: app.root,
            env: {...process.env, PKP_CONFIG_FILE: cfg},
            encoding: 'utf8',
            timeout: 300_000,
        });
        return {command, status: 0, out: flat(out, 3000), raw: out};
    } catch (e) {
        const raw = `${e.stdout || ''}${e.stderr || ''}`;
        return {command, status: e.status, out: flat(raw, 3000), raw};
    }
}

/** The scheduler's list, one line per task (the app's own and the shared ones). */
function scheduleList(app) {
    const r = scheduler(app, ['list']);
    const lines = r.raw.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => /\\/.test(l));
    return {status: r.status, lines, publishTask: lines.filter((l) => l.includes('PublishSubmissions'))};
}

/** Open submission `id` in the workflow as the signed-in user; returns the WorkflowPage. */
async function openWorkflow(page, app, id) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    await frame.gotoEditorial(id);
    await frame.expectVersionLoaded().catch(() => {});
    return frame;
}

/** "Preprint entry": type the date into "Date Posted", "Save". Returns the save's status and the box's value. */
async function saveDatePosted(page, frame, date) {
    const entry = await frame.revealPublicationEntry('Preprint entry');
    await entry.click();
    const box = page.locator('#issueEntry-datePublished-control');
    await expect(box).toBeVisible({timeout: T});
    await box.fill(date);
    const saved = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await box.locator('xpath=ancestor::form').getByRole('button', {name: 'Save', exact: true}).click();
    const res = await saved;
    await idle(page);
    const s = await screen(page);
    return {status: res.status(), value: await box.inputValue(), label: flat(await box.locator('xpath=ancestor::*[contains(@class,"pkpFormField")][1]').innerText().catch(() => ''), 400), notices: s.notices};
}

/**
 * "Post" (after "Post the preprint" when the stage view shows it); read the
 * window; press its "Post". Returns the window's text and the publish answer.
 */
async function postAndConfirm(page) {
    const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
    const postControl = page.getByRole('button', {name: 'Post', exact: true});
    await expect(stageAction.or(postControl).first()).toBeVisible({timeout: T});
    if (await stageAction.isVisible()) await stageAction.click();
    await expect(postControl.first()).toBeVisible({timeout: T});
    await postControl.first().click();
    const dialog = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    await expect(dialog).toBeVisible({timeout: T});
    await idle(page);
    const s = await screen(page);
    const out = {window: {title: flat(await dialog.getByRole('heading').first().innerText().catch(() => ''), 200), text: flat(s.text.dialog || (await dialog.innerText()), 1500)}};
    const posted = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await dialog.getByRole('button', {name: 'Post', exact: true}).last().click();
    const res = await posted;
    out.publish = {status: res.status(), url: res.url().replace(/^https?:\/\/[^/]+/, '')};
    await expect(dialog).toHaveCount(0, {timeout: T}).catch(() => {});
    await idle(page);
    return out;
}

/** The publication head: "Status: …" and the controls offered beside it. */
async function readHead(page) {
    const left = page.locator('[data-cy="workflow-controls-left"]');
    await expect(left).toContainText('Status:', {timeout: T}).catch(() => {});
    const right = page.locator('[data-cy="workflow-controls-right"]');
    return {
        status: flat(await left.innerText().catch(() => ''), 200),
        controls: await right.getByRole('button').evaluateAll((bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
    };
}

/** The preprint page, signed out: its status and heading. */
async function readerPage(browser, app, id) {
    const res = await browser.page.goto(app.url(`/index.php/${app.contextPath}/en/preprint/view/${id}`));
    await idle(browser.page).catch(() => {});
    return {status: res ? res.status() : null, title: flat(await browser.page.title(), 200)};
}

/** The stored state of submission `id`'s publications (a read for the facts, not a step). */
function stored(sql, app, id) {
    return sql(app, `select p.publication_id, p.status, p.date_published, s.status from publications p join submissions s on s.submission_id = p.submission_id where p.submission_id = ${id} order by p.publication_id`)
        .split('\n')
        .filter(Boolean);
}

module.exports = {T, flat, PUBLISH_TASK, ymd, daysAhead, shiftedConfig, scheduler, scheduleList, openWorkflow, saveDatePosted, postAndConfirm, readHead, readerPage, stored};
