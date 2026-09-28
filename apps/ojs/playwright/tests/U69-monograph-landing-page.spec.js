// @ts-check
/**
 * @file playwright/tests/U69-monograph-landing-page.spec.js
 *
 * Monograph landing page — OJS suite. A journal does not install the
 * book's page (the spec's title badge is {OMP}), so the journal runs the
 * one scenario written for it, S10 "No book's page on a journal or a
 * preprint server" {OJS OPS}, its journal half: the absence test with a
 * positive control per assertion (RUNBOOK multi-app rule 3), in the
 * journal's own words: the "catalog/book/" address and the article's page
 * with its priced galley. S1–S9 are the press's, in its tree; S10's
 * preprint-server half is the OPS suite's.
 * Spec: docs/specs/U69-monograph-landing-page.md
 *
 * The spec's control (a press's "catalog/book/" address opening the
 * book's page) is taken on a scratch press, which the OJS fleet does not
 * serve (a CI job installs one app); it runs in the OMP suite. Here each
 * absence is paired with what the journal offers in the same place, read
 * the same way: the "404 Not Found" answer beside the article's own
 * address answering its page, and on the article's page the missing table
 * of contents beside the galley list and the side column's "Issue" part,
 * read by the same locators and from the same heading list.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A22: all on the press's book page, chapter pages, view pages and
 *   purchase, which a journal does not have.
 *
 * Seeding: scenario endpoints only, as footnote s says: a scratch journal
 * (`publishingMode: 'subscription'`, `payments` with `purchaseArticleFee:
 * 5` on "Manual Fee Payment" in USD) with throwaway accounts, and one
 * scratch article of its author, `published: true` with the galley "PDF"
 * (`galleys[]`, article.pdf). The article is published into the journal's
 * one published issue (`issues[]`, the submission's `issue`), as the claim
 * check that probed the priced link did (U69 ccK1 `sub`): an issue born
 * under the subscription mode carries "Subscription" access, which is what
 * locks the galley. The seeded journal publicknowledge and the seeded
 * roster are never touched.
 *
 * The visitor is the fixture's own page, which carries no session in a
 * test that sets no `user`. The "404 Not Found" page is read by its status
 * and heading (expectNotFoundPage); the article's page once its title has
 * drawn (ArticleLandingPage.expectLoaded); the absences as locator counts
 * (auto-waited) and as the page's full heading list, screen-reader ones
 * included, each beside a present part read the same way (M4, M6). Waits
 * are web-first (A5). Runs in the parallel `ojs` project: nothing here
 * changes a shared setting.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    ArticleLandingPage,
    expectNotFoundPage,
    flat,
} = require('../../../../shared/playwright/pages/ArticleLandingPages.js');

const PRICED_PDF = 'Requires Subscription or Fee PDF (USD 5)';
/** Words a book's table of contents carries (the press's `.item.chapters` heading and its kin). */
const TOC_WORDS = ['Chapters', 'Table of Contents'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u69${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Every h1–h3 of the item, the screen-reader-only ones included, flattened. */
function allHeadings(landing) {
    return landing.article().evaluate((article) =>
        Array.from(article.querySelectorAll('h1, h2, h3')).map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
    );
}

test.describe('Monograph landing page', () => {
    test("S10: no book's page on a journal", async ({page, ojsApi}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const issue = {volume: 1, number: 1, year: 2026};
        await ojsApi.createContext({
            tag,
            context: {name: {en: `U69 journal ${tag}`}},
            publishingMode: 'subscription',
            payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.', purchaseArticleFee: 5},
            users: [
                {username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
                {username: `${tag}au`, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
            ],
            issues: [{...issue, published: true}],
        });
        const title = `Tidal Patterns ${tag}`;
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}a`,
            context: tag,
            submitter: `${tag}au`,
            title,
            published: true,
            issue,
            galleys: [{label: 'PDF', file: 'article.pdf'}],
        });

        // The journal's address followed by "catalog/book/" and the
        // article's number answers the "404 Not Found" page (Purpose, the
        // absence paragraph). Control: the article's own address, opened
        // the same way, answers its page with the article's title.
        const landing = new ArticleLandingPage(page, tag);
        await expectNotFoundPage(page, `/index.php/${tag}/catalog/book/${submissionId}`);
        await expect(landing.article()).toHaveCount(0);
        await expect(page.getByRole('heading', {level: 1})).not.toHaveText(title);

        const response = await landing.goto(submissionId);
        expect(response && response.status()).toBe(200);
        await expect(landing.title()).toHaveText(title);
        await expect(page.getByRole('heading', {level: 1})).toHaveText(title);

        // The article's page lists its galley, whose link reads "Requires
        // Subscription or Fee PDF (USD 5)" (Purpose, the absence paragraph).
        await expect(landing.galleyLinks()).toHaveCount(1);
        await expect(landing.galleyLinks().first()).toHaveClass(/\brestricted\b/);
        expect(flat(await landing.galleyLinks().first().textContent())).toBe(PRICED_PDF);
        await expect(landing.galleyLinks().first().locator('.purchase_cost')).toHaveText('(USD 5)');

        // ... and no table of contents: no chapter list and no heading of
        // one, read by locator and from the page's full heading list.
        // Control: the galley list and the side column's "Issue" part, read
        // the same ways.
        await expect(landing.sideColumn().locator('ul.galleys_links')).toHaveCount(1);
        await expect(landing.sideItem('Issue')).toHaveCount(1);
        await expect(landing.article().locator('.item.chapters')).toHaveCount(0);
        await expect(landing.article().locator('.item.galleys')).not.toHaveCount(0);
        for (const word of TOC_WORDS) {
            await expect(landing.article().getByRole('heading', {name: word, exact: true})).toHaveCount(0);
        }
        await expect(landing.article().getByRole('heading', {name: 'Issue', exact: true})).toHaveCount(1);
        const headings = await allHeadings(landing);
        expect(headings).toContain(title);
        expect(headings).toContain('Issue');
        for (const word of TOC_WORDS) {
            expect(headings).not.toContain(word);
        }
        await expect(landing.article().locator('a[href*="/catalog/book/"], a[href*="/chapter/"]')).toHaveCount(0);
        await expect(landing.article().locator(`a[href*="/article/view/${submissionId}/"]`)).not.toHaveCount(0);
    });
});
