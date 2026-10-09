// PR review check — pkp/pkp-lib#13283 on `main` (pkp-lib#13493 with ojs#5920, omp#2503, ops#1444),
// acceptance criterion 3: "ORCID functionality configured with an incorrect client secret should
// display a popup error when attempting to connect a user profile to ORCID rather than throwing a
// fatal error." The code is `PKP\orcid\actions\AuthorizeUserData::execute()`, reached when ORCID
// sends the browser back to `<context>/orcid/authorizeOrcid?targetOp=profile&code=…` (also
// `targetOp=invitation`): the app server POSTs the code with the client ID and secret to ORCID's
// `oauth/token`, and a wrong secret is answered 401 with a JSON body.
//
// No call reaches ORCID. The browser's requests to ORCID's site are answered by
// `stubOrcidSite()`; the app server's token request goes to `orcid-token-stub.js`, a local
// stand-in this script starts on 127.0.0.1:8670 (STUB_PORT) and points the fleet's
// `[proxy] http_proxy` / `https_proxy` at (in `config.test.ds<n>.inc.php`, the fleet's generated
// config; the shipped dead-port value is put back at the end). The stand-in ends TLS with a
// throwaway CA, which the app cannot be told to trust (no `verify` option on its Guzzle client,
// no config.inc.php key), so PHP is: the fleet's servers are started once with the stand-in's
// php.ini fragment (`curl.cainfo`) on PHP's scan path. Without that step every stand-in row
// reads as a failed TLS handshake (cURL error 60), which is a connection failure, not the 401.
//
//   D=$PWD/.reports/pr13493d/pf/orcid-stub
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir $D
//   npm run probe-servers -- --stop --dataset 4
//   PHP_INI_SCAN_DIR=:$D/php npm run probe-servers -- --start --dataset 4
//   npm run fleet-prep -- --feature pr13493d --dataset 4 --reset
//   PROBE_FEATURE=pr13493d PROBE_AGENT=pf node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13493/profile-connect-error.js
//
// (The servers inherit the variable, and a reset leaves a running server alone, so the first
// three lines are needed once per fleet; the CA is kept between runs. `$D` is this script's own
// `<output folder>/orcid-stub`. Each run starts from a reset: the `200-token` row leaves the
// author with a verified iD.)
//
// Per app, on the freshly loaded default dataset: `dbarnes` turns ORCID on for `publicknowledge`
// (Settings > Users & Roles > "ORCID": "Enable ORCID functionality", "Public Sandbox", Client ID
// `APP-TEST`, Client Secret `test-secret`). Then, for each token-endpoint answer (ROWS below; `off`
// is the fleet's own dead-port proxy, a connection failure, the others are the stand-in's):
//   profile     an author (AUTHOR below) opens the profile's Identity tab and presses "Create or
//               Connect your ORCID iD"; the popup's `redirect_uri` is read, and that address with
//               `&code=abc123` added is loaded in the popup window, standing in for ORCID's
//               redirect after the user authorizes (the popup's document navigates there itself,
//               so `opener` is the profile page, as in real use);
//   invitation  `dbarnes` invites a new address to a role (Users & Roles > "Invite to a role"),
//               the emailed "Accept Invitation" link is opened signed out, and "Verify ORCID iD"
//               on the wizard's first step opens the popup; the same return is loaded there.
// Recorded per row in result-<pkp-lib sha>-<app>.json: the HTTP status and body of the return
// (the script the app echoes), the message it emits, whether the popup closed (its text when it
// did not), every notice, alert or dialog the opener page then showed, verbatim, the Identity
// tab's ORCID block (the wizard's step) afterwards, the user's `orcid*` settings (names; token
// values are not written), what the stand-in received and the server log lines written since.
// Screenshots <target>-<sha>-<row>-<app>.png, the stand-in's log stub-<sha>-<app>.log. No
// assertions: the script records what the app shows and never throws on a row.
//
// ROWS_ONLY=401-invalid-client,200-token narrows the rows; TARGETS=profile narrows the targets.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, idle, shot, record, sql, serverLog, outFile, outDir} = require('../../../probe');
const {datasetFleet} = require('../../../dataset');
const {stubOrcidSite} = require('../../../support/orcid');
const {startStub, ANSWERS, DEFAULT_PORT} = require('./orcid-token-stub');

