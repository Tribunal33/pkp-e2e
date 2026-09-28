// @ts-check
/**
 * @file playwright/tests/U10-appearance-and-theming.spec.js
 *
 * Appearance & theming — OJS suite, one test per canonical scenario the
 * spec runs on a journal: scenarios 1–8 (common) and 9–10 ({OJS}).
 * Spec: docs/specs/U10-appearance-and-theming.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A3 🐞: S4 and S5 find the ordering arrows by their class and text,
 *   never by the name a screen reader hears.
 * - A4 🐞: S4 leaves "Setup" unsaved while the placed block's plugin is off.
 * - A5 🐞: S1 never opens the removed style sheet's address.
 * - A7 🐞: every refused file is dropped on its box, and neither "Upload
 *   File" nor "Save" is pressed on that box's tab afterwards.
 * - A6, A8, A9, OJS5, OJS6 🐞: no test reaches those states (no French
 *   interface, no "3:05PM" time, no empty "Custom", never all three
 *   organization boxes unticked, no heading levels read).
 * - A1 🐞 {OMP OPS}: not a journal's.
 * - A2, OJS7 ❓: S3 always types an "Alternate text".
 * - OJS2 ❓: no issue is created on a journal that never saved "Theme".
 * - OJS3 ❓: S6 and S9 never read the order of "Latest Publications".
 * - OJS4 ❓: S2 never reads the journal's organization after the wizard's
 *   save.
 *
 * Seeding: scenario endpoints only. Every scenario runs on its own scratch
 * journal with a throwaway Journal Manager (footnote sc): S1 seeds the
 * "Journal Summary" (`context.description`); S5 current and former members
 * of three roles (`users[]`, `pastRoles[]`); S6 three and S9 two articles
 * published outside any issue (`POST scenarios/submission` `published`);
 * S7 and S8 announcements with one on the home page
 * (`enableAnnouncements`, `numAnnouncementsHomepage`, `announcements[]`),
 * S8 English and French under "UI" and "Forms"
 * (`context.supportedLocales`, `supportedFormLocales`); S9 the categories
 * (`categories[]`); S10 one published issue (`issues[]`). "Developed By"
 * Block, "Consider role in masthead list" and "Publishing Mode" are
 * changed on screen, as the scenarios do. Pictures, the style sheet and
 * the favicon are made in the test and uploaded on screen. The "Date &
 * Time" labels follow the browser's clock, pinned to the spec's example
 * (24 September 2026, 3:05 in the afternoon) on the manager's page; the
 * public dates are the server's today. Signed-out reads run in a browser
 * context with an empty storage state (patterns.md, parallel lesson 8);
 * each actor gets its own `asUser` context. Everything runs in the
 * parallel `ojs` project.
 */
const zlib = require('zlib');
const {test: base, expect} = require('../support/fixtures.js');
const {whole} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {PluginsTab} = require('../../../../shared/playwright/pages/CustomContentPages.js');
const {AboutPages, RolesTab} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {
    WebsiteSettings,
    SettingsWizard,
    PublicLook,
    EditorialLook,
    disablePlugin,
} = require('../../../../shared/playwright/pages/AppearancePages.js');
const {setPublishingMode} = require('../pages/SearchPages.js');
const {nextServerSecond} = require('../../../../shared/playwright/support/order.js');

const T = 30_000;

const SUMMARY = 'A journal for testing.';
const THEME_FIELDS = [
    'Theme',
    'Typography',
    'Colour',
    'Journal Summary',
    'Journal Content Organization',
    'Header Background Image',
    'Usage statistics display options',
];
const NOTO_SANS = 'Noto Sans: A digital-native font designed by Google for extensive language support.';
const LORA_OPEN_SANS = 'Lora/Open Sans: A complimentary pairing with serif headings and sans-serif body text.';
const NO_STATS = 'Do not display submission usage statistics chart for reader.';
const SUMMARY_BOX = 'Show the journal summary on the homepage.';
const HEADER_IMAGE_BOX = 'Show the homepage image as the header background.';
const ISSUE_TOC = "Include the current issue's table of contents";
const RECENT = 'Include recent most published articles';
const CATEGORIES = 'Include a listing of categories';
const ALT_GUIDANCE =
    'Describe this image for visitors viewing the site in a text-only browser or with assistive devices. Example: "Our editor speaking at the PKP conference."';
const WRONG_TYPE = "You can't upload files of this type.";
const MASTHEAD_BOX = 'Consider role in masthead list';
const MASTHEAD_DESCRIPTION = 'Define the order of masthead roles for public display.';
const REVIEWERS_NOTE =
    'Reviewers who completed a review in the previous calendar year will be credited in a standardized format to maintain uniformity and ensure easy discoverability in this section.';
