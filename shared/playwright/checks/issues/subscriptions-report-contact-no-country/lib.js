// Helpers of the U65 OJS4 walk (issue report
// docs/issues/U65-OJS4-subscriptions-report-contact-no-country.md). Requiring this file runs
// nothing. The set-up screens reuse the subscription helpers of earlier issue walks; this file
// adds the press on Statistics › "Reports" › "Subscriptions Report" and the read of its file.
const fs = require('fs');
const {idle, screen, outFile} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/[\s ]+/g, ' ').trim().slice(0, n));

/** A CSV body (byte-order mark already removed) as rows of cells; quoted cells may hold commas and line breaks. */
function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') q = false;
            else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
        else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

/**
 * Statistics › "Reports" (the page's address), then press "Subscriptions Report". Settles on
 * the download event or on the report request's error answer, whichever comes first, and
 * returns what arrived: the file (name, bytes, rows) or the failed request, the page after
 * and its screen. `label` names the kept file.
 */
async function pressSubscriptionsReport(page, app, label) {
    await page.goto(app.url(`/index.php/${app.contextPath}/stats/reports`));
    await idle(page);
    const before = await screen(page);
    const responses = [];
    const onResp = (r) => {
        if (/stats\/reports\/report/.test(r.url())) {
            responses.push({url: r.url().replace(/^.*index\.php/, ''), status: r.status(), contentType: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null});
        }
    };
    page.on('response', onResp);
    const dl = page.waitForEvent('download', {timeout: 60_000});
    dl.catch(() => {});
    const bad = page.waitForResponse((r) => /stats\/reports\/report/.test(r.url()) && r.status() >= 400, {timeout: 60_000}).catch(() => null);
    await page.locator('main').getByRole('link', {name: 'Subscriptions Report', exact: true}).click();
    const first = await Promise.race([dl.then((d) => ({d})), bad.then((r) => (r ? {bad: r} : null))]);
    const out = {reportsPage: {title: before.title, links: flat(before.text.main, 600)}};
    if (!first || first.bad) {
        await page.waitForLoadState('load').catch(() => {});
        await page.waitForTimeout(1500);
        const after = await screen(page);
        out.downloaded = false;
        out.failed = first ? {status: first.bad.status(), body: flat(await first.bad.text().catch(() => '(unread)'), 300)} : 'no download, no error answer';
        out.pageAfter = {url: page.url().replace(/^.*index\.php/, ''), title: after.title, text: flat(after.text.main || after.text.body || '', 300), notices: after.notices};
    } else {
        const d = first.d;
        const buf = fs.readFileSync(await d.path());
        const file = outFile(`${label}.csv`);
        fs.writeFileSync(file, buf);
        const bom = buf.subarray(0, 3).toString('hex') === 'efbbbf';
        const text = buf.toString('utf8');
        out.downloaded = true;
        out.file = {name: d.suggestedFilename(), bytes: buf.length, bom, kept: file};
        out.rows = parseCsv(bom ? text.slice(1) : text);
    }
    await page.waitForTimeout(500);
    page.off('response', onResp);
    out.responses = responses;
    return out;
}

/** The data rows of the file's institutional block, each as {column: value}. */
function institutionalRows(rows) {
    const start = rows.findIndex((r) => r[0] === 'Institutional Subscriptions');
    if (start < 0) return [];
    const head = rows[start + 1] || [];
    return rows.slice(start + 2).filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/** The data rows of the file's individual block, each as {column: value}. */
function individualRows(rows) {
    const start = rows.findIndex((r) => r[0] === 'Individual Subscriptions');
    if (start < 0) return [];
    const head = rows[start + 1] || [];
    const out = [];
    for (const r of rows.slice(start + 2)) {
        if (r.length <= 1) break;
        out.push(Object.fromEntries(head.map((h, i) => [h, r[i]])));
    }
    return out;
}

module.exports = {T, flat, parseCsv, pressSubscriptionsReport, institutionalRows, individualRows};
