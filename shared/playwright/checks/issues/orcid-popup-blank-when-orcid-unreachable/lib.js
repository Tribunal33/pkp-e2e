// Helpers for the orcid-popup-blank-when-orcid-unreachable walk (U04 A18). Requiring this
// file runs nothing.
//
// ORCID's own site, as the browser meets it, is answered by support/orcid.js
// (`stubOrcidSite`). The app server's token request (`POST <orcid>/oauth/token`, made by
// PKP\orcid\actions\AuthorizeUserData::execute()) goes through the fleet's `[proxy]`:
//   - `off`: the fleet's own dead-port proxy (http://127.0.0.1:9), so the request cannot
//     connect, as on an install that cannot reach ORCID (the Steps' precondition);
//   - any other row: the local stand-in of checks/sync/pkp-lib-13493/orcid-token-stub.js,
//     which answers the token request with the row's status and body (its header says how
//     the fleet's server is started so PHP trusts it).
const fs = require('fs');
const {screen, shot, serverLog, outFile} = require('../../../probe');
const {stubOrcidSite} = require('../../../support/orcid');

const DEAD_PROXY = 'http://127.0.0.1:9';
const CODE = 'abc123';
const TELLS = '[role="alert"], [role="status"], [role="alertdialog"], [role="dialog"], .app__notifications .pkpNotification, .pkp_notification, .ui-pnotify';

const firstLine = (error) => String((error && error.message) || error).split('\n')[0];
const clip = (text, length = 1500) => (text === null || text === undefined ? text : String(text).length > length ? `${String(text).slice(0, length)}… (${String(text).length} chars)` : String(text));

/**
 * Set the fleet config's two `[proxy]` lines to `url` (the config is read on every request).
 *
 * @returns {string|null} the http_proxy value found
 */
function setProxy(configFile, url) {
    const before = fs.readFileSync(configFile, 'utf8');
    fs.writeFileSync(configFile, before.replace(/^(https?_proxy)\s*=.*$/gm, `$1 = "${url}"`));
    return (before.match(/^http_proxy\s*=\s*"?([^"\n]*)"?/m) || [])[1] || null;
}

/** The visible notices, alerts and dialogs of a page, as text. */
async function tells(page) {
    return page
        .evaluate(
            (selector) =>
                [...document.querySelectorAll(selector)]
                    .filter((element) => element.getClientRects().length > 0)
                    .map((element) => ({role: element.getAttribute('role'), class: String(element.className || '').slice(0, 80), text: (element.innerText || '').replace(/\s+/g, ' ').trim()}))
                    .filter((tell) => tell.text),
            TELLS,
        )
        .catch(() => []);
}

/** The server log's lines since `from` that are not plain request lines. */
function logSince(file, from) {
    if (!fs.existsSync(file)) return [];
    return fs
        .readFileSync(file)
        .subarray(from)
        .toString('utf8')
        .split('\n')
        .filter((line) => line.trim() && !/\] 127\.0\.0\.1:\d+ (Accepted|Closing|Closed)/.test(line) && !/\] 127\.0\.0\.1:\d+ \[[234]\d\d\]: /.test(line))
        .map((line) => clip(line, 700))
        .slice(0, 30);
}

/** The registration form's fields the popup's script writes, and the connect button. */
async function registerForm(page) {
    return page.evaluate(() => {
        const v = (id) => {
            const e = document.getElementById(id);
            return e ? e.value : '(no field)';
        };
        const b = document.getElementById('connect-orcid-button');
        return {
            givenName: v('givenName'),
            familyName: v('familyName'),
            email: v('email'),
            country: v('country'),
            affiliation: v('affiliation'),
            orcid: v('orcid'),
            connectButtonShown: !!(b && b.getClientRects().length && getComputedStyle(b).display !== 'none'),
        };
    });
}

