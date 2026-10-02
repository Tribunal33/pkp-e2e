// Helpers of walk.js (issue report docs/issues/U17-OPS1-archives-empty-server-says-nothing.md):
// a preprint server created on screen, enabled publicly, and the frontend "Archives" page read as data.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const tidy = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/**
 * Administration › "Hosted Servers" › "Create Server", filled, "Enable this preprint server to appear
 * publicly on the site" ticked, saved. Returns the save's status.
 */
async function createServer(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'});
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
    await idle(page).catch(() => null);
    return r.status();
}

/** The open "Archives" page as data: heading, what stands below the archive header, the list and the page links. */
function readArchives(page) {
    return page.evaluate(() => {
        const t = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        const root = document.querySelector('.page_issue_archive');
        if (!root) return {archivePage: false, title: document.title, body: t(document.body.innerText).slice(0, 600)};
        const header = root.querySelector('section.archiveHeader');
        const after = [];
        let past = !header;
        for (const el of root.children) {
            if (el.tagName === 'H1' || el.matches('nav.cmp_breadcrumbs')) continue;
            if (!past) {
                if (el === header || el.contains(header)) past = true;
                continue;
            }
            after.push({tag: el.tagName.toLowerCase(), cls: el.className || '', text: t(el.innerText)});
        }
        return {
            archivePage: true,
            title: document.title,
            heading: t(root.querySelector('h1')?.innerText),
            belowHeader: after,
            preprints: root.querySelectorAll('.cmp_preprint_list > li').length,
            pagination: t(root.querySelector('.cmp_pagination')?.innerText),
            text: t(root.innerText).slice(0, 1200),
        };
    });
}

module.exports = {T, tidy, createServer, readArchives};