const MANAGER = 'dbarnes';
const AUTHOR = {ojs: 'ccorino', omp: 'afinkel', ops: 'ccorino'};
const INVITED_ROLE = {ojs: 'Copyeditor', omp: 'Copyeditor', ops: 'Moderator'};
const CLIENT_ID = 'APP-TEST';
const CLIENT_SECRET = 'test-secret';
const CODE = 'abc123';
const DEAD_PROXY = 'http://127.0.0.1:9';
const ROWS = ['off', '401-invalid-client', '401-not-json', '401-empty-object', '400-invalid-grant', '500', '200-token'];
const rowsOnly = (process.env.ROWS_ONLY || '').split(',').filter(Boolean);
const targets = (process.env.TARGETS || 'profile,invitation').split(',').filter(Boolean);
const STUB_PORT = Number(process.env.STUB_PORT || DEFAULT_PORT);

// Anything a page uses to tell the user something: the Vue pages' toasts, the legacy
// notifications, and any alert, status or dialog role.
const TELLS = '[role="alert"], [role="status"], [role="alertdialog"], [role="dialog"], .app__notifications .pkpNotification, .pkp_notification, .ui-pnotify';

let stub = null;

function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const firstLine = (error) => String((error && error.message) || error).split('\n')[0];
const clip = (text, length = 1500) => (text === null || text === undefined ? text : String(text).length > length ? `${String(text).slice(0, length)}… (${String(text).length} chars)` : String(text));

/** The fleet's `[proxy]` lines, set to `url` (the config is read on every request). */
function setProxy(configFile, url) {
    const before = fs.readFileSync(configFile, 'utf8');
    const after = before.replace(/^(https?_proxy)\s*=.*$/gm, `$1 = "${url}"`);
    fs.writeFileSync(configFile, after);
    return (before.match(/^http_proxy\s*=\s*"?([^"\n]*)"?/m) || [])[1] || null;
}

/** The visible notices, alerts and dialogs of a page, as text. */
async function tells(page) {
    return page
        .evaluate(
            (selector) =>
                [...document.querySelectorAll(selector)]
                    .filter((element) => element.getClientRects().length > 0)
                    .map((element) => ({
                        role: element.getAttribute('role'),
                        class: String(element.className || '').slice(0, 80),
                        text: (element.innerText || '').replace(/\s+/g, ' ').trim(),
                    }))
                    .filter((tell) => tell.text),
            TELLS,
        )
        .catch(() => []);
}

/** Every line the server wrote since `from` that is not a plain request line. */
function logSince(file, from) {
    if (!fs.existsSync(file)) {
        return [];
    }
    return fs
        .readFileSync(file)
        .subarray(from)
        .toString('utf8')
        .split('\n')
        .filter((line) => line.trim() && !/\] 127\.0\.0\.1:\d+ (Accepted|Closing|Closed)/.test(line) && !/\] 127\.0\.0\.1:\d+ \[[234]\d\d\]: /.test(line))
        .map((line) => clip(line, 700))
        .slice(0, 30);
}

/**
 * One row: ORCID's redirect back to the app, loaded in the popup the page opened.
 *
 * @param {object} o
 * @param {object} o.app the bag
 * @param {string} o.sha pkp-lib's
 * @param {string} o.target profile | invitation
 * @param {string} o.row a name of ROWS
 * @param {string} o.configFile the fleet's config
 * @param {import('@playwright/test').Page} o.page the opener
 * @param {() => Promise<import('@playwright/test').Page>} o.openPopup presses the button, returns the popup
 * @param {() => Promise<object>} o.after what the opener holds afterwards
 */