const REQUIRED = 'This field is required.';
const AT_LEAST_ONE = 'This must be at least 1.';
const NOT_INTEGER = 'This is not a valid integer.';
/** The browser clock of the "Date & Time" scenarios: the spec's example moment. */
const EXAMPLE_MOMENT = new Date('2026-09-24T15:05:00');

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
    return `u10${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A scratch journal with a throwaway Journal Manager (and any further users and keys). */
async function seedJournal(ojsApi, tag, extra = {}) {
    const {users = [], ...rest} = extra;
    const answer = await ojsApi.createContext({
        tag,
        users: [{username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']}, ...users],
        ...rest,
    });
    return {manager: `${tag}mg`, name: `Scratch context ${tag}`, answer};
}

/**
 * Articles published outside any issue, by a throwaway author seeded as
 * `${tag}au`. With `apart` (a request context on the app's server) each is
 * seeded a server second after the one before: "Latest Publications" orders
 * by the date submitted, stamped to the second, and a page of it read by
 * OFFSET picks among tied articles as the database pleases (fix list B).
 */
async function seedArticles(ojsApi, tag, count, {apart} = {}) {
    const titles = [];
    for (let n = 1; n <= count; n++) {
        const title = `Article ${n} ${tag}`;
        if (apart && n > 1) {
            await nextServerSecond(apart);
        }
        await ojsApi.createSubmission({tag: `${tag}a${n}`, context: tag, submitter: `${tag}au`, title, submitted: true, published: true});
        titles.push(title);
    }
    return titles;
}

/** A page of an actor's own signed-in browser context. */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The server's today (the servers run in UTC) as its parts. */
function today() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {y: String(now.getUTCFullYear()), m: pad(now.getUTCMonth() + 1), d: pad(now.getUTCDate())};
}

/** Whether a CSS colour is dark (each channel under 100). */
function isDark(colour) {
    const [r, g, b] = (colour.match(/\d+(\.\d+)?/g) || []).map(Number);
    return r < 100 && g < 100 && b < 100;
}

/** Count the upload requests a page sends from now on. */
function countUploads(page) {
    const sent = [];
    page.on('request', (r) => {
        if (/\/temporaryFiles/.test(r.url()) && r.method() === 'POST') sent.push(r.url());
    });
    return sent;
}

/** Count the settings saves a page sends from now on. */
function countSaves(page) {
    const sent = [];
    page.on('request', (r) => {
        if (/\/api\/v1\/contexts\/\d+/.test(r.url()) && r.method() === 'POST') sent.push(r.url());
    });
    return sent;
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

/** A w×h RGB PNG, a gradient seeded by `seed`. */
function pngBuffer(w, h, seed = 0) {
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
        const o = y * (w * 3 + 1);
        for (let x = 0; x < w * 3; x++) raw[o + 1 + x] = (x * 7 + y * 3 + seed) & 0xff;
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const png = (name, w, h, seed = 0) => ({name, mimeType: 'image/png', buffer: pngBuffer(w, h, seed)});
const RED_HEADINGS = {name: 'red-headings.css', mimeType: 'text/css', buffer: Buffer.from('h1, h2, h3, h4, h5, h6 { color: rgb(255, 0, 0); }\n')};
/** A 1×1 JPEG picture. */
const PHOTO_JPG = {
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
    ),
};

test.describe('appearance & theming', () => {
    test("S1: a new journal's home page, its summary, its additional content and a style sheet", {tag: '@smoke'}, async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {context: {description: SUMMARY}});
        const home = new PublicLook(visitor, tag);

        // The home page, nothing set: the header, the footer and an empty
        // page between them (Rules 11, 12); the summary nowhere (control).
        await home.goto();
        await expect(home.header).toBeVisible();
        await expect(home.footer).toBeVisible();
        expect(await home.homeParts()).toEqual([]);
        await expect(home.root).toHaveText(/^\s*$/);
        await expect(home.pageBodyText()).resolves.not.toContain(SUMMARY);
        const skipBefore = await home.skipLinkTargets();
        expect(skipBefore.length).toBeGreaterThan(0);

        // The "Theme" tab as it opens (Rules 1, 4; Fields, "Theme").
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);
        await settings.goto();
        await expect(settings.topTab('appearance')).toHaveAttribute('aria-selected', 'true');
        await expect(settings.sideTab('theme')).toHaveAttribute('aria-selected', 'true');
        const theme = settings.theme;
        await theme.ready();
        expect(await theme.themeChoices()).toEqual(['Default Theme']);
        expect(await theme.fieldLabels()).toEqual(THEME_FIELDS);
        expect(await theme.chosen('typography')).toEqual([NOTO_SANS]);
        await expect(theme.colourBox).toHaveValue('#1E6292');
        await expect(theme.box(SUMMARY_BOX)).not.toBeChecked();
        await expect(theme.box(HEADER_IMAGE_BOX)).not.toBeChecked();
        expect(await theme.chosen('displayStats')).toEqual([NO_STATS]);

        // The summary: ticked and saved, the visitor's home page gains "About
        // the Journal" with the text, and a skip link to it (Rule 7).
        await theme.box(SUMMARY_BOX).check();
        await theme.save();
        await home.reload();
        await expect(home.aboutHeading).toHaveText(whole('About the Journal'));
        await expect(home.about).toContainText(SUMMARY);
        const skipAfter = await home.skipLinkTargets();
        expect(skipAfter.length).toBe(skipBefore.length + 1);
        const added = skipAfter.filter((s) => !skipBefore.some((b) => b.href === s.href));
        expect(added).toHaveLength(1);
        expect(added[0].href).toMatch(/#homepageAbout$/);
        expect(added[0].targetInsideAbout).toBe(true);
        const themeHeadingColour = await home.colourOf(home.aboutHeading);

        // "Additional Content": at the foot of the home page, after "About the
        // Journal"; not on the "About the Journal" page (Rules 12, 19).
        const advanced = await settings.open('advanced');
        await advanced.typeAdditionalContent('Welcome text');
        await advanced.save();
        await home.reload();
        await expect(home.additionalContent).toHaveText(whole('Welcome text'));
        const parts = await home.homeParts();
        expect(parts[parts.length - 1]).toBe('additional_content');
        expect(parts.indexOf('homepage_about')).toBeGreaterThan(-1);
        expect(parts.indexOf('homepage_about')).toBeLessThan(parts.length - 1);
        await home.openFromMenu('About', 'About the Journal');
        await expect(home.heading).toHaveText(whole('About the Journal'));
        await expect(home.additionalContent).toHaveCount(0);
        await expect(home.main).not.toContainText('Welcome text');

        // The style sheet: the box shows the file's own name and "Remove",
        // still after "Save" (T-ojs-1), then on the next load "styleSheet.css"
        // as a link (Fields, "Advanced"); the visitor's heading turns red, the
        // Dashboard's headings do not (Rule 26).
        const uploads = countUploads(page);
        const sheet = advanced.styleSheet;
        expect(await sheet.choose(RED_HEADINGS)).toBe(200);
        await expect(sheet.fileName).toHaveText(whole('red-headings.css'));
        await expect(sheet.removeButton).toBeVisible();
        await advanced.save();
        await expect(sheet.fileName).toHaveText(whole('red-headings.css'));
        await expect(sheet.fileLink).toHaveCount(0);
        await settings.reload();
        await settings.open('advanced');
        await expect(sheet.fileLink).toHaveText(whole('styleSheet.css'));
        await expect(sheet.fileLink).toHaveAttribute('href', /\/styleSheet\.css$/);
        await expect(sheet.removeButton).toBeVisible();
        await home.goto();
        await expect.poll(() => home.colourOf(home.aboutHeading)).toBe('rgb(255, 0, 0)');
        const dashboard = await (await asUser(manager)).newPage();
        await dashboard.goto(`/index.php/${tag}/dashboard/editorial`);
        await expect(dashboard.getByRole('heading').first()).toBeVisible({timeout: T});
        const dash = await new EditorialLook(dashboard).read();
        expect(dash.headingColours.length).toBeGreaterThan(0);
        expect(dash.headingColours).not.toContain('rgb(255, 0, 0)');
        expect(dash.styleSheets.some((href) => /styleSheet\.css/.test(href))).toBe(false);

        // Removed and saved: "About the Journal" is back in the theme's colour
        // (Rule 26).
        await sheet.removeButton.click();
        await advanced.save();
        await home.reload();
        await expect.poll(() => home.colourOf(home.aboutHeading)).toBe(themeHeadingColour);

        // A file the box does not take: dropped, refused in the box, nothing
        // sent (the style sheet's own upload above was sent: the control).
        expect(uploads).toHaveLength(1);
        await expect(sheet.uploadButton).toBeVisible();
        expect(await sheet.dropRefused(png('picture.png', 40, 40))).toBe(0);
        await expect(sheet.refusal).toHaveText(whole(WRONG_TYPE));
        expect(uploads).toHaveLength(1);
    });

    test("S2: the fonts, the header's colour and the favicon, from the journal and from the Settings Wizard", async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {manager, name} = await seedJournal(ojsApi, tag);
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const dashboard = await (await asUser(manager)).newPage();
        const dashboardLook = new EditorialLook(dashboard);
        const openDashboard = async () => {
            await dashboard.goto(`/index.php/${tag}/dashboard/editorial`);
            await expect(dashboard.getByRole('heading').first()).toBeVisible({timeout: T});
            return dashboardLook.read();
        };
        const dashBefore = await openDashboard();

        // Kept across side tabs, then saved: the headings in Lora, the text
        // in Open Sans (Rules 2, 5).
        const settings = new WebsiteSettings(page, tag);
        await settings.goto();
        const theme = await settings.open('theme');
        await theme.choice(LORA_OPEN_SANS).check();
        await settings.openSideTab('appearance-setup');
        await settings.openSideTab('theme');
        await expect(theme.choice(LORA_OPEN_SANS)).toBeChecked();
        await theme.save();
        // The home page of a new journal has no heading in its body: the
        // journal's name in the header is in the headings' font there; the
        // "About the Journal" page's heading is read beside it.
        await home.goto();
        let fonts = await home.fonts();
        expect(fonts.siteName).toMatch(/^"?Lora"?(,|$)/);
        expect(fonts.text).toMatch(/^"?Open Sans"?(,|$)/);
        await home.goto('/about');
        fonts = await home.fonts();
        expect(fonts.heading).toMatch(/^"?Lora"?(,|$)/);
        expect(fonts.text).toMatch(/^"?Open Sans"?(,|$)/);

        // "Colour", light: a yellow header with dark text, on the home page
        // and on "About the Journal" (Rule 6).
        await theme.typeColour('#FFFF00');
        await theme.save();
        for (const pathname of ['', '/about']) {
            await home.goto(pathname);
            const look = await home.headerLook();
            expect(look.background).toBe('rgb(255, 255, 0)');
            expect(isDark(look.nameColour), `the name's colour ${look.nameColour} is dark`).toBe(true);
            expect(isDark(look.menuColour), `the menu's colour ${look.menuColour} is dark`).toBe(true);
        }

        // "Colour", dark: navy blue (Rule 6).
        await theme.typeColour('#000080');
        await theme.save();
        await home.goto();
        expect((await home.headerLook()).background).toBe('rgb(0, 0, 128)');

        // A code the box cannot read: "Saved", and the header stays navy blue
        // (Rule 6).
        await theme.typeColour('red');
        await expect(theme.colourBox).toHaveValue('red');
        await theme.save();
        await home.reload();
        expect((await home.headerLook()).background).toBe('rgb(0, 0, 128)');

        // A file the favicon box does not take: refused in the box, nothing
        // sent; reloaded, "Favicon" is empty (Fields, "Advanced"; Rule 2).
        const uploads = countUploads(page);
        let advanced = await settings.open('advanced');
        let favicon = advanced.favicon('en');
        expect(await favicon.dropRefused(PHOTO_JPG)).toBe(0);
        await expect(favicon.refusal).toHaveText(whole(WRONG_TYPE));
        expect(uploads).toHaveLength(0);
        await settings.reload();
        advanced = await settings.open('advanced');
        favicon = advanced.favicon('en');
        await expect(favicon.uploadButton).toBeVisible();
        await expect(favicon.preview).toHaveCount(0);

        // "Favicon": the browser tab's icon on the visitor's home page and on
        // the manager's Dashboard (Rule 27); the upload was sent (the control
        // of "nothing sent" above).
        const icon = png('icon.png', 32, 32, 7);
        expect(await favicon.choose(icon)).toBe(200);
        expect(uploads).toHaveLength(1);
        await advanced.save();
        await home.goto();
        const icons = await home.faviconHrefs();
        expect(icons).toHaveLength(1);
        expect(icons[0]).toMatch(/\/favicon_en\.png$/);
        const iconAnswer = await (await asUser(manager)).newPage().then(async (p) => {
            const r = await p.goto(icons[0]);
            return {status: r && r.status(), body: r && (await r.body())};
        });
        expect(iconAnswer.status).toBe(200);
        expect(Buffer.compare(iconAnswer.body, icon.buffer)).toBe(0);
        expect((await openDashboard()).favicons).toEqual(icons);

        // The Site Administrator's wizard: the row's arrow, then the wizard's
        // tabs (Rule 34).
        const adminPage = await actorPage(asUser, 'admin');
        const wizard = new SettingsWizard(adminPage);
        await wizard.gotoHostedContexts();
        expect(await wizard.openRowActions(name)).toEqual(['Edit', 'Remove', 'Settings wizard']);
        await wizard.chooseWizard(name);
        expect(await wizard.topTabNames()).toEqual(['Journal Settings', 'Plugins', 'Users']);
        expect(await wizard.sideTabNames()).toEqual(['Journal', 'Appearance', 'Languages', 'Search Indexing', 'Restrict Bulk Emails']);

        // Unsaved in the wizard: kept across its side tabs, dropped without a
        // question on a reload (Rule 34).
        let appearance = await wizard.openAppearance();
        expect(await appearance.fieldLabels()).toEqual(THEME_FIELDS);
        await appearance.typeColour('#1B5E20');
        await wizard.openSideTab('Journal');
        await wizard.openSideTab('Appearance');
        await expect(appearance.colourBox).toHaveValue('#1B5E20');
        const asked = [];
        adminPage.on('dialog', (dialog) => {
            asked.push(dialog.type());
            dialog.accept().catch(() => {});
        });
        await adminPage.reload();
        await expect(adminPage.getByRole('tab').first()).toBeVisible({timeout: T});
        appearance = await wizard.openAppearance();
        await expect(appearance.colourBox).toHaveValue(/^#[0-9A-Fa-f]{6}$/);
        await expect(appearance.colourBox).not.toHaveValue('#1B5E20');
        expect(asked).toEqual([]);

        // Saved in the wizard: the visitor's header is dark green, the
        // journal's own "Theme" tab reads "#1B5E20" (Rule 34).
        await appearance.typeColour('#1B5E20');
        await appearance.save();
        await home.goto();
        expect((await home.headerLook()).background).toBe('rgb(27, 94, 32)');
        await settings.goto();
        await expect(settings.theme.colourBox).toHaveValue('#1B5E20');

        // Control: through every save the Dashboard kept its own header colour
        // and font (Rule 4).
        const dashAfter = await openDashboard();
        expect(dashAfter.headerBackground).toBe(dashBefore.headerBackground);
        expect(dashAfter.font).toBe(dashBefore.font);
    });

    test('S3: the logo, the thumbnail, the homepage image and the page footer', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {manager, name} = await seedJournal(ojsApi, tag);
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);
        await settings.goto();
        let setup = await settings.open('appearance-setup');

        // "Logo" uploaded: a preview with "Remove", no "Restore Original", and
        // an empty "Alternate text" box beside it under the guidance (Fields,
        // the upload boxes).
        const logo = setup.logo('en');
        expect(await logo.choose(png('logo.png', 1600, 160, 1))).toBe(200);
        await expect(logo.thumbnail).toBeVisible();
        await expect(logo.removeButton).toBeVisible();
        await expect(logo.restoreButton).toHaveCount(0);
        await expect(logo.altText).toHaveValue('');
        await expect(logo.altTextGuidance).toHaveText(whole(ALT_GUIDANCE));
        const [thumbBox, altBox] = [await logo.thumbnail.boundingBox(), await logo.altText.boundingBox()];
        expect(altBox.x).toBeGreaterThan(thumbBox.x + thumbBox.width - 1);

        // Control: before the first "Save" the visitor's header shows the
        // journal's name, no logo (Fields, the upload boxes).
        await home.goto();
        await expect(home.textNameLink).toHaveText(whole(name));
        await expect(home.logo).toHaveCount(0);

        // "Logo" saved: in the header in place of the name, 800 × 80, "Journal
        // logo" as its description, a link to the home page; on "About the
        // Journal" too (Rule 20).
        await logo.altText.fill('Journal logo');
        await setup.save();
        await home.reload();
        const shown = await home.logoShown();
        expect({width: shown.width, height: shown.height, alt: shown.alt}).toEqual({width: 800, height: 80, alt: 'Journal logo'});
        await expect(home.textNameLink).toHaveCount(0);
        const logoSrc = shown.src;
        await home.goto('/about');
        await expect(home.heading).toHaveText(whole('About the Journal'));
        expect((await home.logoShown()).src).toBe(logoSrc);
        await home.logoLink.click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}(/index)?/?$`));
        await expect(home.root).toBeAttached();

        // Replaced, then restored, on the tab loaded again: while the box holds
        // the picture its "Upload File" is disabled, so the new one goes in
        // after "Remove" (T-ojs-2); it arrives with an empty "Alternate text"
        // and "Restore Original"; restored, the saved logo and its text are
        // back (Fields, the upload boxes).
        await settings.reload();
        setup = await settings.open('appearance-setup');
        await expect(logo.altText).toHaveValue('Journal logo');
        await logo.expectUploadOffered(false);
        const savedPreview = await logo.thumbnail.getAttribute('src');
        expect(savedPreview).toMatch(/pageHeaderLogoImage_en\.png/);
        await logo.removeButton.click();
        await expect(logo.restoreButton).toBeVisible();
        await logo.expectUploadOffered(true);
        expect(await logo.choose(png('logo2.png', 400, 100, 2))).toBe(200);
        await expect(logo.altText).toHaveValue('');
        await expect(logo.restoreButton).toBeVisible();
        await expect(logo.thumbnail).not.toHaveAttribute('src', savedPreview);
        await logo.restoreButton.click();
        await expect(logo.thumbnail).toHaveAttribute('src', savedPreview);
        await expect(logo.altText).toHaveValue('Journal logo');

        // Replaced from the keyboard, on the tab loaded again: Tab reaches the
        // box's "Upload File", announced to a screen reader though not on
        // screen, and Enter opens the file chooser; "logo2.png" takes the
        // saved logo's place with an empty "Alternate text" and "Restore
        // Original"; restored, "logo.png" and "Journal logo" are back
        // (Fields, the upload boxes).
        await settings.reload();
        setup = await settings.open('appearance-setup');
        await expect(logo.thumbnail).toHaveAttribute('src', savedPreview);
        await expect(logo.altText).toHaveValue('Journal logo');
        await expect(logo.restoreButton).toHaveCount(0);
        await expect.poll(() => logo.uploadPresence(), {timeout: T}).toEqual({announced: true, onScreen: false});
        await expect(logo.control.getByRole('button', {name: 'Upload File', exact: true})).toHaveCount(1);
        await logo.tabToUpload();
        await expect(logo.control.getByRole('button', {name: 'Upload File', exact: true})).toBeFocused();
        expect(await logo.chooseByKeyboard(png('logo2.png', 400, 100, 2), {tab: true})).toBe(200);
        await expect(logo.thumbnail).not.toHaveAttribute('src', savedPreview);
        await expect(logo.thumbnail).toHaveCount(1);
        await expect(logo.altText).toHaveValue('');
        await expect(logo.restoreButton).toBeVisible();
        await logo.restoreButton.click();
        await expect(logo.thumbnail).toHaveAttribute('src', savedPreview);
        await expect(logo.altText).toHaveValue('Journal logo');
        await expect(logo.restoreButton).toHaveCount(0);

        // The thumbnail: beside the journal in the site's list of journals,
        // "Thumb" as its description (Rule 21).
        const thumbnail = setup.thumbnail('en');
        expect(await thumbnail.choose(png('thumb.png', 120, 120, 3))).toBe(200);
        await thumbnail.altText.fill('Thumb');
        await setup.save();
        const site = new PublicLook(visitor, 'index');
        await visitor.goto('/index.php/index');
        const siteThumb = site.siteThumbnail(name);
        await expect(siteThumb).toBeVisible({timeout: T});
        await expect(siteThumb).toHaveAttribute('alt', 'Thumb');
        await expect(siteThumb).toHaveAttribute('src', /journalThumbnail_en\.png$/);
        await expect.poll(() => siteThumb.evaluate((i) => i.complete && i.naturalWidth)).toBe(120);

        // "Homepage Image": stretched to the full width of the main column,
        // "Our building" as its description (Rule 18).
        const homepageImage = setup.homepageImage('en');
        expect(await homepageImage.choose(png('home.png', 300, 100, 4))).toBe(200);
        await homepageImage.altText.fill('Our building');
        await setup.save();
        await home.goto();
        const picture = await home.homepageImageShown();
        expect(picture.naturalWidth).toBe(300);
        expect(Math.abs(picture.width - picture.mainWidth), `the picture (${picture.width}) spans the main column (${picture.mainWidth})`).toBeLessThanOrEqual(1);
        expect(picture.width).toBeGreaterThan(300);
        expect(picture.alt).toBe('Our building');

        // "Header Background Image": the picture fills the header's background
        // on the home page and on "About the Journal", and leaves the home
        // page's body (Rule 8); unticked, it is back in the body (Rule 18).
        const theme = await settings.open('theme');
        await theme.box(HEADER_IMAGE_BOX).check();
        await theme.save();
        await home.goto();
        expect((await home.headerLook()).backgroundImage).toMatch(/homepageImage_en\.png/);
        await expect(home.root).toBeAttached();
        await expect(home.homepageImage).toHaveCount(0);
        await home.goto('/about');
        expect((await home.headerLook()).backgroundImage).toMatch(/homepageImage_en\.png/);
        await theme.box(HEADER_IMAGE_BOX).uncheck();
        await theme.save();
        await home.goto();
        await expect(home.homepageImage).toBeVisible();
        expect((await home.headerLook()).backgroundImage).toBe('none');

        // "Page Footer": at the foot of the home page and of "About the
        // Journal", above the application's logo (Rule 22).
        setup = await settings.open('appearance-setup');
        await setup.typeFooter('Footer line');
        await setup.save();
        for (const pathname of ['', '/about']) {
            await home.goto(pathname);
            await expect(home.footerContent).toHaveText(whole('Footer line'));
            await expect(home.footerBrand).toBeVisible();
            expect(await home.footerAboveBrand()).toBe(true);
        }

        // "Logo" removed: "Restore Original" shows; saved, the header shows the
        // name again (Rule 20) and the logo's address no longer opens the
        // picture (Side effects).
        await logo.removeButton.click();
        await expect(logo.restoreButton).toBeVisible();
        await setup.save();
        await home.goto();
        await expect(home.textNameLink).toHaveText(whole(name));
        await expect(home.logo).toHaveCount(0);
        const gone = await visitor.goto(logoSrc);
        expect(gone && gone.status()).toBe(404);
    });

    test('S4: the sidebar: blocks placed, ordered, switched off and removed', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {manager} = await seedJournal(ojsApi, tag);
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);
        const plugins = new PluginsTab(page, tag);
        const WEB_FEED = 'Web Feed Plugin';
        const DEVELOPED_BY = '"Developed By" Block';
        const LANGUAGE = 'Language Toggle Block';
        const BLOCK_CLASS = {[WEB_FEED]: 'block_web_feed', [DEVELOPED_BY]: 'block_developed_by'};

        // Control: before the first "Save" the home page has no sidebar
        // (Rules 23, 24).
        await home.goto();
        await expect(home.footer).toBeVisible();
        await expect(home.sidebar).toHaveCount(0);

        // The list as it opens: one box per block, none ticked, no ""Make a
        // Submission" Block" (Rule 23, which claims no order for unticked
        // boxes; CI's fresh box lists them in another order).
        await settings.goto();
        let setup = await settings.open('appearance-setup');
        const opened = await setup.sidebar.read();
        expect(opened.map((r) => r.label).sort()).toEqual([WEB_FEED, 'Information Block', 'Subscription Block', LANGUAGE].sort());
        expect(opened.filter((r) => r.checked)).toEqual([]);

        // A block plugin enabled: its box joins the list, unticked (Rule 23).
        await plugins.goto();
        await expect(plugins.enabledBox('developedbyblockplugin')).not.toBeChecked();
        expect(await plugins.enable('developedbyblockplugin')).toBe(200);
        await settings.goto();
        setup = await settings.open('appearance-setup');
        let rows = await setup.sidebar.read();
        expect(rows.map((r) => r.label).sort()).toEqual([WEB_FEED, 'Information Block', 'Subscription Block', LANGUAGE, DEVELOPED_BY].sort());
        expect(rows.every((r) => r.checked === false)).toBe(true);

        // Placed: the ticked boxes first, the unticked after (Rule 23); the
        // visitor's sidebar holds the two blocks in the list's order, nothing
        // for the language block on a one-language journal (Rule 24).
        for (const label of [WEB_FEED, DEVELOPED_BY, LANGUAGE]) await setup.sidebar.box(label).check();
        await setup.save();
        await settings.goto();
        setup = await settings.open('appearance-setup');
        rows = await setup.sidebar.read();
        expect(rows.slice(0, 3).map((r) => r.label).sort()).toEqual([WEB_FEED, DEVELOPED_BY, LANGUAGE].sort());
        expect(rows.map((r) => r.checked)).toEqual([true, true, true, false, false]);
        const placed = rows.slice(0, 3).map((r) => r.label).filter((l) => l !== LANGUAGE);
        await home.reload();
        await expect(home.sidebar).toBeVisible();
        expect(await home.sidebarBlocks()).toEqual(placed.map((l) => BLOCK_CLASS[l]));
        const withSidebar = await home.layout();

        // Dragged to the top by its handle: first in the sidebar (Rules 23, 24).
        await setup.sidebar.dragToTop(DEVELOPED_BY);
        await expect.poll(() => setup.sidebar.labels().then((l) => l[0])).toBe(DEVELOPED_BY);
        await setup.save();
        await home.reload();
        expect(await home.sidebarBlocks()).toEqual(['block_developed_by', 'block_web_feed']);

        // Moved by its up arrow until first: first in the sidebar (Rules 23, 24).
        await expect(setup.sidebar.upArrow(WEB_FEED)).toHaveText(whole(`Increase position of ${WEB_FEED}`));
        expect(await setup.sidebar.moveToTop(WEB_FEED)).toBeGreaterThan(0);
        await setup.save();
        await home.reload();
        expect(await home.sidebarBlocks()).toEqual(['block_web_feed', 'block_developed_by']);

        // Its plugin switched off: the block leaves the sidebar and the list
        // (Rule 25); the tab is left unsaved.
        await plugins.goto();
        expect(await disablePlugin(page, plugins, 'webfeedplugin')).toBe(200);
        await home.reload();
        expect(await home.sidebarBlocks()).toEqual(['block_developed_by']);
        await settings.goto();
        setup = await settings.open('appearance-setup');
        expect((await setup.sidebar.labels()).sort()).toEqual([DEVELOPED_BY, 'Information Block', 'Subscription Block', LANGUAGE].sort());

        // Its plugin switched on again: ticked and first again, in the list
        // and in the sidebar (Rule 25).
        await plugins.goto();
        expect(await plugins.enable('webfeedplugin')).toBe(200);
        await settings.goto();
        setup = await settings.open('appearance-setup');
        expect((await setup.sidebar.read())[0]).toEqual({label: WEB_FEED, checked: true});
        await home.reload();
        expect(await home.sidebarBlocks()).toEqual(['block_web_feed', 'block_developed_by']);

        // None ticked: no sidebar on the home page or "About the Journal", the
        // content keeping its width, in the middle of the page (Rule 24).
        for (const row of await setup.sidebar.read()) {
            if (row.checked) await setup.sidebar.box(row.label).uncheck();
        }
        expect((await setup.sidebar.read()).every((r) => r.checked === false)).toBe(true);
        await setup.save();
        for (const pathname of ['', '/about']) {
            await home.goto(pathname);
            await expect(home.footer).toBeVisible();
            await expect(home.sidebar).toHaveCount(0);
            const layout = await home.layout();
            expect(layout.main.width).toBe(withSidebar.main.width);
            expect(Math.abs(layout.main.left - layout.content.left - (layout.content.right - layout.main.right))).toBeLessThanOrEqual(2);
        }
    });

    test("S5: the order of the masthead's roles", async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const person = (suffix, givenName, roles, pastRole) => ({
            username: `${tag}${suffix}`,
            givenName,
            familyName: 'Member',
            roles,
            ...(pastRole ? {pastRoles: [{role: pastRole}]} : {}),
        });
        const {manager} = await seedJournal(ojsApi, tag, {
            users: [
                person('ed', 'Edith', ['editor']),
                person('ex', 'Evan', ['reader'], 'editor'),
                person('se', 'Selma', ['sectionEditor']),
                person('sx', 'Silas', ['reader'], 'sectionEditor'),
                person('eb', 'Ebba', ['editorialBoardMember']),
                person('bx', 'Boris', ['reader'], 'editorialBoardMember'),
            ],
        });
        const EDITOR = 'Journal editor';
        const SECTION_EDITOR = 'Section editor';
        const BOARD = 'Editorial Board Member';
        const PRODUCTION = 'Production editor';
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);
        const roles = new RolesTab(page, tag);
        const about = new AboutPages(visitor, tag);

        // The list as it opens: three roles, each with a handle and two arrows
        // and no box, no Reviewer role; below, "Reviewers" and its note
        // (Fields, "Editorial Masthead"; Rule 28). Above it the enrollment
        // masthead box, ticked on a new journal; the reviewers box unticked
        // (pkp-lib#13370).
        await settings.goto();
        let masthead = await settings.open('appearance-masthead');
        await expect(masthead.enrollmentBox).toBeChecked();
        await expect(masthead.description).toHaveText(whole(MASTHEAD_DESCRIPTION));
        expect(await masthead.roles.read()).toEqual([
            {label: EDITOR, checked: null},
            {label: SECTION_EDITOR, checked: null},
            {label: BOARD, checked: null},
        ]);
        for (const role of [EDITOR, SECTION_EDITOR, BOARD]) {
            await expect(masthead.roles.handle(role)).toHaveCount(1);
            await expect(masthead.roles.upArrow(role)).toHaveCount(1);
            await expect(masthead.roles.downArrow(role)).toHaveCount(1);
            await expect(masthead.roles.row(role).locator('input')).toHaveCount(0);
        }
        await expect(masthead.reviewersField).toContainText('Reviewers');
        await expect(masthead.reviewersField).toContainText(REVIEWERS_NOTE);
        await expect(masthead.reviewersBox).toHaveCount(1);
        await expect(masthead.reviewersBox).not.toBeChecked();

        // Control: before the "Save" the masthead page's last role heading is
        // "Editorial Board Member" (Rule 28).
        await about.goto('masthead');
        await expect(about.listHeadings()).toHaveText([EDITOR, SECTION_EDITOR, BOARD].map(whole));

        // A role ticked before the first save: at the place of its permission
        // level, above "Section editor" (Rule 28; Settings bullet 24).
        await roles.setRoleBox(PRODUCTION, MASTHEAD_BOX, true);
        await settings.goto();
        masthead = await settings.open('appearance-masthead');
        let order = await masthead.roles.labels();
        expect(order).toHaveLength(4);
        expect(order.filter((r) => r !== PRODUCTION)).toEqual([EDITOR, SECTION_EDITOR, BOARD]);
        expect(order.indexOf(PRODUCTION)).toBeLessThan(order.indexOf(SECTION_EDITOR));

        // Reordered: "Editorial Board Member" first; the masthead page and the
        // history page head with it, the others in the list's order (Rule 28).
        await masthead.roles.moveToTop(BOARD);
        order = await masthead.roles.labels();
        expect(order[0]).toBe(BOARD);
        await masthead.save();
        const shownRoles = order.filter((r) => r !== PRODUCTION);
        await about.gotoHome();
        await about.chooseFromAboutMenu('Editorial Masthead');
        await expect(about.listHeadings()).toHaveText(shownRoles.map(whole));
        await about.historyLink().click();
        // (the page's own heading is U07's, its wording parked there as U07 A6)
        await expect(visitor).toHaveURL(/\/about\/editorialHistory$/);
        await expect(about.listHeadings().first()).toHaveText(whole(BOARD));
        await expect(about.listHeadings()).toHaveText(shownRoles.map(whole));

        // A role ticked after the first save: last in the list (Rule 28;
        // Settings bullet 24).
        await roles.setRoleBox('Layout Editor', MASTHEAD_BOX, true);
        await settings.goto();
        masthead = await settings.open('appearance-masthead');
        expect(await masthead.roles.labels()).toEqual([...order, 'Layout Editor']);
    });

    test('S6: the "Lists" tab: refused numbers, then one entry a page', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {users: [{username: `${tag}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']}]});
        const titles = await seedArticles(ojsApi, tag, 3, {apart: visitor.request});
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);

        // As it opens: 25 and 10 (Fields, "Lists").
        await settings.goto();
        let lists = await settings.open('lists');
        await expect(lists.itemsPerPage).toHaveValue('25');
        await expect(lists.pageLinks).toHaveValue('10');

        // Refused: emptied, "This field is required." and nothing sent; "0"
        // and "-1" "This must be at least 1."; "abc" and "2.5" "This is not a
        // valid integer."; "0" in "Page links" "This must be at least 1."
        // (Fields, "Lists").
        const saves = countSaves(page);
        await lists.itemsPerPage.fill('');
        await lists.saveButton.click();
        await expect(lists.errorUnder('itemsPerPage')).toHaveText(whole(REQUIRED));
        expect(saves).toHaveLength(0);
        for (const [value, message] of [['0', AT_LEAST_ONE], ['-1', AT_LEAST_ONE], ['abc', NOT_INTEGER], ['2.5', NOT_INTEGER]]) {
            await lists.itemsPerPage.fill(value);
            const answer = await lists.pressSave();
            expect(answer.status(), `"${value}" is refused`).toBe(400);
            await expect(lists.errorUnder('itemsPerPage')).toHaveText(whole(message));
        }
        await lists.itemsPerPage.fill('25');
        await lists.pageLinks.fill('0');
        expect((await lists.pressSave()).status()).toBe(400);
        await expect(lists.errorUnder('numPageLinks')).toHaveText(whole(AT_LEAST_ONE));
        await expect(lists.errorUnder('itemsPerPage')).toHaveCount(0);

        // No upper limit (Fields, "Lists").
        await lists.itemsPerPage.fill('100000');
        await lists.pageLinks.fill('100000');
        await lists.save();

        // One a page: saved, and read back after a reload (Rule 2).
        await lists.itemsPerPage.fill('1');
        await lists.pageLinks.fill('3');
        await lists.save();
        await settings.reload();
        lists = await settings.open('lists');
        await expect(lists.itemsPerPage).toHaveValue('1');
        await expect(lists.pageLinks).toHaveValue('3');

        // "Latest Publications", one article a page with its page links
        // (Rules 13, 29, 30).
        await home.goto();
        await expect(home.latestHeading).toHaveText(whole('Latest Publications'));
        await expect(home.latestItems).toHaveCount(1);
        const seen = [await home.latestTitles()];
        expect(await home.latestPaging()).toEqual({text: '1 - 1 of 3 items 1 2 3 > >>', links: ['2', '3', '>', '>>'], current: '1'});
        await home.latestPageLink('2').click();
        await expect(home.latestItems).toHaveCount(1);
        seen.push(await home.latestTitles());
        expect(await home.latestPaging()).toEqual({text: '2 - 2 of 3 items << < 1 2 3 > >>', links: ['<<', '<', '1', '3', '>', '>>'], current: '2'});
        await home.latestPageLink('3').click();
        await expect(home.latestItems).toHaveCount(1);
        seen.push(await home.latestTitles());
        const last = await home.latestPaging();
        expect(last.text).toMatch(/^3 - 3 of 3 items << < /);
        expect(last.current).toBe('3');
        expect(last.links.slice(0, 2)).toEqual(['<<', '<']);
        expect(last.links).not.toContain('>');
        expect(last.links).not.toContain('>>');
        expect(seen.flat().sort()).toEqual([...titles].sort());

        // Control: Settings › Users & Roles › "Users" still lists every user
        // of the journal on one page (Rule 29): the manager, the author and
        // the site's administrator.
        await page.goto(`/index.php/${tag}/management/settings/access`);
        const users = page.getByRole('table', {name: /Current Users/});
        await expect(users).toBeVisible({timeout: T});
        for (const who of [`${tag}mg@mail.test`, `${tag}au@mail.test`, 'admin@mail.test']) {
            await expect(users.getByRole('row').filter({hasText: who})).toHaveCount(1);
        }
        await expect(users.locator('tbody tr')).toHaveCount(3);
    });

    test('S7: date formats, from the tab to the public pages', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {
            enableAnnouncements: true,
            numAnnouncementsHomepage: 1,
            announcements: [{title: 'Call for papers'}],
        });
        const {y, m, d} = today();
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        await page.clock.setFixedTime(EXAMPLE_MOMENT);
        const settings = new WebsiteSettings(page, tag);

        // Control: before the first "Save" the announcement's date reads in
        // the default "Date (Short)" (Fields, "Date & Time"; Rule 31).
        await home.goto();
        await expect(home.announcementDate).toHaveText(whole(`${y}-${m}-${d}`));

        // The tab as it opens: five groups, each choice but "Custom" written
        // as the browser's today, the defaults chosen (Fields, "Date & Time").
        await settings.goto();
        const dt = await settings.open('dateTime');
        await expect(dt.form).toContainText('Date and Time Formats');
        await expect(dt.form).toContainText('Choose the preferred format for dates and times. A custom format can be entered using the special format characters.');
        await expect(dt.form.getByRole('link', {name: 'format characters', exact: true})).toHaveCount(1);
        const groups = {
            dateFormatLong: ['Date', ['September 24, 2026', 'September 24 2026', '24 September 2026', '2026 September 24', 'Custom'], 'September 24, 2026'],
            dateFormatShort: ['Date (Short)', ['2026-09-24', '24-09-2026', '09/24/2026', '24.09.2026', 'Custom'], '2026-09-24'],
            timeFormat: ['Time', ['15:05', '03:05 PM', '3:05PM', 'Custom'], '03:05 PM'],
            datetimeFormatLong: ['Date & Time', ['September 24, 2026 - 03:05 PM', 'Custom'], 'September 24, 2026 - 03:05 PM'],
            datetimeFormatShort: ['Date & Time (Short)', ['2026-09-24 03:05 PM', 'Custom'], '2026-09-24 03:05 PM'],
        };
        for (const [field, [legend, labels, chosen]] of Object.entries(groups)) {
            expect(await dt.legend(field)).toBe(legend);
            expect((await dt.choices(field)).map((c) => c.label)).toEqual(labels);
            expect(await dt.chosen(field)).toBe(chosen);
        }

        // The combined choices follow "Date (Short)" and "Date", there and
        // back (Rule 32).
        await dt.choice('dateFormatShort', '24.09.2026').check();
        await expect.poll(() => dt.choices('datetimeFormatShort')).toEqual([
            {label: '24.09.2026 03:05 PM', checked: true},
            {label: 'Custom', checked: false},
        ]);
        await dt.choice('dateFormatShort', '2026-09-24').check();
        await expect.poll(() => dt.choices('datetimeFormatShort')).toEqual([
            {label: '2026-09-24 03:05 PM', checked: true},
            {label: 'Custom', checked: false},
        ]);
        await dt.choice('dateFormatShort', '24.09.2026').check();
        await dt.choice('dateFormatLong', '24 September 2026').check();
        await expect.poll(() => dt.choices('datetimeFormatLong')).toEqual([
            {label: '24 September 2026 - 03:05 PM', checked: true},
            {label: 'Custom', checked: false},
        ]);
        await dt.save();

        // The visitor's dates: the announcement's date in the chosen "Date
        // (Short)" (Rule 31).
        await home.reload();
        await expect(home.announcementDate).toHaveText(whole(`${d}.${m}.${y}`));

        // "Custom": the dates print in the typed pattern (Rule 33).
        await dt.custom('dateFormatShort').check();
        await dt.customBox('dateFormatShort').fill('d/m/Y');
        await dt.save();
        await home.reload();
        await expect(home.announcementDate).toHaveText(whole(`${d}/${m}/${y}`));
    });

    test('S8: a journal in two languages', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {
            context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            enableAnnouncements: true,
            numAnnouncementsHomepage: 1,
            announcements: [{title: 'Call for papers'}],
        });
        const {y, m, d} = today();
        const english = new PublicLook(visitor, tag, {locale: 'en'});
        const french = new PublicLook(visitor, tag, {locale: 'fr_CA'});
        const page = await actorPage(asUser, manager);
        await page.clock.setFixedTime(EXAMPLE_MOMENT);
        const settings = new WebsiteSettings(page, tag, {locale: 'en'});

        // Control: before the first "Save" the English page's foot holds no
        // footer text, only the application's logo (Fields, "Setup").
        await english.goto();
        await expect(english.footerBrand).toBeVisible();
        await expect(english.footerContent).toHaveCount(0);

        // A French footer alone: shown on the English page and on the French
        // one (Rule 3).
        await settings.goto();
        const setup = await settings.open('appearance-setup');
        await setup.showLanguage('French');
        await setup.typeFooter('Pied de page', 'fr_CA');
        expect(await setup.richContent(setup.footerId('en'))).toBe('');
        await setup.save();
        await english.goto();
        await expect(english.footerContent).toHaveText(whole('Pied de page'));
        await french.goto();
        await expect(french.footerContent).toHaveText(whole('Pied de page'));

        // Both languages: each page its own (Rule 3).
        await setup.typeFooter('English footer', 'en');
        await setup.save();
        await english.goto();
        await expect(english.footerContent).toHaveText(whole('English footer'));
        await french.goto();
        await expect(french.footerContent).toHaveText(whole('Pied de page'));

        // An English logo alone: the French page's header shows it, with its
        // English description (Rule 3).
        const logo = setup.logo('en');
        expect(await logo.choose(png('logo.png', 400, 60, 5))).toBe(200);
        await logo.altText.fill('Journal logo');
        await expect(setup.logo('fr_CA').preview).toHaveCount(0);
        await setup.save();
        await french.goto();
        expect((await french.logoShown()).alt).toBe('Journal logo');

        // Dates per language: a French "Date (Short)" of "24.09.2026" prints
        // on the French page only (Rule 3).
        const dt = await settings.open('dateTime');
        await dt.showLanguage('French');
        await dt.choice('dateFormatShort', '24.09.2026', 'fr_CA').check();
        await expect(dt.choice('dateFormatShort', '24.09.2026', 'fr_CA')).toBeChecked();
        await expect(dt.choice('dateFormatShort', '2026-09-24', 'en')).toBeChecked();
        await dt.save();
        await french.goto();
        await expect(french.announcementDate).toHaveText(whole(`${d}.${m}.${y}`));
        await english.goto();
        await expect(english.announcementDate).toHaveText(whole(`${y}-${m}-${d}`));
    });

    test('S9: a journal with no issue: its recent articles and its categories', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {
            users: [{username: `${tag}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']}],
            categories: [
                {path: 'arts', title: 'Arts'},
                {path: 'science', title: 'Science', children: [{path: 'physics', title: 'Physics'}]},
            ],
        });
        const titles = await seedArticles(ojsApi, tag, 2);
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);

        // As it opens: "Include recent most published articles" alone (Rule 10).
        await settings.goto();
        const theme = await settings.open('theme');
        expect(await theme.chosen('journalContentOrganization')).toEqual([RECENT]);

        // The home page: the two articles, "1 - 2 of 2 items", no page links,
        // no categories, no "Current Issue" (Rules 12, 13, 15).
        await home.goto();
        await expect(home.latestHeading).toHaveText(whole('Latest Publications'));
        await expect(home.latestItems).toHaveCount(2);
        expect((await home.latestTitles()).sort()).toEqual([...titles].sort());
        expect(await home.latestPaging()).toEqual({text: '1 - 2 of 2 items', links: [], current: null});
        await expect(home.categoryLinks).toHaveCount(0);
        await expect(home.currentIssue).toHaveCount(0);

        // The categories: a row of the top-level ones above "Latest
        // Publications"; "Arts" opens its page (Rules 12, 15).
        await theme.box(CATEGORIES).check();
        await theme.save();
        await home.reload();
        await expect(home.categoryLinks).toHaveText([whole('Arts'), whole('Science')]);
        const parts = await home.homeParts();
        expect(parts.indexOf('categoryHeader')).toBeGreaterThan(-1);
        expect(parts.indexOf('categoryHeader')).toBeLessThan(parts.indexOf('sections latest_articles'));
        await home.categoryLinks.filter({hasText: whole('Arts')}).click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/catalog/category/arts$`));
        await expect(home.heading).toHaveText(whole('Arts'));

        // Recent articles off: the categories stay, "Latest Publications" goes
        // (Rule 10).
        await theme.box(RECENT).uncheck();
        await theme.save();
        await home.goto();
        await expect(home.categoryLinks).toHaveText([whole('Arts'), whole('Science')]);
        await expect(home.latest).toHaveCount(0);

        // Control: reloaded, "Theme" has the categories box alone ticked (Rule 2).
        await settings.goto();
        await settings.theme.ready();
        expect(await settings.theme.chosen('journalContentOrganization')).toEqual([CATEGORIES]);
    });

    test('S10: a journal with a current issue, then not published online', async ({asUser, ojsApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const {manager} = await seedJournal(ojsApi, tag, {issues: [{volume: 1, number: 1, year: 2026, published: true}]});
        const home = new PublicLook(visitor, tag);
        const page = await actorPage(asUser, manager);
        const settings = new WebsiteSettings(page, tag);

        // As it opens: the current issue's table of contents alone (Rule 10).
        await settings.goto();
        const theme = await settings.open('theme');
        expect(await theme.chosen('journalContentOrganization')).toEqual([ISSUE_TOC]);

        // The home page: "Current Issue", its name, no article, "View All
        // Issues" to the archive (Rule 14); never "Latest Publications"
        // (control, Rule 13).
        await home.goto();
        await expect(home.currentIssueHeading).toHaveText(whole('Current Issue'));
        await expect(home.currentIssueTitle).toHaveText(whole('Vol. 1 No. 1 (2026)'));
        await expect(home.currentIssueArticles).toHaveCount(0);
        await expect(home.latest).toHaveCount(0);
        await expect(home.viewAllIssues).toHaveText(whole('View All Issues'));
        await home.viewAllIssues.click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/issue/archive$`));
        await expect(home.heading).toHaveText(whole('Archives'));

        // Not published online: "Current Issue" is gone (Rule 14; Settings
        // bullet 25); still no "Latest Publications" (Rule 13).
        await setPublishingMode(page, tag, 'none');
        await home.goto();
        await expect(home.header).toBeVisible();
        await expect(home.root).toBeAttached();
        await expect(home.currentIssue).toHaveCount(0);
        await expect(home.latest).toHaveCount(0);
    });
});
