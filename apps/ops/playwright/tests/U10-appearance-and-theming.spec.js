// @ts-check
/**
 * @file playwright/tests/U10-appearance-and-theming.spec.js
 *
 * Appearance & theming — OPS suite: one test per canonical scenario the spec
 * runs on a preprint server (scenarios 1–8, all common; 9 and 10 are {OJS}
 * and cost the server no test), in the server's own vocabulary: Preprint
 * Server Manager, "About the Server", "Server style sheet", "Server
 * thumbnail", "Server Summary", "Moderator", "Latest preprints", the
 * server's Settings › Website at `/index.php/<server>/management/settings/website`.
 * The {OJS OMP} bullets of scenario 5 (a role ticked for the masthead
 * before and after the first save) and the {OJS} and {OMP} bullets of
 * scenarios 6 and 7 cost the server no assertion; the {OPS} bullets of
 * scenarios 1 and 6 ("Latest preprints") are read here.
 * Spec: docs/specs/U10-appearance-and-theming.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S3 reads the homepage image's size, never its description.
 * - A3 🐞: S4 and S5 press the arrows by their own markup, never by the
 *   name a screen reader hears.
 * - A4 🐞: S4 never saves "Setup" while a placed block's plugin is off.
 * - A5 🐞: S1 never opens the removed style sheet's address.
 * - A6, A7, A8, A9 🐞: no test opens the French interface's "Theme" tab,
 *   refuses a file through "Upload File", picks the "3:05PM" time or saves
 *   an empty "Custom".
 * - A2 ❓: every logo is saved with its "Alternate text".
 *
 * Seeding: scenario endpoints only (footnote sc). Every scenario runs on its
 * own scratch server with a throwaway Preprint Server Manager
 * (`u10s<n>opw…mg`), because every scenario changes a setting and
 * publicknowledge keeps its defaults (A1). S1 seeds the "Server Summary"
 * text (`context.description`); S5 seeds a current and a former member of
 * each masthead role (`users[]`, `pastRoles[]`: Moderator is
 * `sectionEditor`); S6 seeds eleven preprints posted today
 * (`POST scenarios/submission`, `published: true`); S7 and S8 seed
 * announcements on with "Display on Homepage" at 1 and one announcement
 * (`enableAnnouncements`, `numAnnouncementsHomepage`, `announcements`), S8
 * French under "UI" and "Forms" (`context.supportedLocales`,
 * `supportedFormLocales`). The plugin S4 enables and every picture, style
 * sheet and favicon are driven on screen, as the scenarios say; the files
 * are made in the test. The Site Administrator of S2 is `admin`, enrolled
 * as a manager in every scratch server. Signed-out reads run in a second
 * browser context with an empty storage state (patterns.md, parallel
 * lesson 8); every actor gets its own `asUser` context. Every absence is a
 * settled read paired with a positive control taken the same way: the
 * empty "Latest preprints" against the same section once the summary
 * shows beside it, a refused file's silent box against the upload the
 * accepted file sends, the missing sidebar, logo, favicon and footer
 * against the same read once they are saved, the absent page links under
 * "Latest preprints" against the ten entries read with them. The "Date &
 * Time" labels follow the browser's clock, so S7 pins the manager's clock
 * at today 15:05 and computes the expected strings from today (the
 * server's day on this machine). Everything runs in the parallel `ops`
 * project.
 */
const zlib = require('zlib');
const {test: base, expect} = require('../support/fixtures.js');
const {
    WebsiteSettings,
    SettingsWizard,
    PublicLook,
    EditorialLook,
    disablePlugin,
    WRONG_TYPE,
} = require('../../../../shared/playwright/pages/AppearancePages.js');
const {PluginsTab} = require('../../../../shared/playwright/pages/CustomContentPages.js');

const T = 30_000;

const SUMMARY = 'A journal for testing.';
const ABOUT_SERVER = 'About the Server';
const LATEST = 'Latest preprints';
const ALT_GUIDANCE =
    'Describe this image for visitors viewing the site in a text-only browser or with assistive devices. Example: "Our editor speaking at the PKP conference."';
const MASTHEAD_INTRO = 'Define the order of masthead roles for public display.';
const RED = 'rgb(255, 0, 0)';
const THEME_FIELDS = ['Theme', 'Typography', 'Colour', 'Server Summary', 'Header Background Image', 'Usage statistics display options'];
const SERVER_BLOCKS = ['Language Toggle Block', 'Web Feed Plugin'];
const LORA_OPEN_SANS = 'Lora/Open Sans: A complimentary pairing with serif headings and sans-serif body text.';
const THUMBNAIL = {thumbnailField: 'serverThumbnail'};