async function driveReturn({app, sha, target, row, configFile, page, openPopup, after}) {
    const facts = {target, row, tokenEndpoint: row === 'off' ? `no stand-in: [proxy] ${DEAD_PROXY} (connection refused)` : `${ANSWERS[row].status} ${ANSWERS[row].body}`};
    const dialogs = [];
    const onDialog = (dialog) => {
        dialogs.push({type: dialog.type(), message: dialog.message()});
        dialog.dismiss().catch(() => {});
    };
    page.on('dialog', onDialog);
    const context = page.context();
    const seen = {};
    // The return is fetched here so that its status and body are read before the popup's script
    // runs (it closes the window). The app first answers 302 to the same address with the locale
    // in it (`/en/`); a redirect the browser follows itself is not routed again, so the route
    // follows it and hands the popup the final answer under the address ORCID was given.
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
            seen.location = response.headers().location || null;
            seen.body = await response.text();
            await route.fulfill({response});
        } catch (error) {
            seen.error = firstLine(error);
            await route.abort().catch(() => {});
        }
    };
    const popupErrors = [];
    let popup = null;
    try {
        if (row === 'off') {
            setProxy(configFile, DEAD_PROXY);
        } else {
            setProxy(configFile, stub.proxyUrl);
            stub.setAnswer(row);
        }
        const popupPromise = openPopup();
        popup = await popupPromise;
        popup.on('pageerror', (error) => popupErrors.push(`uncaught: ${firstLine(error)}`));
        popup.on('console', (message) => message.type() === 'error' && popupErrors.push(`console: ${message.text().slice(0, 300)}`));
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        facts.authorizeUrl = popup.url();
        const authorize = new URL(facts.authorizeUrl);
        facts.authorize = {origin: authorize.origin, path: authorize.pathname, client_id: authorize.searchParams.get('client_id'), scope: authorize.searchParams.get('scope')};
        const redirectUri = authorize.searchParams.get('redirect_uri');
        facts.redirectUri = redirectUri;
        if (!redirectUri) {
            throw new Error('the popup address carries no redirect_uri');
        }
        const returnUrl = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${CODE}`;
        facts.returnUrl = returnUrl;

        const baseline = new Set((await tells(page)).map((tell) => tell.text));
        const log = serverLog(app);
        const logFrom = log.mark();
        const stubFrom = stub.mark();
        await context.route(/\/orcid\/authorizeOrcid/, capture);
        // The popup's own document navigates, as ORCID's page does when it sends the user back.
        // (`popup.goto()` would be a navigation typed into the address bar: from ORCID's site
        // to the app's, Chromium gives such a window a new browsing context group and
        // `window.opener` reads null, which no user meets.)
        const answered = context.waitForEvent('response', {predicate: (response) => /\/orcid\/authorizeOrcid/.test(response.url()), timeout: 115_000}).catch((error) => {
            facts.navigation = firstLine(error);
        });
        await popup.evaluate((url) => window.location.assign(url), returnUrl).catch(() => {});
        await answered;

        // the opener, watched for six seconds: a toast lives five
        const told = [];
        let shotTaken = false;
        const until = Date.now() + 6000;
        while (Date.now() < until) {
            for (const tell of await tells(page)) {
                if (!baseline.has(tell.text) && !told.some((earlier) => earlier.text === tell.text)) {
                    told.push(tell);
                }
            }
            if (told.length && !shotTaken) {
                shotTaken = true;
                facts.screenshot = path.basename(await shot(page, `${target}-${sha}-${row}`));
            }
            await page.waitForTimeout(250);
        }
        facts.popupClosed = popup.isClosed();
        if (!facts.popupClosed) {
            facts.popup = {
                url: popup.url(),
                title: await popup.title().catch(() => null),
                text: clip(await popup.locator('body').innerText({timeout: 3000}).catch(() => null), 800),
            };
            await popup.screenshot({path: outFile(`${target}-${sha}-${row}-popup.png`)}).catch(() => {});
        }
        facts.popupErrors = popupErrors;
        facts.return = {status: seen.status ?? null, ...(seen.hops && seen.hops.length ? {after: seen.hops} : {}), contentType: seen.contentType ?? null, ...(seen.location ? {location: seen.location} : {}), ...(seen.error ? {error: seen.error} : {}), body: clip((seen.body || '').replace(/\s+/g, ' ').trim())};
        // the message(s) the echoed script hands the opener's notification
        facts.emitted = [...(seen.body || '').matchAll(/\$emit\("notify", "([\s\S]*?)", "warning"\);/g)].map((match) => match[1]);
        facts.openerDialogs = dialogs;
        facts.openerTold = told;
        const read = await screen(page).catch(() => null);
        facts.openerNotices = read ? read.notices : null;
        if (!shotTaken) {
            facts.screenshot = path.basename(await shot(page, `${target}-${sha}-${row}`));
        }
        facts.after = await after().catch((error) => ({error: firstLine(error)}));
        facts.standIn = stub.since(stubFrom);
        facts.serverLog = logSince(log.file, logFrom);
    } catch (error) {
        facts.error = firstLine(error);
    } finally {
        page.off('dialog', onDialog);
        await context.unroute(/\/orcid\/authorizeOrcid/, capture).catch(() => {});
        if (popup && !popup.isClosed()) {
            await popup.close().catch(() => {});
        }
    }
    // the kit's notices leave the toast's close button out; anything else told is printed as read
    const told = [...(facts.openerNotices || []), ...(facts.openerTold || []).filter((tell) => !/app__notifications|pkpNotification/.test(tell.class)).map((tell) => tell.text), ...(facts.openerDialogs || []).map((dialog) => `${dialog.type}: ${dialog.message}`)].map((text) => `"${text}"`).join(' + ') || 'nothing';
    console.log(`[${app.name}] ${sha} ${target} ${row}: HTTP ${facts.return ? facts.return.status : '?'} · popup ${facts.popupClosed ? 'closed' : 'stayed open'} · opener showed ${told}${facts.error ? ` · ${facts.error}` : ''}`);
    return facts;
}

forEachApp(async (app) => {
    if (!app.dataset) {
        throw new Error('this check drives a dataset fleet: fleet-prep --dataset (see the header)');
    }
    const fleet = datasetFleet(app.name, app.dataset);
    const root = path.resolve(fleet.root);
    const configFile = path.resolve(fleet.configFile);
    const sha = execFileSync('git', ['-C', path.join(root, 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim();
    const {OrcidSettingsTab, ProfileIdentityPage} = require(path.join(app.suiteDir, 'pages', 'OrcidPages.js'));
    const action = fs.readFileSync(path.join(root, 'lib/pkp/classes/orcid/actions/AuthorizeUserData.php'), 'utf8');
    stub = stub || (await startStub({dir: path.join(outDir(), 'orcid-stub'), port: STUB_PORT}));
    const stubFrom = stub.mark();
    const author = AUTHOR[app.name];
    const rows = ROWS.filter((row) => !rowsOnly.length || rowsOnly.includes(row));
    const R = {
        app: app.name,
        pkpLib: sha,
        headComposesMessage: /function getAuthErrorDisplayMessage/.test(action), // false at the PR base
        standIn: {proxy: stub.proxyUrl, ca: path.relative(process.cwd(), stub.caFile), caIsNew: stub.caIsNew},
        rows: [],
    };
    const shipped = setProxy(configFile, DEAD_PROXY);
    R.proxyAsFound = shipped;

    const manager = await launch(app);
    const user = await launch(app);
    const invitee = await launch(app);
    try {
        // ORCID on, through the screens
        await signIn(manager.page, MANAGER, {contextPath: app.contextPath});
        try {
            const settings = new OrcidSettingsTab(manager.page, app.contextPath);
            await settings.goto();
            await settings.enableCheckbox.check();
            await settings.apiSelect.selectOption({label: 'Public Sandbox'});
            await settings.clientIdInput.fill(CLIENT_ID);
            await settings.clientSecretInput.fill(CLIENT_SECRET);
            await settings.save();
            await idle(manager.page);
            await shot(manager.page, `settings-${sha}`);
        } catch (error) {
            R.settingsError = firstLine(error);
        }
        const {id: contextId, settings: settingsTable} = app.contextTables;
        R.orcidSettings = sql(
            app,
            `SELECT setting_name || '=' || CASE WHEN setting_name = 'orcidClientSecret' THEN '(' || length(setting_value) || ' chars)' ELSE setting_value END FROM ${settingsTable} WHERE ${contextId} = (SELECT ${contextId} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}') AND setting_name LIKE 'orcid%' ORDER BY 1`,
        ).split('\n');

        // --- targetOp=profile -------------------------------------------------------------
        if (targets.includes('profile')) {
            await signIn(user.page, author, {contextPath: app.contextPath});
            const identity = new ProfileIdentityPage(user.page, app.contextPath);
            const userSettings = () =>
                sql(
                    app,
                    `SELECT setting_name || '=' || CASE WHEN setting_name LIKE '%Token' THEN '(set)' ELSE coalesce(setting_value, '') END FROM user_settings WHERE user_id = (SELECT user_id FROM users WHERE username = '${author}') AND setting_name LIKE 'orcid%' AND coalesce(setting_value, '') <> '' ORDER BY 1`,
                )
                    .split('\n')
                    .filter(Boolean);
            for (const row of rows) {
                let buttonBefore = null;
                const facts = await driveReturn({
                    app,
                    sha,
                    target: 'profile',
                    row,
                    configFile,
                    page: user.page,
                    openPopup: async () => {
                        await identity.goto();
                        await idle(user.page);
                        buttonBefore = (await identity.connectButton.innerText({timeout: 5000}).catch(() => null)) || null;
                        return identity.pressConnect();
                    },
                    after: async () => {
                        await idle(user.page);
                        return {
                            url: user.page.url(),
                            orcidBlock: ((await identity.orcidContainer.innerText({timeout: 5000}).catch(() => null)) || '').replace(/\s+/g, ' ').trim() || null,
                            connectButton: (await identity.connectButton.count()) ? (await identity.connectButton.innerText()).trim() : null,
                            verifiedLink: (await identity.orcidLink.count()) ? {text: (await identity.orcidLink.innerText()).trim(), href: await identity.orcidLink.getAttribute('href')} : null,
                            userOrcidSettings: userSettings(),
                        };
                    },
                });
                facts.user = author;
                facts.buttonPressed = buttonBefore;
                R.rows.push(facts);
                record(`result-${sha}`, R);
            }
        }

        // --- targetOp=invitation ----------------------------------------------------------
        if (targets.includes('invitation')) {
            const recipient = `pr13493-${app.name}-${Date.now().toString(36)}@mail.test`;
            const invitation = {recipient, role: INVITED_ROLE[app.name]};
            R.invitation = invitation;
            let wizard = null;
            try {
                // Users & Roles > "Invite to a role": "Search User", "Enter details", the email, "Invitation Sent"
                // (the steps of the suites' U06 page objects, which differ per app, written once here)
                const m = manager.page;
                await m.goto(`/index.php/${app.contextPath}/management/settings/access`);
                await m.getByRole('button', {name: 'Invite to a role'}).click();
                await m.getByLabel(/Search for a user by email address/).fill(recipient);
                await m.getByRole('button', {name: 'Search User', exact: true}).click();
                await m.getByRole('heading', {name: /Enter details/}).waitFor({state: 'visible', timeout: 30_000});
                await m.getByLabel(/^Given Name/).first().fill('Ines');
                const roleRow = m.getByRole('row').filter({has: m.getByLabel(/^Select a new role/)}).last();
                await roleRow.getByLabel(/^Select a new role/).selectOption({label: invitation.role});
                await roleRow.getByRole('textbox').fill(today());
                await roleRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'});
                await m.getByRole('button', {name: 'Save And Continue'}).click();
                await m.getByLabel(/^Subject/).waitFor({state: 'visible', timeout: 30_000});
                await idle(m);
                await m.getByRole('button', {name: 'Invite user to the role'}).click();
                await m.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({state: 'visible', timeout: 30_000});
                const summary = await app.fleetMail.find({to: recipient});
                const full = await app.fleetMail.fullMessage(summary.ID);
                invitation.subject = full.Subject;
                const link = (full.HTML.match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1];
                invitation.acceptLink = link ? link.replace(/&amp;/g, '&').replace(/key=[^&]+/, 'key=…') : null;
                await invitee.page.goto(link.replace(/&amp;/g, '&'));
                wizard = {verifyOrcidButton: invitee.page.getByRole('button', {name: 'Verify ORCID iD', exact: true})};
                await wizard.verifyOrcidButton.waitFor({state: 'visible', timeout: 30_000});
                invitation.firstStep = ((await screen(invitee.page)).text.main || '').replace(/\s+/g, ' ').trim().slice(0, 600);
                invitation.driven = true;
            } catch (error) {
                invitation.driven = false;
                invitation.why = firstLine(error);
                await shot(manager.page, `invitation-${sha}-not-driven-manager`).catch(() => {});
                await shot(invitee.page, `invitation-${sha}-not-driven-invitee`).catch(() => {});
            }
            for (const row of invitation.driven ? rows : []) {
                const facts = await driveReturn({
                    app,
                    sha,
                    target: 'invitation',
                    row,
                    configFile,
                    page: invitee.page,
                    openPopup: async () => {
                        await stubOrcidSite(invitee.context);
                        const [popup] = await Promise.all([invitee.page.waitForEvent('popup', {timeout: 20_000}), wizard.verifyOrcidButton.click({timeout: 10_000})]);
                        return popup;
                    },
                    after: async () => {
                        const read = await screen(invitee.page);
                        return {
                            url: invitee.page.url().replace(/key=[^&]+/, 'key=…'),
                            headings: await invitee.page.locator('main h1:visible, main h2:visible, main h3:visible').allInnerTexts(),
                            verifyButton: await wizard.verifyOrcidButton.count(),
                            main: (read.text.main || '').replace(/\s+/g, ' ').trim().slice(0, 900),
                            dialog: read.text.dialog,
                        };
                    },
                });
                R.rows.push(facts);
                record(`result-${sha}`, R);
            }
        }
    } finally {
        setProxy(configFile, shipped && shipped !== stub.proxyUrl ? shipped : DEAD_PROXY);
        fs.writeFileSync(outFile(`stub-${sha}.log`), `${stub.since(stubFrom).join('\n')}\n`);
        record(`result-${sha}`, R);
        await manager.close();
        await user.close();
        await invitee.close();
    }
}).finally(async () => {
    if (stub) {
        await stub.close();
    }
});
