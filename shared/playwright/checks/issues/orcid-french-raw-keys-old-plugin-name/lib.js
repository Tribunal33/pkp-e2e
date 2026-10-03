// Helpers of walk.js (issue reports docs/issues/U04-A11-orcid-tabs-named-after-old-plugin.md and
// docs/issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, rawKeys, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Submission S per app: proven through the Native XML export and import on main and 3.5. */
const SUBS = {
    ojs: {id: 8, title: 'Traditions and Trends in the Study of the Commons', first: 'Elinor Ostrom', user: 'eostrom'},
    omp: {id: 2, title: 'The West and Beyond: New Perspectives on an Imagined Region', first: 'Alvin Finkel', user: 'afinkel'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', first: 'Carlo Corino', user: 'ccorino'},
};

/** Screen words per interface language. */
const UI = {
    fr_CA: {
        edit: 'Modifier', add: 'Ajouter un-e contributeur-trice', close: 'Fermer', yes: 'Oui', no: 'Non',
        del: 'Supprimer', orcidLabel: 'Identifiant ORCID', contributors: 'Contributeurs-trices', language: /Fran[cç]ais/i,
    },
    en: {
        edit: 'Edit', add: 'Add Contributor', close: 'Close', yes: 'Yes', no: 'No',
        del: 'Delete', orcidLabel: 'ORCID iD', contributors: 'Contributors', language: /^English/i,
    },
};

/** The initials menu › "Change Language" › the language whose link matches; waits for the address to carry `locale`. */
async function changeLanguage(page, label, locale) {
    await page.locator('[data-cy="app-user-nav"] button').first().click();
    const menu = page.locator('[data-cy="app-user-nav"] nav:visible').first();
    const link = menu.getByRole('link', {name: label}).first();
    const offered = (await menu.getByRole('link').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
    await link.click();
    await page.waitForURL(new RegExp(`/${locale}(/|$|\\?|#)`), {timeout: T});
    await idle(page);
    return {offered, url: page.url()};
}

/** Every visible tab's name and whether it is selected, in page order. */
async function tabNames(page, scope = 'main') {
    return page.locator(`${scope} [role="tab"]`).evaluateAll((ts) => ts
        .filter((t) => t.offsetWidth || t.offsetHeight)
        .map((t) => `${t.innerText.replace(/\s+/g, ' ').trim()}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
}

/** A form's labels, descriptions, checkbox texts and buttons, as shown. */
async function formRead(page, selector) {
    return page.locator(selector).first().evaluate((f) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
        return {
            text: t(f).slice(0, 2500),
            labels: [...f.querySelectorAll('legend, label, .pkpFormFieldLabel')].filter(vis).map(t).filter(Boolean),
            descriptions: [...f.querySelectorAll('.pkpFormField__description, .pkpFormGroup__description')].filter(vis).map(t).filter(Boolean),
            buttons: [...f.querySelectorAll('button')].filter(vis).map(t).filter(Boolean),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}

/** Administration › Site Settings in `locale`: the setup tab, then the ORCID side tab. */
async function openSiteOrcidTab(page, app, locale) {
    await page.goto(app.url(`/index.php/index/${locale}/admin/settings`));
    await idle(page);
    await page.locator('#setup-button').first().click();
    await idle(page);
    const top = await tabNames(page);
    const side = page.locator('#orcidSiteSettings-button');
    const present = await side.count();
    if (present) {
        await side.first().click();
        await idle(page);
        await page.locator('[id="orcidSiteSettings"] form').first().waitFor({timeout: T}).catch(() => {});
        await sleep(500);
    }
    return {tabs: top, orcidTab: present ? flat(await side.first().innerText(), 80) : null};
}

/** Settings › Users & Roles in `locale`: the tab names, then the ORCID tab opened. */
async function openContextOrcidTab(page, app, locale) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
    await idle(page);
    const tabs = await tabNames(page);
    const btn = page.locator('#orcidSettings-button');
    const present = await btn.count();
    if (present) {
        await btn.first().click();
        await idle(page);
        await page.locator('[id="orcidSettings"] form').first().waitFor({timeout: T}).catch(() => {});
        await sleep(500);
    }
    return {tabs, orcidTab: present ? flat(await btn.first().innerText(), 80) : null};
}

/**
 * The workflow of a submission in `locale`, on its Contributors page: by the side menu's
 * entry (main keys the page by the publication id, 3.5 does not; seed-facts.md).
 */
async function openContributors(page, app, subId, locale) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/dashboard/editorial?workflowSubmissionId=${subId}`));
    await idle(page);
    await page.getByRole('dialog').first().waitFor({timeout: T}).catch(() => {});
    await sleep(1000);
    const panel = page.locator('.listPanel--contributor');
    const words = UI[locale];
    const entry = page.getByRole('dialog').first().getByRole('link', {name: words.contributors, exact: true})
        .or(page.getByRole('dialog').first().getByRole('button', {name: words.contributors, exact: true}));
    if (!(await entry.count())) {
        // The entry sits in the publication group, which may be closed.
        const group = page.getByRole('dialog').first().getByRole('button', {name: /^(Publication|Preprint|Prépublication)$/});
        if (await group.count()) await group.first().click().catch(() => {});
        await sleep(500);
    }
    await entry.first().click();
    await idle(page);
    await panel.locator('li.listPanel__item').first().waitFor({timeout: T});
    await sleep(800);
    return {url: page.url(), rows: (await panel.locator('li.listPanel__item').allInnerTexts()).map((t) => flat(t, 160))};
}

/** The side window on top (Add or Edit contributor). */
function sideWindow(page, name) {
    return page.getByRole('dialog', {name, exact: true}).last();
}

/** The ORCID field inside a contributor window, read as shown. */
async function readOrcidField(page, win, locale) {
    const field = win.locator('.pkpFormField--html').filter({hasText: UI[locale].orcidLabel}).first();
    await field.waitFor({timeout: T}).catch(() => {});
    const present = await field.count();
    if (!present) return {present: false};
    return field.evaluate((f) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
        return {
            present: true,
            text: t(f),
            label: t(f.querySelector('.pkpFormFieldLabel') || f),
            note: [...f.querySelectorAll('.pkpFormField__description')].filter(vis).map(t),
            value: [...f.querySelectorAll('.pkpFormField__control--html')].filter(vis).map(t),
            buttons: [...f.querySelectorAll('button')].filter(vis).map((b) => ({text: t(b), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})),
        };
    });
}

/** The question window a field button opened: title, text, buttons. */
async function readQuestion(page) {
    const dlg = page.getByRole('alertdialog').or(page.getByRole('dialog')).last();
    await dlg.waitFor({state: 'visible', timeout: T});
    await sleep(400);
    return {
        dlg,
        read: {
            text: flat(await dlg.innerText(), 600),
            title: flat(await dlg.locator('h1, h2, h3, [class*="title"], [id*="title"]').first().innerText().catch(() => null), 200),
            buttons: (await dlg.getByRole('button').allInnerTexts()).map((t) => flat(t, 60)).filter(Boolean),
        },
    };
}

/** Open a contributor's Edit window by the row's name. */
async function editContributor(page, name, locale) {
    const row = page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: name}).first();
    await row.getByRole('button', {name: UI[locale].edit, exact: true}).click();
    const win = sideWindow(page, UI[locale].edit);
    await win.waitFor({timeout: T});
    await idle(page);
    await sleep(800);
    return win;
}