/** A visitor's page: a second browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u10${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A scratch preprint server with a throwaway Preprint Server Manager (and any further users and keys). */
async function seedServer(opsApi, tag, extra = {}) {
    const {users = [], context = {}, ...rest} = extra;
    const name = `U10 server ${tag}`;
    const answer = await opsApi.createContext({
        tag,
        context: {name, ...context},
        users: [{username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']}, ...users],
        ...rest,
    });
    return {manager: `${tag}mg`, name, answer};
}

/** A page of an actor's own signed-in browser context. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The server's Settings › Website, opened afresh on a side tab; returns the tab's form. */
async function openTab(website, key) {
    await website.goto();
    return website.open(key);
}

/** An escaped whole-text pattern. */
function exactly(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** The relative luminance (0 dark … 1 light) of an `rgb(…)` string. */
function luminance(rgb) {
    const [r, g, b] = (String(rgb).match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Open the manager's Dashboard and read its look. */
async function dashboardLook(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard`);
    await expect(page.locator('h1, h2').filter({visible: true}).first()).toBeVisible({timeout: T});
    return new EditorialLook(page).read();
}

/** Today's date in the patterns the tab offers (the server runs on this machine's day). */
function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const F = d.toLocaleString('en-US', {month: 'long'});
    const [Y, m, j, dd] = [d.getFullYear(), pad(d.getMonth() + 1), d.getDate(), pad(d.getDate())];
    return {
        date: d,
        long: `${F} ${j}, ${Y}`, // F j, Y
        longNoComma: `${F} ${j} ${Y}`, // F j Y
        longDayFirst: `${j} ${F} ${Y}`, // j F Y
        longYearFirst: `${Y} ${F} ${j}`, // Y F j
        short: `${Y}-${m}-${dd}`, // Y-m-d
        shortDashes: `${dd}-${m}-${Y}`, // d-m-Y
        shortUs: `${m}/${dd}/${Y}`, // m/d/Y
        shortDots: `${dd}.${m}.${Y}`, // d.m.Y
        shortSlash: `${dd}/${m}/${Y}`, // d/m/Y
    };
}

// ---------------------------------------------------------------------------
// Files, made in the test
// ---------------------------------------------------------------------------

function crc32(buf) {
    let table = crc32.table;
    if (!table) {
        table = crc32.table = Array.from({length: 256}, (_, n) => {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            return c >>> 0;
        });
    }
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

/** A w×h RGB PNG of one colour. */
function png(w, h, [r, g, b]) {
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const td = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(td));
        return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const o = y * (w * 3 + 1) + 1 + x * 3;
            raw[o] = r;
            raw[o + 1] = g;
            raw[o + 2] = b;
        }
    }
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** A minimal baseline JPEG (1×1). */
const JPEG = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    'base64'
);

const FILES = {
    css: {name: 'red-headings.css', mimeType: 'text/css', buffer: Buffer.from('h1, h2, h3, h4, h5, h6 { color: red; }\n')},
    picture: {name: 'picture.png', mimeType: 'image/png', buffer: png(40, 30, [40, 160, 40])},
    icon: {name: 'icon.png', mimeType: 'image/png', buffer: png(32, 32, [0, 120, 0])},
    photo: {name: 'photo.jpg', mimeType: 'image/jpeg', buffer: JPEG},
    logo: {name: 'logo.png', mimeType: 'image/png', buffer: png(1600, 160, [200, 30, 30])},
    logo2: {name: 'logo2.png', mimeType: 'image/png', buffer: png(400, 60, [30, 30, 200])},
    thumb: {name: 'thumb.png', mimeType: 'image/png', buffer: png(120, 120, [120, 30, 160])},
    home: {name: 'home.png', mimeType: 'image/png', buffer: png(300, 100, [30, 120, 160])},
};

test.describe('appearance & theming', () => {
    test('S1: a new preprint server home page, its summary, its additional content and a style sheet', {tag: '@smoke'}, async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {manager} = await seedServer(opsApi, tag, {context: {description: {en: `<p>${SUMMARY}</p>`}}});
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const home = new PublicLook(visitor, tag);

        // The home page, nothing set: the header, the footer and between
        // them a search box and the heading "Latest preprints" with nothing
        // under it (Rules 11, 12, 16); control for the summary: its text
        // nowhere, no "About the Server", no skip link to it (Rule 7).
        await home.goto();
        await expect(home.header).toBeVisible();
        await expect(home.footer).toBeVisible();
        expect(await home.homeParts()).toEqual(['archiveHeader', 'homepage_latest_preprints']);
        await expect(home.searchBox).toBeVisible();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        expect(await home.latestPreprintsRead()).toEqual({count: 0, otherLinks: [], pagination: 0});
        await expect(home.about).toHaveCount(0);
        await expect(visitor.getByText(SUMMARY)).toHaveCount(0);
        await expect(home.skipLinks.first()).toBeAttached();
        expect((await home.skipLinkTargets()).filter((l) => l.targetInsideAbout)).toEqual([]);

        // The "Theme" tab as it opens: Settings › Website opens on
        // "Appearance" › "Theme" (Rule 1), "Default Theme" alone (Rule 4),
        // the server's fields in their order (no "Journal Content
        // Organization") with their new-server values (Fields, "Theme").
        await website.goto();
        await expect(website.topTab('appearance')).toHaveAttribute('aria-selected', 'true');
        await expect(website.sideTab('theme')).toHaveAttribute('aria-selected', 'true');
        const theme = website.theme;
        await theme.ready();
        expect(await theme.themeChoices()).toEqual(['Default Theme']);
        expect(await theme.fieldLabels()).toEqual(THEME_FIELDS);
        expect(await theme.chosen('typography')).toEqual(['Noto Sans: A digital-native font designed by Google for extensive language support.']);
        expect((await theme.colourBox.inputValue()).toUpperCase()).toBe('#1E6292');
        await expect(theme.box('Show the server summary on the homepage.')).not.toBeChecked();
        await expect(theme.box('Show the homepage image as the header background.')).not.toBeChecked();
        expect(await theme.chosen('displayStats')).toEqual(['Do not display submission usage statistics chart for reader.']);

        // The summary: "Saved"; the visitor's home page gains "About the
        // Server" with the text, after "Latest preprints", and a skip link
        // to it (Rules 7, 12).
        await theme.box('Show the server summary on the homepage.').check();
        await theme.save();
        await home.reload();
        await expect(home.aboutHeading).toHaveText(ABOUT_SERVER);
        await expect(home.about).toContainText(SUMMARY);
        expect(await home.homeParts()).toEqual(['archiveHeader', 'homepage_latest_preprints', 'homepage_about']);
        expect((await home.skipLinkTargets()).filter((l) => l.targetInsideAbout).length).toBe(1);

        // "Additional Content": at the foot of the home page, after "About
        // the Server"; not on the "About the Server" page (Rules 12, 19).
        const advanced = await website.open('advanced');
        await advanced.typeAdditionalContent('Welcome text');
        await advanced.save();
        await home.reload();
        await expect(home.additionalContent).toHaveText('Welcome text');
        expect(await home.homeParts()).toEqual(['archiveHeader', 'homepage_latest_preprints', 'homepage_about', 'additional_content']);
        await home.openFromMenu('About', ABOUT_SERVER);
        await expect(home.heading).toHaveText(ABOUT_SERVER);
        await expect(home.additionalContent).toHaveCount(0);
        await expect(visitor.getByText('Welcome text')).toHaveCount(0);

        // The style sheet: chosen, the box shows its name and "Remove";
        // right after "Saved" it still reads the chosen file's name and
        // "Remove"; once the tab is loaded again, "styleSheet.css" as a link
        // to the stored file and "Remove" (Fields, "Advanced").
        await home.goto();
        const themeHeadingColour = await home.colourOf(home.aboutHeading);
        expect(themeHeadingColour).not.toBe(RED);
        const dashboardBefore = await dashboardLook(page, tag);
        let tab = await openTab(website, 'advanced');
        await tab.styleSheet.expectUploadOffered(true);
        expect(await tab.styleSheet.choose(FILES.css)).toBe(200);
        await expect(tab.styleSheet.field).toContainText('red-headings.css');
        await expect(tab.styleSheet.button('Remove')).toBeVisible({timeout: T});
        await tab.save();
        await expect(tab.styleSheet.field).toContainText('red-headings.css');
        await expect(tab.styleSheet.button('Remove')).toBeVisible({timeout: T});
        await expect(tab.styleSheet.field.getByRole('link', {name: 'styleSheet.css', exact: true})).toHaveCount(0);
        tab = await openTab(website, 'advanced');
        await expect(tab.styleSheet.field.getByRole('link', {name: 'styleSheet.css', exact: true})).toBeVisible({timeout: T});
        await expect(tab.styleSheet.button('Remove')).toBeVisible({timeout: T});
        await expect(tab.styleSheet.field).not.toContainText('red-headings.css');

        // The visitor's "About the Server" heading is red; no heading on the
        // manager's Dashboard is (Rule 26).
        await home.reload();
        await expect(home.aboutHeading).toHaveCSS('color', RED);
        const dashboardStyled = await dashboardLook(page, tag);
        expect(dashboardStyled.headingColours.length).toBeGreaterThan(0);
        expect(dashboardStyled.headingColours).not.toContain(RED);
        expect(dashboardStyled.headingColours).toEqual(dashboardBefore.headingColours);
        expect(dashboardStyled.styleSheets.filter((s) => /styleSheet/.test(s))).toEqual([]);

        // Removed and saved: the heading is back in the theme's colour
        // (Rule 26; A5 not read).
        tab = await openTab(website, 'advanced');
        await tab.styleSheet.field.getByRole('button', {name: 'Remove', exact: true}).first().click();
        await tab.styleSheet.expectUploadOffered(true);
        await tab.save();
        await home.reload();
        await expect(home.aboutHeading).toHaveText(ABOUT_SERVER);
        await expect(home.aboutHeading).toHaveCSS('color', themeHeadingColour);

        // A file the box does not take: a picture dropped on the empty style
        // sheet box is refused in the box and nothing is sent (Fields, the
        // upload boxes); the accepted style sheet above sent its upload.
        tab = await openTab(website, 'advanced');
        await tab.styleSheet.expectUploadOffered(true);
        expect(await tab.styleSheet.dropRefused(FILES.picture)).toBe(0);
        await expect(tab.styleSheet.refusal).toHaveText(WRONG_TYPE);
    });

    test('S2: the fonts, the header colour and the favicon, from the server and from the Settings Wizard', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const {manager, name} = await seedServer(opsApi, tag);
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const home = new PublicLook(visitor, tag);

        // Control, first read: the Dashboard's own header colour and fonts.
        const dashboardBefore = await dashboardLook(page, tag);

        // Kept across side tabs (Rule 2).
        let theme = await openTab(website, 'theme');
        await theme.choice(LORA_OPEN_SANS).check();
        await website.open('appearance-setup');
        theme = await website.open('theme');
        await expect(theme.choice(LORA_OPEN_SANS)).toBeChecked();

        // "Typography": headings in Lora, text in Open Sans (Rule 5). The
        // server's home page has a heading of its own ("Latest preprints"),
        // and the header's server name takes the heading font too.
        await home.goto();
        const before = await home.headerLook();
        const fontsBefore = await home.fonts();
        expect(fontsBefore.heading).toMatch(/Noto Sans/);
        expect(fontsBefore.text).toMatch(/Noto Sans/);
        await theme.save();
        await home.reload();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        const fontsHome = await home.fonts();
        expect(fontsHome.heading).toMatch(/^"?Lora"?,/);
        expect(fontsHome.siteName).toMatch(/^"?Lora"?,/);
        expect(fontsHome.text).toMatch(/^"?Open Sans"?,/);
        await home.openFromMenu('About', ABOUT_SERVER);
        await expect(home.heading).toHaveText(ABOUT_SERVER);
        const fontsAbout = await home.fonts();
        expect(fontsAbout.heading).toMatch(/^"?Lora"?,/);
        expect(fontsAbout.text).toMatch(/^"?Open Sans"?,/);
        await home.goto();

        // "Colour", light: a yellow header with dark text, on the home page
        // and on "About the Server" (Rule 6); control on the same read: the
        // default colour's header text is light.
        expect(luminance(before.nameColour)).toBeGreaterThan(0.8);
        await theme.typeColour('#FFFF00');
        await theme.save();
        for (const open of [() => home.reload(), () => home.openFromMenu('About', ABOUT_SERVER)]) {
            await open();
            const look = await home.headerLook();
            expect(look.background).toBe('rgb(255, 255, 0)');
            expect(luminance(look.nameColour)).toBeLessThan(0.2);
        }

        // "Colour", dark: navy blue (Rule 6).
        await theme.typeColour('#000080');
        await theme.save();
        await home.goto();
        expect((await home.headerLook()).background).toBe('rgb(0, 0, 128)');

        // A code the box cannot read: "Saved", and the header stays navy (Rule 6).
        await theme.typeColour('red');
        await expect(theme.colourBox).toHaveValue('red');
        await theme.save();
        await home.reload();
        expect((await home.headerLook()).background).toBe('rgb(0, 0, 128)');

        // A file the favicon box does not take: refused in the box, nothing
        // sent; reloaded, "Favicon" is empty (Fields, "Advanced"; Rule 2).
        let advanced = await website.open('advanced');
        await advanced.favicon().expectUploadOffered(true);
        expect(await advanced.favicon().dropRefused(FILES.photo)).toBe(0);
        advanced = await openTab(website, 'advanced');
        const favicon = advanced.favicon();
        await favicon.expectUploadOffered(true);
        await expect(favicon.thumbnail).toHaveCount(0);
        await expect(favicon.refusal).toHaveCount(0);

        // "Favicon": chosen and saved, the icon of the visitor's tab and of
        // the manager's Dashboard (Rule 27); control: none before.
        await home.reload();
        expect((await home.faviconHrefs()).filter((h) => /favicon/.test(h))).toEqual([]);
        expect(await favicon.choose(FILES.icon)).toBe(200);
        await expect(favicon.thumbnail).toBeVisible();
        await advanced.save();
        await home.reload();
        const ICON = /\/public\/contexts\/\d+\/favicon_en\.png/;
        expect((await home.faviconHrefs()).some((h) => ICON.test(h))).toBe(true);
        expect((await dashboardLook(page, tag)).favicons.some((h) => ICON.test(h))).toBe(true);

        // The Site Administrator's wizard: the row's arrow offers "Edit",
        // "Remove" and "Settings wizard"; the wizard's tabs (Rule 34).
        const admin = await actorPage(asUser, 'admin');
        const wizard = new SettingsWizard(admin);
        await wizard.gotoHostedContexts();
        expect(await wizard.openRowActions(name)).toEqual(['Edit', 'Remove', 'Settings wizard']);
        await wizard.chooseWizard(name);
        await expect.poll(() => wizard.topTabNames()).toEqual(['Server Settings', 'Plugins', 'Users']);
        expect(await wizard.sideTabNames()).toEqual(['Server', 'Appearance', 'Languages', 'Search Indexing', 'Restrict Bulk Emails']);

        // Unsaved in the wizard: the fields of the server's "Theme" tab; a
        // colour kept while "Server" is open, gone after a reload with no
        // question (Rule 34).
        const dialogs = [];
        admin.on('dialog', (d) => {
            dialogs.push(d.type());
            d.accept().catch(() => {});
        });
        let appearance = await wizard.openAppearance();
        expect(await appearance.fieldLabels()).toEqual(THEME_FIELDS);
        await appearance.typeColour('#1B5E20');
        await wizard.openSideTab('Server');
        appearance = await wizard.openAppearance();
        await expect(appearance.colourBox).toHaveValue(/^#1B5E20$/i);
        await admin.reload();
        appearance = await wizard.openAppearance();
        await expect(appearance.colourBox).toHaveValue(/^#000080$/i);
        expect(dialogs).toEqual([]);

        // Saved in the wizard: the visitor's header is dark green; the
        // manager's reloaded "Theme" tab reads "#1B5E20" (Rule 34).
        await appearance.typeColour('#1B5E20');
        await appearance.save();
        await home.reload();
        expect((await home.headerLook()).background).toBe('rgb(27, 94, 32)');
        theme = await openTab(website, 'theme');
        expect((await theme.colourBox.inputValue()).toUpperCase()).toBe('#1B5E20');

        // Control: through every save the Dashboard kept its own header
        // colour and fonts (Rule 4).
        const dashboardAfter = await dashboardLook(page, tag);
        expect(dashboardAfter.headerBackground).toBe(dashboardBefore.headerBackground);
        expect(dashboardAfter.font).toBe(dashboardBefore.font);
        expect(dashboardAfter.font).not.toMatch(/Open Sans|Lora/);
    });

    test('S3: the logo, the thumbnail, the homepage image and the page footer', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const {manager, name} = await seedServer(opsApi, tag);
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const home = new PublicLook(visitor, tag);
        const site = new PublicLook(visitor, 'index');

        // "Logo" uploaded: a preview with "Remove", no "Restore Original",
        // and "Alternate text" under its guidance (Fields, the upload boxes).
        let setup = await openTab(website, 'appearance-setup');
        let logo = setup.logo();
        expect(await logo.choose(FILES.logo)).toBe(200);
        await expect(logo.thumbnail).toBeVisible();
        await expect(logo.removeButton).toBeVisible();
        await expect(logo.restoreButton).toHaveCount(0);
        await expect(logo.altText).toBeVisible();
        await expect(logo.altText).toHaveValue('');
        await expect(logo.altTextGuidance).toHaveText(ALT_GUIDANCE);

        // Control: before the first "Save", the upload has not reached the
        // visitor's header (Fields, the upload boxes).
        await home.goto();
        await expect(home.textNameLink).toHaveText(name);
        await expect(home.logo).toHaveCount(0);

        // "Logo" saved: in the header in place of the server's name, 800 ×
        // 80, "Journal logo" as its description, a link to the home page;
        // on "About the Server" too (Rule 20).
        await logo.altText.fill('Journal logo');
        await setup.save();
        await home.reload();
        const shown = await home.logoShown();
        expect([shown.width, shown.height, shown.alt]).toEqual([800, 80, 'Journal logo']);
        await expect(home.textNameLink).toHaveCount(0);
        const logoAddress = shown.src;
        await home.openFromMenu('About', ABOUT_SERVER);
        await expect(home.heading).toHaveText(ABOUT_SERVER);
        await expect(home.logo).toHaveAttribute('alt', 'Journal logo');
        await home.logoLink.click();
        await expect(home.root).toBeAttached({timeout: T});
        expect(new URL(visitor.url()).pathname).toMatch(new RegExp(`^/index\\.php/${tag}(/index)?$`));

        // Replaced, then restored, on the tab loaded again: the saved logo and
        // "Journal logo", no "Upload File"; "Remove" brings "Restore Original"
        // and "Upload File"; the chosen picture arrives with an empty
        // "Alternate text" and "Restore Original" still shows; restored, the
        // saved logo and its text are back (Fields, the upload boxes).
        setup = await openTab(website, 'appearance-setup');
        logo = setup.logo();
        await expect(logo.thumbnail).toBeVisible();
        await expect(logo.altText).toHaveValue('Journal logo');
        const savedPreview = await logo.thumbnail.getAttribute('src');
        expect(savedPreview).toMatch(/pageHeaderLogoImage_en\.png/);
        await logo.expectUploadOffered(false);
        await logo.removeButton.click();
        await expect(logo.restoreButton).toBeVisible();
        await logo.expectUploadOffered(true);
        await expect(logo.uploadButton).toBeVisible();
        expect(await logo.choose(FILES.logo2)).toBe(200);
        await expect(logo.altText).toHaveValue('');
        await expect(logo.restoreButton).toBeVisible();
        await expect(logo.thumbnail).not.toHaveAttribute('src', savedPreview || '');
        await logo.restoreButton.click();
        await expect(logo.thumbnail).toHaveAttribute('src', savedPreview || '');
        await expect(logo.altText).toHaveValue('Journal logo');

        // Replaced from the keyboard, on the tab loaded again: a box holding
        // a picture keeps "Upload File" for the keyboard alone; Enter opens
        // the file chooser, the chosen picture takes the saved one's place
        // with an empty "Alternate text" and "Restore Original"; restored,
        // "logo.png" and "Journal logo" are back (Fields, the upload boxes).
        setup = await openTab(website, 'appearance-setup');
        logo = setup.logo();
        await expect(logo.altText).toHaveValue('Journal logo');
        await logo.expectUploadOffered(false);
        expect(await logo.chooseByKeyboard(FILES.logo2)).toBe(200);
        await expect(logo.altText).toHaveValue('');
        await expect(logo.restoreButton).toBeVisible();
        await expect(logo.thumbnail).not.toHaveAttribute('src', savedPreview || '');
        await logo.restoreButton.click();
        await expect(logo.thumbnail).toHaveAttribute('src', savedPreview || '');
        await expect(logo.altText).toHaveValue('Journal logo');

        // The thumbnail: beside the server in the site's list, "Thumb" as its
        // description (Rule 21).
        const thumb = setup.thumbnail();
        expect(await thumb.choose(FILES.thumb)).toBe(200);
        await thumb.altText.fill('Thumb');
        await setup.save();
        await site.goto();
        const thumbImg = site.siteThumbnail(name);
        await expect(thumbImg).toBeVisible({timeout: T});
        await expect(thumbImg).toHaveAttribute('alt', 'Thumb');
        await expect(thumbImg).toHaveAttribute('src', /serverThumbnail_en\.png/);
        await expect.poll(() => thumbImg.evaluate((i) => i.complete && i.naturalWidth)).toBe(120);

        // "Homepage Image": at the size it was uploaded, 300 × 100, on a
        // preprint server (Rule 18; A1 not read). Control: none before.
        await home.goto();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        await expect(home.homepageImage).toHaveCount(0);
        const homeImage = setup.homepageImage();
        expect(await homeImage.choose(FILES.home)).toBe(200);
        await homeImage.altText.fill('Our building');
        await setup.save();
        await home.reload();
        const image = await home.homepageImageShown();
        expect([image.width, image.height, image.naturalWidth]).toEqual([300, 100, 300]);
        await expect(home.homepageImage).toHaveAttribute('src', /homepageImage_en\.png/);
        expect((await home.headerLook()).backgroundImage).toBe('none');

        // "Header Background Image": ticked, the picture fills the header's
        // background on the home page and on "About the Server", and leaves
        // the body (Rule 8); unticked, back in the body (Rule 18).
        let theme = await website.open('theme');
        await theme.box('Show the homepage image as the header background.').check();
        await theme.save();
        await home.reload();
        expect((await home.headerLook()).backgroundImage).toMatch(/homepageImage_en\.png/);
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        await expect(home.homepageImage).toHaveCount(0);
        await home.openFromMenu('About', ABOUT_SERVER);
        await expect(home.heading).toHaveText(ABOUT_SERVER);
        expect((await home.headerLook()).backgroundImage).toMatch(/homepageImage_en\.png/);
        theme = await openTab(website, 'theme');
        await theme.box('Show the homepage image as the header background.').uncheck();
        await theme.save();
        await home.goto();
        await expect(home.homepageImage).toBeVisible();
        expect((await home.headerLook()).backgroundImage).toBe('none');

        // "Page Footer": at the foot of the home page and of "About the
        // Server", above the application's logo (Rule 22).
        setup = await website.open('appearance-setup');
        await setup.typeFooter('Footer line');
        await setup.save();
        for (const open of [() => home.reload(), () => home.openFromMenu('About', ABOUT_SERVER)]) {
            await open();
            await expect(home.footerContent).toHaveText('Footer line');
            expect(await home.footerAboveBrand()).toBe(true);
        }

        // "Logo" removed: "Restore Original" shows; saved, the server's name
        // is back, and the logo's address no longer opens the picture
        // (Rule 20; Side effects). Control: the address opened it before.
        const opened = await visitor.goto(logoAddress);
        expect(opened && opened.status()).toBe(200);
        setup = await openTab(website, 'appearance-setup');
        logo = setup.logo();
        await logo.removeButton.click();
        await expect(logo.field.getByRole('button', {name: 'Restore Original', exact: true}).first()).toBeVisible();
        await setup.save();
        await home.goto();
        await expect(home.textNameLink).toHaveText(name);
        await expect(home.logo).toHaveCount(0);
        const gone = await visitor.goto(logoAddress);
        expect(gone && gone.status()).toBe(404);
    });

    test('S4: the sidebar: blocks placed, ordered, switched off and removed', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const {manager} = await seedServer(opsApi, tag);
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const plugins = new PluginsTab(page, tag);
        const home = new PublicLook(visitor, tag);
        const BLOCK = {'Web Feed Plugin': 'block_web_feed', '"Developed By" Block': 'block_developed_by'};

        // Control: before the first "Save", no sidebar (Rules 23, 24).
        await home.goto();
        await expect(home.main).toBeVisible();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        await expect(home.sidebar).toHaveCount(0);
        const widthAlone = (await home.layout()).main.width;

        // The list as it opens: one box per block, none ticked, the server's
        // two; no ""Make a Submission" Block" (Rule 23).
        let setup = await openTab(website, 'appearance-setup');
        let rows = await setup.sidebar.read();
        expect(rows.map((r) => r.label).sort()).toEqual(SERVER_BLOCKS);
        expect(rows.filter((r) => r.checked)).toEqual([]);
        expect(rows.map((r) => r.label).filter((l) => /Make a Submission/.test(l))).toEqual([]);

        // A block plugin enabled: ""Developed By" Block" joins the list,
        // unticked (Rule 23).
        await plugins.goto();
        await expect(plugins.enabledBox('developedbyblockplugin')).not.toBeChecked();
        expect(await plugins.enable('developedbyblockplugin')).toBe(200);
        setup = await openTab(website, 'appearance-setup');
        rows = await setup.sidebar.read();
        expect(rows.length).toBe(3);
        expect(rows.find((r) => r.label === '"Developed By" Block')).toEqual({label: '"Developed By" Block', checked: false});

        // Placed: the three ticked boxes first (a server has no other); the
        // visitor's sidebar holds the feed and "Developed By" blocks in the
        // list's order, nothing for the one-language toggle (Rules 23, 24).
        const PLACED = ['Web Feed Plugin', '"Developed By" Block', 'Language Toggle Block'];
        for (const label of PLACED) await setup.sidebar.box(label).check();
        await setup.save();
        setup = await openTab(website, 'appearance-setup');
        rows = await setup.sidebar.read();
        expect(rows.map((r) => r.label).sort()).toEqual([...PLACED].sort());
        expect(rows.map((r) => r.checked)).toEqual([true, true, true]);
        const shownOrder = rows.map((r) => r.label).filter((l) => BLOCK[l]).map((l) => BLOCK[l]);
        await home.reload();
        await expect(home.sidebar).toBeVisible();
        await expect.poll(() => home.sidebarBlocks()).toEqual(shownOrder);
        await expect(home.sidebar.locator('.block_language')).toHaveCount(0);

        // Dragged: ""Developed By" Block" by its handle to the top (Rules 23, 24).
        await setup.sidebar.dragToTop('"Developed By" Block');
        await expect.poll(() => setup.sidebar.labels().then((l) => l[0])).toBe('"Developed By" Block');
        await setup.save();
        await home.reload();
        await expect.poll(() => home.sidebarBlocks().then((b) => b[0])).toBe('block_developed_by');

        // Moved by its arrow ("Increase position of Web Feed Plugin") until
        // the row stands first (Rules 23, 24; A3 not read).
        await expect(setup.sidebar.upArrow('Web Feed Plugin')).toHaveText(exactly('Increase position of Web Feed Plugin'));
        expect(await setup.sidebar.moveToTop('Web Feed Plugin')).toBeGreaterThan(0);
        expect((await setup.sidebar.read())[0]).toEqual({label: 'Web Feed Plugin', checked: true});
        await setup.save();
        await home.reload();
        await expect.poll(() => home.sidebarBlocks()).toEqual(['block_web_feed', 'block_developed_by']);

        // Its plugin switched off: the block leaves the sidebar and the list
        // (Rule 25); the tab is left unsaved (A4).
        await plugins.goto();
        expect(await disablePlugin(page, plugins, 'webfeedplugin')).toBe(200);
        await home.reload();
        await expect.poll(() => home.sidebarBlocks()).toEqual(['block_developed_by']);
        setup = await openTab(website, 'appearance-setup');
        rows = await setup.sidebar.read();
        expect(rows.length).toBe(2);
        expect(rows.map((r) => r.label)).not.toContain('Web Feed Plugin');

        // Its plugin switched on again: ticked and first again, in the list
        // and in the visitor's sidebar (Rule 25).
        await plugins.goto();
        expect(await plugins.enable('webfeedplugin')).toBe(200);
        setup = await openTab(website, 'appearance-setup');
        expect((await setup.sidebar.read())[0]).toEqual({label: 'Web Feed Plugin', checked: true});
        await home.reload();
        await expect.poll(() => home.sidebarBlocks()).toEqual(['block_web_feed', 'block_developed_by']);

        // None ticked: no sidebar on the home page or "About the Server";
        // the content keeps its width and stands in the middle (Rule 24).
        const widthWithSidebar = (await home.layout()).main.width;
        for (const label of await setup.sidebar.labels()) await setup.sidebar.box(label).uncheck();
        await setup.save();
        for (const open of [() => home.reload(), () => home.openFromMenu('About', ABOUT_SERVER)]) {
            await open();
            await expect(home.main).toBeVisible();
            await expect(home.sidebar).toHaveCount(0);
            const {main} = await home.layout();
            const viewport = await visitor.evaluate(() => document.documentElement.clientWidth);
            expect(main.width).toBe(widthWithSidebar);
            expect(Math.abs(main.left - (viewport - main.right))).toBeLessThanOrEqual(2);
        }
        expect(widthAlone).toBe(widthWithSidebar);
    });

    test('S5: the order of the masthead roles', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s5', testInfo);
        const member = (key, role, given, family, past = false) => ({
            username: `${tag}${key}`,
            givenName: given,
            familyName: family,
            email: `${tag}${key}@mail.test`,
            roles: past ? ['reader'] : [role],
            ...(past ? {pastRoles: [{role}]} : {}),
        });
        const {manager} = await seedServer(opsApi, tag, {
            users: [
                member('mo', 'sectionEditor', 'Mara', 'Moderator'),
                member('eb', 'editorialBoardMember', 'Ebba', 'Boardmember'),
                member('pmo', 'sectionEditor', 'Paul', 'Pastmoderator', true),
                member('peb', 'editorialBoardMember', 'Petra', 'Pastboard', true),
            ],
        });
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const pub = new PublicLook(visitor, tag);
        const roleHeadings = visitor.locator('.page_masthead h2');

        // Control: before the "Save", the visitor's masthead lists
        // "Editorial Board Member" last (Rule 28).
        await pub.goto('/about/editorialMasthead');
        await expect(roleHeadings).toHaveText(['Moderator', 'Editorial Board Member']);

        // The list as it opens: the two roles, each with a drag handle and
        // both arrows and no box, no Reviewer role, and no "Reviewers" field
        // (Fields, "Editorial Masthead"; Rule 28). Above it the enrollment
        // masthead box, ticked on a new server (pkp-lib#13370, which also
        // took "Reviewers" off a server, having no review stages).
        const masthead = await openTab(website, 'appearance-masthead');
        await expect(masthead.enrollmentBox).toBeChecked();
        await expect(masthead.description).toHaveText(MASTHEAD_INTRO);
        expect(await masthead.roles.read()).toEqual([
            {label: 'Moderator', checked: null},
            {label: 'Editorial Board Member', checked: null},
        ]);
        await expect(masthead.roles.rows().locator('.orderer__dragDrop')).toHaveCount(2);
        await expect(masthead.roles.rows().locator('button.orderer__up')).toHaveCount(2);
        await expect(masthead.roles.rows().locator('button.orderer__down')).toHaveCount(2);
        await expect(masthead.reviewersField).toHaveCount(0);
        await expect(masthead.form).not.toContainText('Reviewers');

        // Reordered: "Editorial Board Member" first, "Saved"; the visitor's
        // masthead and history head with it, the other following (Rule 28).
        expect(await masthead.roles.moveToTop('Editorial Board Member')).toBe(1);
        await masthead.save();
        await pub.goto();
        await pub.openFromMenu('About', 'Editorial Masthead');
        await expect(pub.heading).toHaveText('Editorial Masthead');
        await expect(roleHeadings).toHaveText(['Editorial Board Member', 'Moderator']);
        await visitor.locator('.page_masthead').getByRole('link', {name: 'Editorial History', exact: true}).click();
        await expect(visitor).toHaveURL(/\/about\/editorialHistory$/);
        await expect(pub.heading).toHaveText(/^Editorial History/);
        await expect(roleHeadings.first()).toHaveText('Editorial Board Member');
    });

    test('S6: the "Lists" tab: refused numbers, then one entry a page', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const {manager} = await seedServer(opsApi, tag);
        for (let i = 1; i <= 11; i++) {
            const n = String(i).padStart(2, '0');
            await opsApi.createSubmission({tag: `${tag}p${n}`, context: tag, submitter: manager, title: `Preprint ${n} ${tag}`, published: true});
        }
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const home = new PublicLook(visitor, tag);

        // "Latest preprints": ten of the eleven, with no page links (Rule 16).
        await home.goto();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        await expect(home.latestPreprintItems).toHaveCount(10);
        expect(await home.latestPreprintsRead()).toEqual({count: 10, otherLinks: [], pagination: 0});
        await expect(home.pagination).toHaveCount(0);

        // As it opens: 25 and 10 (Fields, "Lists").
        let lists = await openTab(website, 'lists');
        await expect(lists.itemsPerPage).toHaveValue('25');
        await expect(lists.pageLinks).toHaveValue('10');

        // Refused: emptied, nothing is sent; 0, -1, text and a decimal come
        // back refused from the server (the positive control for "nothing is
        // sent"); then "Page links" at 0 (Fields, "Lists").
        await lists.itemsPerPage.fill('');
        expect(await lists.saveRefused('lists-itemsPerPage-control', 'This field is required.')).toBe(0);
        for (const [value, message] of [
            ['0', 'This must be at least 1.'],
            ['-1', 'This must be at least 1.'],
            ['abc', 'This is not a valid integer.'],
            ['2.5', 'This is not a valid integer.'],
        ]) {
            await lists.itemsPerPage.fill(value);
            expect(await lists.saveRefused('lists-itemsPerPage-control', message)).toBe(1);
        }
        await lists.itemsPerPage.fill('25');
        await lists.pageLinks.fill('0');
        expect(await lists.saveRefused('lists-numPageLinks-control', 'This must be at least 1.')).toBe(1);

        // No upper limit (Fields, "Lists").
        await lists.itemsPerPage.fill('100000');
        await lists.pageLinks.fill('100000');
        await lists.save();

        // One a page: saved; reloaded, 1 and 3 (Rule 2).
        await lists.itemsPerPage.fill('1');
        await lists.pageLinks.fill('3');
        await lists.save();
        lists = await openTab(website, 'lists');
        await expect(lists.itemsPerPage).toHaveValue('1');
        await expect(lists.pageLinks).toHaveValue('3');

        // "Latest preprints" unchanged: still ten, no page links; "Items per
        // page" does not apply there (Rule 16).
        await home.reload();
        await expect(home.latestPreprintsHeading).toHaveText(LATEST);
        await expect(home.latestPreprintItems).toHaveCount(10);
        expect(await home.latestPreprintsRead()).toEqual({count: 10, otherLinks: [], pagination: 0});
        await expect(home.pagination).toHaveCount(0);

        // Control: Settings › Users & Roles › "Users" still lists every user
        // of the server (the manager and admin) on one page (Rule 29).
        await page.goto(`/index.php/${tag}/management/settings/access`);
        const users = page.locator('table').filter({hasText: 'Mona Manager'}).first();
        await expect(users).toBeVisible({timeout: T});
        await expect(users.locator('tbody tr').filter({hasText: 'Mona Manager'})).toHaveCount(1);
        await expect(users.locator('tbody tr').filter({hasText: /\badmin\b/})).toHaveCount(1);
        await expect(users.locator('tbody tr')).toHaveCount(2);
    });

    test('S7: date formats, from the tab to the public pages', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const {manager} = await seedServer(opsApi, tag, {
            enableAnnouncements: true,
            numAnnouncementsHomepage: 1,
            announcements: [{title: 'Call for papers'}],
        });
        const day = today();
        const page = await actorPage(asUser, manager);
        await page.clock.setFixedTime(new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 15, 5, 0));
        const website = new WebsiteSettings(page, tag, THUMBNAIL);
        const pub = new PublicLook(visitor, tag);

        // Control: before the first "Save", the announcement's date reads
        // the short default (Fields, "Date & Time"; Rule 31).
        await pub.goto();
        await expect(visitor.locator('section.cmp_announcements')).toContainText('Call for papers');
        await expect(pub.announcementDate).toHaveText(day.short);

        // The tab as it opens: five groups; each choice but "Custom" is
        // today's date or time in its pattern; the new-server choices marked
        // (Fields, "Date & Time").
        const dates = await openTab(website, 'dateTime');
        await expect(dates.form).toContainText('Date and Time Formats');
        expect(await dates.fieldLabels()).toEqual(['Date', 'Date (Short)', 'Time', 'Date & Time', 'Date & Time (Short)']);
        const labels = async (field) => (await dates.choices(field)).map((c) => c.label);
        expect(await labels('dateFormatLong')).toEqual([day.long, day.longNoComma, day.longDayFirst, day.longYearFirst, 'Custom']);
        expect(await labels('dateFormatShort')).toEqual([day.short, day.shortDashes, day.shortUs, day.shortDots, 'Custom']);
        expect(await labels('timeFormat')).toEqual(['15:05', '03:05 PM', '3:05PM', 'Custom']);
        expect(await dates.chosen('dateFormatLong')).toBe(day.long);
        expect(await dates.chosen('dateFormatShort')).toBe(day.short);
        expect(await dates.chosen('timeFormat')).toBe('03:05 PM');
        expect(await dates.chosen('datetimeFormatLong')).toBe(`${day.long} - 03:05 PM`);
        expect(await dates.chosen('datetimeFormatShort')).toBe(`${day.short} 03:05 PM`);

        // The combined choices follow (Rule 32).
        await dates.choice('dateFormatShort', day.shortDots).check();
        await expect.poll(() => dates.chosen('datetimeFormatShort')).toBe(`${day.shortDots} 03:05 PM`);
        await dates.choice('dateFormatShort', day.short).check();
        await expect.poll(() => dates.chosen('datetimeFormatShort')).toBe(`${day.short} 03:05 PM`);
        await dates.choice('dateFormatShort', day.shortDots).check();
        await dates.choice('dateFormatLong', day.longDayFirst).check();
        await expect.poll(() => dates.chosen('datetimeFormatLong')).toBe(`${day.longDayFirst} - 03:05 PM`);
        await dates.save();

        // The visitor's dates: the announcement in "Date (Short)" (Rule 31).
        await pub.reload();
        await expect(pub.announcementDate).toHaveText(day.shortDots);

        // "Custom": "d/m/Y" under "Date (Short)" (Rule 33).
        await dates.custom('dateFormatShort').check();
        await dates.customBox('dateFormatShort').fill('d/m/Y');
        await dates.save();
        await pub.goto();
        await expect(pub.announcementDate).toHaveText(day.shortSlash);
    });

    test('S8: a preprint server in two languages', async ({asUser, opsApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {manager} = await seedServer(opsApi, tag, {
            context: {primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            enableAnnouncements: true,
            numAnnouncementsHomepage: 1,
            announcements: [{title: 'Call for papers'}],
        });
        const day = today();
        const page = await actorPage(asUser, manager);
        const website = new WebsiteSettings(page, tag, {locale: 'en', ...THUMBNAIL});
        const english = new PublicLook(visitor, tag, {locale: 'en'});
        const french = new PublicLook(visitor, tag, {locale: 'fr_CA'});

        // Control: before the first "Save", no footer text on the English page.
        await english.goto();
        await expect(english.root).toBeAttached();
        await expect(english.footer).toBeVisible();
        await expect(english.footerContent).toHaveCount(0);

        // A French footer alone: both pages read it (Rule 3).
        const setup = await openTab(website, 'appearance-setup');
        await setup.showLanguage('French');
        await setup.typeFooter('Pied de page', 'fr_CA');
        await setup.save();
        await english.goto();
        await expect(english.footerContent).toHaveText('Pied de page');
        await french.goto();
        await expect(french.footerContent).toHaveText('Pied de page');

        // Both languages: each page its own (Rule 3).
        await setup.typeFooter('English footer', 'en');
        await setup.save();
        await english.goto();
        await expect(english.footerContent).toHaveText('English footer');
        await french.goto();
        await expect(french.footerContent).toHaveText('Pied de page');

        // An English logo alone: the French header shows it with its
        // description (Rule 3).
        const logo = setup.logo('en');
        expect(await logo.choose(FILES.logo)).toBe(200);
        await logo.altText.fill('Journal logo');
        await expect(setup.logo('fr_CA').thumbnail).toHaveCount(0);
        await setup.save();
        await french.goto();
        const shown = await french.logoShown();
        expect(shown.alt).toBe('Journal logo');
        expect(shown.src).toMatch(/pageHeaderLogoImage_en\.png/);

        // Dates per language: the French "Date (Short)" on the French page
        // alone (Rule 3).
        await english.goto();
        await expect(english.announcementDate).toHaveText(day.short);
        const dates = await openTab(website, 'dateTime');
        await dates.showLanguage('French');
        await expect(dates.choice('dateFormatShort', day.shortDots, 'fr_CA')).toBeVisible();
        await dates.choice('dateFormatShort', day.shortDots, 'fr_CA').check();
        await dates.save();
        await french.goto();
        await expect(french.announcementDate).toHaveText(day.shortDots);
        await english.goto();
        await expect(english.announcementDate).toHaveText(day.short);
    });
});
