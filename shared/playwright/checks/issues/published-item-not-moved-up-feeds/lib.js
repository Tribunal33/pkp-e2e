// Helpers of walk.js (U18 A8: publishing does not move a book or preprint up the web feeds).
// Requiring this file runs nothing. Each helper drives a screen a person uses, or reads a
// public feed address as a visitor's feed reader does.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 200) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const FEEDS = ['atom', 'rss2', 'rss'];
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

/** One feed read without a session: status, the feed's own date and its items' titles in order. */
async function feedTitles(request, app, type) {
    const r = await request.get(app.url(`/index.php/${app.contextPath}/gateway/plugin/WebFeedGatewayPlugin/${type}`));
    const body = await r.text();
    const [head, ...blocks] = body.split(type === 'atom' ? /<entry>/ : /<item[ >]/);
    const titles = blocks.map((b) => flat(decode(decode((b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '')).replace(/<[^>]+>/g, ''), 70));
    const date = (head.match(/<(updated|pubDate|dc:date)>([^<]*)</) || [])[2] || null;
    return {status: r.status(), date, titles};
}

/** The three feeds; `same` says whether they list the same titles in the same order. */
async function readFeeds(request, app) {
    const out = {};
    for (const t of FEEDS) out[t] = await feedTitles(request, app, t);
    out.same = FEEDS.every((t) => JSON.stringify(out[t].titles) === JSON.stringify(out.atom.titles));
    return out;
}

/**
 * In the open "Web Feed Plugin" › "Settings" window: `n` typed into "Number of publications
 * to display" (on a journal "Display a fixed number of the most recent publications." chosen
 * too), then "OK". Returns the save's status and whether the window stayed open.
 */
async function saveNumber(page, n) {
    const d = page.locator('[role="dialog"]:visible').last();
    const recent = d.locator('input[name="displayItems"][value="recent"]');
    const out = {recentChoice: (await recent.count()) > 0};
    if (out.recentChoice) await recent.check();
    out.before = await d.locator('input[name="recentItems"]').inputValue();
    await d.locator('input[name="recentItems"]').fill(String(n));
    const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'OK', exact: true}).click();
    const r = await w;
    out.post = r ? r.status() : null;
    await sleep(1000);
    await idle(page).catch(() => {});
    out.stillOpen = (await page.locator('[role="dialog"]:visible').count()) > 0;
    return out;
}

/** Open a submission's workflow (it opens on the latest version). */
async function openWorkflow(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(1500);
}

module.exports = {T, sleep, flat, FEEDS, feedTitles, readFeeds, saveNumber, openWorkflow};