/** Close a side window by its own "Close", then wait out the modal store's slot (patterns.md pitfall 4). */
async function closeWindow(page, win, locale) {
    await win.getByRole('button', {name: UI[locale].close, exact: true}).first().click();
    await sleep(900);
}

/** The raw codes on the page, kept to `##key##` names with where they sit. */
async function codes(page, scope) {
    return (await rawKeys(page, {scope}).catch(() => [])) || [];
}

/** The author rows' ORCID settings for a submission's current publication. */
function storedOrcid(app, subId) {
    return sql(app, `select a.author_id, a.email, s.setting_name, left(s.setting_value, 60) from authors a join submissions sub on sub.current_publication_id = a.publication_id join author_settings s on s.author_id = a.author_id where sub.submission_id = ${subId} and s.setting_name like 'orcid%' order by 1, 3`).split('\n').filter(Boolean);
}

/** Insert an <orcid> into the first <author> of a Native XML export, after its <email> (pkp-native.xsd order). */
function addOrcidToFirstAuthor(xml, orcid) {
    const start = xml.indexOf('<author ');
    if (start < 0) throw new Error('no <author> in the export');
    const end = xml.indexOf('</author>', start);
    const block = xml.slice(start, end);
    // After <url> when the author has one, else after <email> (the schema's order: email, url, orcid).
    const m = /<url>[^<]*<\/url>/.exec(block) || /<email>[^<]*<\/email>/.exec(block);
    if (!m) throw new Error('first author has no <email>');
    const at = start + m.index + m[0].length;
    return `${xml.slice(0, at)}\n        <orcid>${orcid}</orcid>${xml.slice(at)}`;
}

module.exports = {
    T, sleep, flat, SUBS, UI, changeLanguage, tabNames, formRead, openSiteOrcidTab, openContextOrcidTab,
    openContributors, sideWindow, readOrcidField, readQuestion, editContributor, closeWindow, codes, storedOrcid,
    addOrcidToFirstAuthor, screen,
};
