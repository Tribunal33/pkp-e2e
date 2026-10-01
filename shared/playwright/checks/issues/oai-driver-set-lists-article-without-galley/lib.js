// Helpers of the three "DRIVER" walks (issue reports U19 A23, A24 and A11):
//   oai-driver-set-lists-article-without-galley/walk.js
//   oai-driver-list-says-more-results/walk.js
//   oai-driver-set-misses-deleted-record-of-article-in-no-issue/walk.js
// Requiring this file runs nothing. Every helper drives a screen a person uses, or reads an OAI
// address as a harvester does (no session).
const fs = require('fs');
const path = require('path');
const {idle, screen, shot} = require('../../../probe');
const {readOai, PluginGrid} = require('../../../pages/OaiPages.js');
const {unpublish} = require('../oai-own-address-loses-deleted-records/lib');
const {publish: publishOnOlderLine} = require('../recommend-by-author-list-never-shown/lib');

const T = 30_000;
const CTX = 'publicknowledge';
const ISSUE = /Vol\. 1 No\. 2 \(2014\)/;
const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Website › "Plugins": the "DRIVER" row's box ticked or unticked (unticking answers "OK"). */
async function setDriver(page, want) {
    const grid = new PluginGrid(page, CTX);
    await grid.goto();
    const out = {category: flat(await grid.categoryOf('DRIVER'), 80), was: await grid.box('DRIVER').isChecked()};
    if (out.was !== want) {
        out.question = await grid.setEnabled('DRIVER', want);
        out.notice = flat(await page.locator('.pkpNotification, .pkp_notification, [role="status"]').last().innerText({timeout: 3000}).catch(() => null), 120);
    }
    out.ticked = await grid.box('DRIVER').isChecked();
    return out;
}

/**
 * A submission's workflow › "Schedule For Publication" / "Publish": the "Review Publishing
 * Details" window with "Assign To Current/Back Issue" and the issue (`issue` true) or "Don't
 * Assign To An Issue" (`issue` false), "Confirm", then "Publish". On 3.5: Publication › "Issue" ›
 * "Assign to Issue", the issue, "Save", then the publish button and "Publish".
 */
async function publish(page, app, sid, {issue = true} = {}) {
    if (app.line === 'stable-3_5_0') return publishOnOlderLine(page, app, sid, ISSUE);
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, CTX);
    await pub.gotoWorkflow(sid);
    await idle(page).catch(() => {});
    // The publish button sits on the Publication pages; a submission in Production opens on its stage.
    await pub.openEntry('Title & Abstract');
    await idle(page).catch(() => {});
    await sleep(1000);
    const out = {button: flat(await pub.publishButton().first().innerText().catch(() => null), 60)};
    const panel = await pub.openPublishPanel();
    for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
        const sel = panel.locator(`select[name="${name}"]`);
        if ((await sel.count()) && (await sel.isEnabled().catch(() => false))) {
            await sel.selectOption(value).catch(() => {});
            out[name] = flat(await sel.locator('option:checked').innerText().catch(() => null), 60);
        }
    }
    out.choices = (await panel.getByRole('radio').evaluateAll((els) => els.map((e) => (e.closest('label') || e.parentElement).innerText))).map((t) => flat(t, 80));
    if (issue) {
        await pub.awaitAssignmentPreselected(panel);
        await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
        await pub.selectIssueOption(panel, ISSUE);
    } else {
        await pub.awaitAssignmentPreselected(panel);
        await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
    }
    await sleep(500);
    out.panel = flat(await panel.innerText().catch(() => null), 700);
    await shot(page, `publish-panel-${sid}`).catch(() => {});
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    await confirm.waitFor({state: 'visible', timeout: T});
    out.question = flat(await confirm.innerText(), 300);
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
    const r = await answered;
    out.publish = r ? r.status() : null;
    await page.getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    out.status = flat(await pub.leftControls().innerText().catch(() => ''), 120);
    return out;
}

