// Helpers for the U04 A17 walk (walk.js beside this file). Requiring it runs nothing.
const {idle, screen, shot, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The context's own ORCID rows (the secret by length only). */
function journalOrcidRows(app) {
    const {table, id, settings} = app.contextTables;
    return sql(app, `select setting_name || '=' || case when setting_name like '%Secret' then '(len ' || length(coalesce(setting_value,'')) || ')' else coalesce(setting_value,'') end from ${settings} where setting_name like 'orcid%' and ${id} = (select ${id} from ${table} where path = '${app.contextPath}') order by 1`).split('\n').filter(Boolean);
}

/** The site's ORCID rows (the secret by length only). */
function siteOrcidRows(app) {
    return sql(app, "select setting_name || '=' || case when setting_name like '%Secret' then '(len ' || length(coalesce(setting_value,'')) || ')' else coalesce(setting_value,'') end from site_settings where setting_name like 'orcid%' order by 1").split('\n').filter(Boolean);
}

/** Administration › Site Settings › Site Setup › ORCID: returns the panel locator. */
async function openSiteOrcid(page, app) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await page.locator('#setup-button').first().click();
    await page.locator('#orcidSiteSettings-button').first().click();
    const panel = page.locator('#orcidSiteSettings');
    await panel.getByRole('checkbox', {name: 'Enable ORCID functionality site-wide'}).waitFor({state: 'visible', timeout: T});
    await idle(page); await sleep(300);
    return panel;
}

/**
 * Press a form's "Save" and return the request it sent (status, body) and the notice.
 * `urlRe` matches the API address the save goes to. Never throws.
 */
async function pressSave(page, panel, urlRe) {
    const out = {};
    try {
        const sent = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await sent;
        if (r) {
            out.status = r.status();
            out.method = r.request().headers()['x-http-method-override'] || r.request().method();
            out.body = flat(r.request().postData(), 800);
        } else {
            out.status = null;
        }
        out.savedNotice = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        await idle(page); await sleep(400);
    } catch (e) {
        out.error = flat(e.message, 400);
    }
    return out;
}

/** Settings › Users & Roles › ORCID of the dataset's context: returns {panel, facts}. */
async function openJournalOrcid(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page);
    await page.getByRole('tab', {name: 'ORCID', exact: true}).click();
    const panel = page.locator('#orcidSettings');
    const box = panel.getByRole('checkbox', {name: 'Enable ORCID functionality'});
    await box.waitFor({state: 'visible', timeout: T});
    await idle(page); await sleep(300);
    const facts = {
        box: {checked: await box.isChecked(), disabled: await box.isDisabled()},
        clientIdInput: await panel.locator('input[name="orcidClientId"]').inputValue().catch(() => null),
        clientSecretInputLength: await panel.locator('input[name="orcidClientSecret"]').inputValue().then((v) => v.length).catch(() => null),
        city: await panel.locator('input[name="orcidCity"]').inputValue().catch(() => null),
        text: flat(await panel.innerText().catch(() => null), 1500),
    };
    return {panel, facts};
}

/** The Identity tab of the signed-in user's profile: the ORCID block as data. */
async function identityOrcid(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`));
    const form = page.locator('form#identityForm');
    await form.waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    const connect = form.locator('#connect-orcid-button');
    return {
        orcidBlock: await form.locator('.orcid_container').count(),
        connect: (await connect.count()) ? flat(await connect.innerText(), 120) : null,
        connectLocator: connect,
    };
}

/** Split an ORCID authorize address into the parts a reader checks. */
function oauthParts(address) {
    try {
        const u = new URL(address);
        return {address, authorize: `${u.origin}${u.pathname}`, clientIdPresent: u.searchParams.has('client_id'), clientId: u.searchParams.get('client_id'), redirectUri: u.searchParams.get('redirect_uri')};
    } catch (e) {
        return {address, unparsable: true};
    }
}

module.exports = {T, sleep, flat, journalOrcidRows, siteOrcidRows, openSiteOrcid, pressSave, openJournalOrcid, identityOrcid, oauthParts, screen, shot};