/**
 * One return from ORCID: press the page's ORCID button, then send the popup to the
 * address ORCID would send it back to (its `redirect_uri` with `&code=abc123`), and
 * record what the popup and the page under it show.
 *
 * @param {object} o
 * @param {object} o.app the probe bag
 * @param {string} o.name the record's name
 * @param {string} o.row `off` | a stand-in answer name
 * @param {string} o.configFile the fleet's config
 * @param {object|null} o.stub the started stand-in (null when every row is `off`)
 * @param {import('@playwright/test').Page} o.page the page holding the button
 * @param {import('@playwright/test').Locator} o.button the "Create or Connect your ORCID iD" button
 * @param {() => Promise<object>} o.after what the page holds afterwards
 */
async function driveReturn({app, name, row, configFile, stub, page, button, after}) {
    const facts = {row, tokenEndpoint: row === 'off' ? `no stand-in: [proxy] ${DEAD_PROXY} (nothing listens)` : `${stub.answers[row].status} ${stub.answers[row].body}`};
    const dialogs = [];
    const onDialog = (dialog) => {
        dialogs.push({type: dialog.type(), message: dialog.message()});
        dialog.dismiss().catch(() => {});
    };
    page.on('dialog', onDialog);
    const context = page.context();
    const seen = {};
    // The return is fetched by the route so that its status and body are read before the
    // popup's script runs (it may close the window). The app first answers 302 to the same
    // address with the locale in it; the route follows that and hands the popup the answer.
    const capture = async (route) => {
        try {
            let response = await route.fetch({maxRedirects: 0, timeout: 110_000});
            seen.hops = [];
            for (let hop = 0; hop < 3 && response.status() >= 300 && response.status() < 400 && /\/orcid\/authorizeOrcid/.test(response.headers().location || ''); hop++) {
                seen.hops.push({status: response.status(), location: response.headers().location});
                response = await context.request.get(response.headers().location, {maxRedirects: 0, timeout: 110_000, headers: {accept: route.request().headers().accept || 'text/html'}});
            }
            seen.status = response.status();
            seen.contentType = response.headers()['content-type'] || null;
            seen.body = await response.text();
            await route.fulfill({response});
        } catch (error) {
            seen.error = firstLine(error);
            await route.abort().catch(() => {});
        }
    };
    const popupErrors = [];
    const popupDialogs = [];
    let popup = null;
    try {
        if (row === 'off') {
            setProxy(configFile, DEAD_PROXY);
        } else {
            setProxy(configFile, stub.proxyUrl);
            stub.setAnswer(row);
        }
        await stubOrcidSite(context);
        facts.buttonPressed = (await button.innerText({timeout: 10_000}).catch(() => null)) || null;
        [popup] = await Promise.all([page.waitForEvent('popup', {timeout: 20_000}), button.click()]);
        popup.on('pageerror', (error) => popupErrors.push(`uncaught: ${firstLine(error)}`));
        popup.on('console', (message) => message.type() === 'error' && popupErrors.push(`console: ${message.text().slice(0, 300)}`));
        // an alert() the popup's own script shows (the person reads it and presses "OK")
        popup.on('dialog', (dialog) => {
            popupDialogs.push({type: dialog.type(), message: dialog.message()});
            dialog.accept().catch(() => {});
        });
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        const authorize = new URL(popup.url());
        facts.authorize = {origin: authorize.origin, path: authorize.pathname, client_id: authorize.searchParams.get('client_id'), scope: authorize.searchParams.get('scope')};
        const redirectUri = authorize.searchParams.get('redirect_uri');
        facts.redirectUri = redirectUri ? redirectUri.replace(/^https?:\/\/[^/]+/, '') : null;
        if (!redirectUri) throw new Error('the popup address carries no redirect_uri');
        const returnUrl = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${CODE}`;
        facts.returnUrl = returnUrl.replace(/^https?:\/\/[^/]+/, '');

        const baseline = new Set((await tells(page)).map((tell) => tell.text));
        const log = serverLog(app);
        const logFrom = log.mark();
        const stubFrom = stub ? stub.mark() : 0;
        await context.route(/\/orcid\/authorizeOrcid/, capture);
        // The popup's own document navigates, as ORCID's page does when it sends the user
        // back (a popup.goto() would cut window.opener, which no user meets).
        const answered = context.waitForEvent('response', {predicate: (response) => /\/orcid\/authorizeOrcid/.test(response.url()), timeout: 115_000}).catch((error) => {
            facts.navigation = firstLine(error);
        });
        await popup.evaluate((url) => window.location.assign(url), returnUrl).catch(() => {});
        await answered;

        // the page under the popup, watched for six seconds: a notice lives five
        const told = [];
        let shotTaken = false;
        const until = Date.now() + 6000;
        while (Date.now() < until) {
            for (const tell of await tells(page)) {
                if (!baseline.has(tell.text) && !told.some((earlier) => earlier.text === tell.text)) told.push(tell);
            }
            if (told.length && !shotTaken) {
                shotTaken = true;
                await shot(page, `${name}-told`).catch(() => {});
            }
            await page.waitForTimeout(250);
        }
        facts.popupClosed = popup.isClosed();
        if (!facts.popupClosed) {
            facts.popup = {url: popup.url().replace(/^https?:\/\/[^/]+/, ''), title: await popup.title().catch(() => null), text: clip(await popup.locator('body').innerText({timeout: 3000}).catch(() => null), 800)};
            await popup.screenshot({path: outFile(`${name}-popup.png`)}).catch(() => {});
        }
        facts.popupErrors = popupErrors;
        facts.return = {status: seen.status ?? null, ...(seen.hops && seen.hops.length ? {after: seen.hops.map((h) => h.status)} : {}), contentType: seen.contentType ?? null, ...(seen.error ? {error: seen.error} : {}), body: clip((seen.body || '').replace(/\s+/g, ' ').trim())};
        // the message(s) the popup's script hands the page (as main writes it, or JSON-encoded)
        facts.emitted = [...(seen.body || '').matchAll(/\$emit\("notify", "([\s\S]*?)", "warning"\)/g)].map((match) => match[1]);
        facts.popupDialogs = popupDialogs;
        facts.dialogs = dialogs;
        facts.told = told;
        const read = await screen(page).catch(() => null);
        facts.notices = read ? read.notices : null;
        facts.screen = read;
        if (!shotTaken) await shot(page, name).catch(() => {});
        facts.after = await after().catch((error) => ({error: firstLine(error)}));
        if (stub) facts.standIn = stub.since(stubFrom);
        facts.serverLog = logSince(log.file, logFrom);
    } catch (error) {
        facts.error = firstLine(error);
    } finally {
        page.off('dialog', onDialog);
        await context.unroute(/\/orcid\/authorizeOrcid/, capture).catch(() => {});
        if (popup && !popup.isClosed()) await popup.close().catch(() => {});
    }
    const shown = [...(facts.notices || []), ...(facts.told || []).filter((tell) => !/app__notifications|pkpNotification/.test(tell.class)).map((tell) => tell.text), ...dialogs.map((d) => `${d.type}: ${d.message}`)].map((text) => `"${text}"`).join(' + ') || 'nothing';
    const inPopup = popupDialogs.map((d) => `${d.type} "${d.message}"`).join(' + ');
    facts.summary = `HTTP ${facts.return ? facts.return.status : '?'} · popup ${inPopup ? `showed ${inPopup}, then ` : ''}${facts.popupClosed ? 'closed' : 'stayed open'}${popupErrors.some((e) => e.startsWith('uncaught')) ? ` (popup script: ${popupErrors.filter((e) => e.startsWith('uncaught')).join('; ')})` : ''} · page showed ${shown}${facts.error ? ` · ERROR ${facts.error}` : ''}`;
    return facts;
}

module.exports = {DEAD_PROXY, setProxy, tells, logSince, registerForm, driveReturn, firstLine};