/** One answer as facts: the error, the record headers, the resumption token's numbers. */
function facts(name, address, a) {
    const out = {
        step: name,
        address,
        status: a.status,
        error: a.error ? `${a.error.code}: ${a.error.message}` : null,
        headers: a.headers.map((h) => `${h.deleted ? 'DELETED ' : ''}${String(h.identifier).replace(/^oai:[^:]+:/, '')} [${h.setSpecs.join(', ')}]`),
        token: a.token ? {completeListSize: a.token.completeListSize, cursor: a.token.cursor, value: a.token.value ? 'a token' : '(empty)'} : null,
        sets: a.sets.length ? a.sets.map((s) => `${s.spec} = ${s.name}`) : undefined,
    };
    out.count = out.headers.length;
    return out;
}

/** One OAI address read as a harvester (no session). */
async function ask(app, name, params, ctx = CTX) {
    const a = await readOai(app.baseURL, ctx, params);
    const out = facts(name, `/index.php/${ctx}/oai?${params}`, a);
    out.next = a.token && a.token.value ? a.token.value : null;
    return out;
}

/**
 * A list read as a harvester, every part followed through its resumption token (at most
 * `max` parts). Returns the parts.
 */
async function askAll(app, name, params, max = 6) {
    const parts = [await ask(app, `${name}, part 1`, params)];
    const verb = (params.match(/verb=(\w+)/) || [])[1];
    while (parts[parts.length - 1].next && parts.length < max) {
        parts.push(await ask(app, `${name}, part ${parts.length + 1}`, `verb=${verb}&resumptionToken=${parts[parts.length - 1].next}`));
    }
    return parts;
}

/**
 * The same list in the browser view: the record headings, the "There are more results." line and
 * "Resume", pressed until the list ends (at most `max` parts). Returns what each part showed.
 */
async function view(page, app, name, params, max = 6) {
    const parts = [];
    await page.goto(app.url(`/index.php/${CTX}/oai?${params}`), {waitUntil: 'load'});
    for (let i = 1; i <= max; i++) {
        await page.waitForLoadState('load').catch(() => {});
        await sleep(500);
        const s = await screen(page).catch(() => null);
        const body = await page.locator('body').innerText().catch(() => '');
        const part = {
            part: i,
            records: (await page.locator('h2.oaiRecordTitle').allInnerTexts()).map((t) => flat(t).replace(/^OAI Record:\s*oai:[^:]+:/, '')),
            setSpecs: (await page.locator('tr').filter({has: page.locator('td.key', {hasText: /^\s*setSpec\s*$/})}).locator('td.value').allInnerTexts()).map((t) => flat(t).replace(/\s*Identifiers\s+Records\s*$/, '')),
            moreResults: /There are more results\./.test(body),
            resume: await page.getByRole('link', {name: 'Resume', exact: true}).count(),
            deleted: (body.match(/This record has been deleted\./g) || []).length,
            error: flat(await page.locator('p.error').first().innerText().catch(() => null), 200),
            errorCode: (body.match(/Error Code\s+(\w+)/) || [])[1] || null,
            title: s ? s.title : null,
        };
        await shot(page, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-part${i}`).catch(() => {});
        parts.push(part);
        if (!part.resume) break;
        await page.getByRole('link', {name: 'Resume', exact: true}).click();
    }
    return parts;
}

/** The dataset fleet server's log: the lines written since this call that name a PHP failure. */
function serverLog(app) {
    const dir = path.join(app.suiteDir, '.server-logs');
    const name = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => f.startsWith(`server-${app.port}`)) : null;
    const full = name ? path.join(dir, name) : null;
    const size = () => (full && fs.existsSync(full) ? fs.statSync(full).size : 0);
    const start = size();
    return {
        file: name,
        since() {
            if (!full) return [];
            const fd = fs.openSync(full, 'r');
            const buf = Buffer.alloc(Math.max(0, size() - start));
            fs.readSync(fd, buf, 0, buf.length, start);
            fs.closeSync(fd);
            return [...new Set(buf.toString('utf8').split('\n').filter((l) => /failed to handle the hook|Uncaught|Fatal|TypeError/.test(l)).map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ''), 700)))];
        },
    };
}

/** The line a walk prints per answer. */
const line = (app, r) =>
    `[fact] ${app.name} ${String(r.step).padEnd(46)} ${r.status} records ${r.count}: ${r.headers.join('; ')}` +
    `${r.error ? ` error "${r.error}"` : ''}${r.token ? ` token ${JSON.stringify(r.token)}` : ' no token'}`;

module.exports = {T, CTX, ISSUE, LIST, sleep, flat, setDriver, publish, unpublish, ask, askAll, view, serverLog, line};
