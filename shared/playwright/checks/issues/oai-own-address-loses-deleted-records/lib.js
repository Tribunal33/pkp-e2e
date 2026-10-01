// Helpers of walk.js (issue report docs/issues/U19-A1-oai-own-address-loses-deleted-records.md).
// Requiring this file runs nothing. Every helper drives a screen a person uses, or reads an
// OAI address as a harvester does.
const {idle} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', unpublish: 'Unpublish'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', unpublish: 'Unpublish'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', unpublish: 'Unpost'},
};

/**
 * Administration › Hosted Journals (Presses, Servers) › "Create …", filled, "Enable this journal
 * to appear publicly on the site" ticked, saved. Returns the save's status.
 */
async function createPublicContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/** A submission's workflow › "Unpublish" ("Unpost"), confirmed. Returns the request's status and the question asked. */
async function unpublish(page, app, ctx, sid) {
    const word = WORDS[app.name].unpublish;
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page).catch(() => {});
    const button = page.getByRole('dialog').getByRole('button', {name: word, exact: true}).first();
    await button.waitFor({timeout: T});
    await sleep(1000);
    await button.click();
    const win = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
    await win.waitFor({timeout: T});
    const question = flat(await win.innerText(), 300);
    const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: word, exact: true}).click();
    const r = await w;
    await idle(page).catch(() => {});
    await sleep(1000);
    return {status: r ? r.status() : null, question};
}

/** One OAI address read as a harvester (no session), as data: the error or the headers. */
async function oai(app, ctx, params) {
    const a = await readOai(app.baseURL, ctx, params);
    return {
        address: `/index.php/${ctx}/oai?${params}`,
        status: a.status,
        error: a.error ? `${a.error.code}: ${a.error.message}` : null,
        headers: a.headers.map((h) => `${h.deleted ? 'DELETED ' : ''}${h.identifier} ${h.datestamp} [${h.setSpecs.join(', ')}]`),
        earliestDatestamp: a.identify ? a.identify.earliestDatestamp : undefined,
        sets: a.sets.length ? a.sets.map((s) => s.spec) : undefined,
        responseDate: a.responseDate,
    };
}

module.exports = {T, sleep, flat, WORDS, createPublicContext, unpublish, oai};
