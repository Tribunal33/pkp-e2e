// Helpers of walk.js (issue report docs/issues/U65-A9-monthly-report-counts-other-journals.md).
// Requiring this file runs nothing. The screen helpers drive what a person uses; runTask() and
// runJobs() are the commands a site's administrator (or the site's timer) runs in the app root;
// mailbox() reads the slot's Mailpit, attachments included.
const path = require('path');
const {execFileSync} = require('child_process');
const {idle} = require('../../../probe');
const ctxLib = require('../all-dates-error-nothing-published/lib.js');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Statistics › "Editorial Activity" of a context by its address: the chart's total and stages
 * (`[[name, count]…]`), or `chart: false` where the page draws none (OPS).
 */
async function readEditorialActivity(page, app, ctx) {
    const r = await page.goto(app.url(`/index.php/${ctx}/en/stats/editorial`));
    await idle(page).catch(() => {});
    await page.getByRole('table', {name: 'Trends'}).locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await sleep(800);
    const chart = page.locator('main .pkpStats__graph');
    if (!(await chart.count())) return {status: r ? r.status() : null, chart: false};
    const total = flat(await chart.locator('h2.pkpStats--editorial__stage--total').innerText().catch(() => null), 80);
    const stages = await chart.locator('.pkpStats--editorial__stageList > div.pkpStats--editorial__stage').evaluateAll((blocks) =>
        blocks.map((b) => [
            (b.querySelector('.pkpStats--editorial__stageLabel') || {textContent: ''}).textContent.trim(),
            (b.querySelector('.pkpStats--editorial__stageCount') || {textContent: ''}).textContent.trim(),
        ])
    );
    return {status: r ? r.status() : null, chart: true, total, stages};
}

function php(app, args) {
    const command = `php ${args.map((a) => (/[\\\s]/.test(a) ? `'${a}'` : a)).join(' ')}`;
    try {
        const out = execFileSync('php', args, {
            cwd: path.resolve(REPO, app.root),
            env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
            encoding: 'utf8',
            timeout: 300_000,
        });
        return {command, status: 0, out: flat(out, 1500)};
    } catch (e) {
        return {command, status: e.status, out: flat(`${e.stdout || ''} ${e.stderr || ''}`, 1500)};
    }
}

/** The monthly task, run now as the site's scheduler runs it on the 1st. */
function runTask(app) {
    return php(app, ['lib/pkp/tools/scheduler.php', 'test', '--name=PKP\\task\\StatisticsReport']);
}

/** The waiting jobs, run from the command line. */
function runJobs(app) {
    return php(app, ['lib/pkp/tools/jobs.php', 'run']);
}

/** The messages to `to` received since `since`, newest first, with their attachments' text. */
async function mailbox(app, to, since) {
    const base = app.mail.url;
    const res = await (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=50`)).json();
    const from = new Date(since).getTime();
    const out = [];
    for (const m of res.messages || []) {
        if (new Date(m.Created).getTime() < from) continue;
        const full = await (await fetch(`${base}/api/v1/message/${m.ID}`)).json();
        const attachments = [];
        for (const a of full.Attachments || []) {
            const buf = Buffer.from(await (await fetch(`${base}/api/v1/message/${m.ID}/part/${a.PartID}`)).arrayBuffer());
            attachments.push({name: a.FileName, bom: buf.subarray(0, 3).toString('hex') === 'efbbbf', text: buf.toString('utf8').replace(/^﻿/, '')});
        }
        out.push({created: m.Created, subject: full.Subject, from: (full.From || {}).Address, text: flat(full.Text, 900), attachments});
    }
    return out;
}

/** The "Active Submissions" block of an editorial-report.csv: `[[name, count]…]`, header first. */
function activeBlock(csv) {
    const lines = String(csv || '').split(/\r?\n/);
    const out = [];
    for (const l of lines) {
        if (!l.trim()) break;
        out.push(l.split(',').map((c) => c.replace(/^"|"$/g, '')));
    }
    return out;
}

/** Poll the mailbox until `n` messages from `fromAddress` arrived (or the time is up). */
async function waitFor(app, to, since, fromAddress, n = 1, ms = 45_000) {
    const end = Date.now() + ms;
    for (;;) {
        const box = (await mailbox(app, to, since)).filter((m) => m.from === fromAddress);
        if (box.length >= n || Date.now() > end) return box;
        await sleep(1500);
    }
}

module.exports = {T, sleep, flat, createContext: ctxLib.createContext, WORDS: ctxLib.WORDS, readEditorialActivity, runTask, runJobs, mailbox, activeBlock, waitFor};
