// @ts-check
/**
 * @file playwright/tests/U69-monograph-landing-page.spec.js
 *
 * Monograph landing page — OPS suite. A preprint server does not install
 * the book's page (the spec's title badge is {OMP}), so the server runs
 * the one scenario written for it, S10 "No book's page on a journal or a
 * preprint server" {OJS OPS}, its preprint-server half: the absence test
 * with a positive control per assertion (RUNBOOK multi-app rule 3), in the
 * server's own words: the "catalog/book/" address and the preprint's page
 * with its galley "PDF". S1–S9 are the press's, in its tree; S10's
 * journal half is the OJS suite's.
 * Spec: docs/specs/U69-monograph-landing-page.md
 *
 * The spec's control (a press's "catalog/book/" address opening the
 * book's page) is taken on a scratch press, which the OPS fleet does not
 * serve (a CI job installs one app); it runs in the OMP suite. Here each
 * absence is paired with what the server offers in the same place, read
 * the same way: the "404 Not Found" answer beside the preprint's own
 * address answering its page; on the preprint's page the missing price
 * beside the galley link "PDF" itself, and the missing table of contents
 * beside the galley list and the side column's "Posted" and "Versions"
 * parts, read by the same locators and from the same heading list.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A22: all on the press's book page, chapter pages, view pages and
 *   purchase, which a preprint server does not have.
 *
 * Seeding: scenario endpoints only, as footnote s says: a scratch server
 * with throwaway accounts (its default section "Preprints" kept), and one
 * scratch preprint of its author, `published: true` (posted) with the
 * galley "PDF" (`galleys[]`, preprint.pdf). The seeded server
 * publicknowledge and the seeded roster are never touched.
 *
 * The visitor is the fixture's own page, which carries no session in a
 * test that sets no `user`. The "404 Not Found" page is read by its status
 * and heading (expectNotFoundPage); the preprint's page once its title has
 * drawn (ArticleLandingPage.expectLoaded); the absences as locator counts
 * (auto-waited), as the galley link's own words and as the page's full
 * heading list, screen-reader ones included, each beside a present part
 * read the same way (M4, M6). Waits are web-first (A5). Runs in the
 * parallel `ops` project: nothing here changes a shared setting.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    ArticleLandingPage,
    expectNotFoundPage,
    flat,
} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');

/** Words a book's table of contents carries (the press's `.item.chapters` heading and its kin). */
const TOC_WORDS = ['Chapters', 'Table of Contents'];
/** Words a priced galley link carries on a journal that sells articles. */
const PRICE_WORDS = ['Requires Subscription or Fee', 'USD'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u69${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Every h1–h3 of the item, the screen-reader-only ones included, flattened. */
function allHeadings(landing) {
    return landing.article().evaluate((article) =>
        Array.from(article.querySelectorAll('h1, h2, h3')).map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
    );
}

test.describe('Monograph landing page', () => {
    test("S10: no book's page on a preprint server", async ({page, opsApi}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        await opsApi.createContext({
            tag,
            context: {name: {en: `U69 server ${tag}`}},
            users: [
                {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
                {username: `${tag}au`, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
            ],
        });
        const title = `Tidal Patterns ${tag}`;
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}a`,
            context: tag,
            submitter: `${tag}au`,
            title,
            published: true,
            galleys: [{label: 'PDF', locale: 'en', file: 'preprint.pdf'}],
        });

        // The server's address followed by "catalog/book/" and the
        // preprint's number answers the "404 Not Found" page (Purpose, the
        // absence paragraph). Control: the preprint's own address, opened
        // the same way, answers its page with the preprint's title.
        const landing = new ArticleLandingPage(page, tag, {op: 'preprint'});
        await expectNotFoundPage(page, `/index.php/${tag}/catalog/book/${submissionId}`);
        await expect(landing.article()).toHaveCount(0);
        await expect(page.getByRole('heading', {level: 1})).not.toHaveText(title);

        const response = await landing.goto(submissionId);
        expect(response && response.status()).toBe(200);
        await expect(landing.title()).toHaveText(title);
        await expect(page.getByRole('heading', {level: 1})).toHaveText(title);

        // The preprint's page lists its galley "PDF", with no price
        // (Purpose, the absence paragraph): the link's whole words are
        // "PDF", with no restricted mark and no price part. Control: the
        // link itself, read by the same locators.
        await expect(landing.galleyLinks()).toHaveCount(1);
        await expect(landing.galleyLink('PDF')).toHaveCount(1);
        expect(flat(await landing.galleyLinks().first().textContent())).toBe('PDF');
        await expect(landing.galleyLinks().first()).toHaveClass(/\bobj_galley_link\b/);
        await expect(landing.galleyLinks().first()).not.toHaveClass(/\brestricted\b/);
        await expect(landing.article().locator('a.obj_galley_link')).toHaveCount(1);
        await expect(landing.article().locator('a.obj_galley_link.restricted')).toHaveCount(0);
        await expect(landing.article().locator('.purchase_cost')).toHaveCount(0);
        const text = flat(await landing.article().innerText());
        expect(text).toContain(title);
        expect(text).toContain('PDF');
        for (const word of PRICE_WORDS) {
            expect(text).not.toContain(word);
        }

        // ... and no table of contents: no chapter list and no heading of
        // one, read by locator and from the page's full heading list.
        // Control: the galley list and the side column's "Posted" and
        // "Versions" parts, read the same ways.
        await expect(landing.sideColumn().locator('ul.galleys_links')).toHaveCount(1);
        await expect(landing.sideItem('Posted')).toHaveCount(1);
        await expect(landing.sideItem('Versions')).toHaveCount(1);
        await expect(landing.article().locator('.item.chapters')).toHaveCount(0);
        await expect(landing.article().locator('.item.galleys')).not.toHaveCount(0);
        for (const word of TOC_WORDS) {
            await expect(landing.article().getByRole('heading', {name: word, exact: true})).toHaveCount(0);
        }
        await expect(landing.article().getByRole('heading', {name: 'Posted', exact: true})).toHaveCount(1);
        const headings = await allHeadings(landing);
        expect(headings).toContain(title);
        expect(headings).toContain('Posted');
        expect(headings).toContain('Versions');
        for (const word of TOC_WORDS) {
            expect(headings).not.toContain(word);
        }
        await expect(landing.article().locator('a[href*="/catalog/book/"], a[href*="/chapter/"]')).toHaveCount(0);
        await expect(landing.article().locator(`a[href*="/preprint/view/${submissionId}/"]`)).not.toHaveCount(0);
    });
});
