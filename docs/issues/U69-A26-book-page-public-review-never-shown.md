# A review made public never shows on the published book's page

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none (no "Publicly Show Reviewer Comments")
  - 3.4: none (code; no public review option)
  - 3.3: none (code; no public review option)
- **Introduced** not traced (the book page never had a display, so no commit broke one); the fault exists since OMP got the box, in [17b988fde4](https://github.com/pkp/omp/commit/17b988fde4e79492c82f747712fe82df8f84c543) (2026-01-22)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U69 [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a26)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor ticks "Publicly Show Reviewer Comments" on an "Open" review
and presses "Mark as Complete", whose dialog says "This review will be
made publicly visible alongside the article." Once the book is
published, its page shows no review at all: no comments, no reviewer's
name, no review heading, for a visitor or for the editor.

The press believes its reviews are public, and nobody learns that
readers never see them.

It concerns presses that publish reviews. An editor ticks the box on
each review. A press can also have it ticked on every new review: the
setting "Make reviewer comments publicly visible with published
content" (Settings › Workflow › Review › "Setup") does that, and it is
off until the press turns it on. A journal's article page has the same
fault, with a different fix
([pkp-e2e#218](https://github.com/jardakotesovec/pkp-e2e/issues/218)).

## Impact

- **Lost.** What readers miss: the published reviews, the reason a
  press opts into transparent peer review. The reviews themselves stay
  stored.
- **Who.** Nobody yet: the box exists on `main` only, and no release
  carries it, so this must be fixed before the next release ships. Then
  it reaches readers of every book with a review made public, on every
  press that publishes reviews. The box is offered on every review type,
  not only "Open": an anonymous review made public would show its
  comments without the reviewer's name, and it is missing from the page
  the same way (read in the code; the walk took an Open review). It is a
  gap in intended work: the options reached OMP with the feature, but
  the display was built for OJS's article page alone and never for the
  book page, and no pkp issue plans it.
- **Way round.** None. No setting shows the reviews. Off screen there is
  none either: the page receives no review data for a theme to show,
  and OMP's public API for the reviews points at a missing class.

Medium: a press's choice to publish reviews silently does nothing, but
only presses that make that choice meet it; a page that lost content
every press relies on would be high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- Submission 16, "A Designer's Log: Case Studies in Instructional
  Design", is in Review, round 1, with one submitted review, from Adela
  Gallego ("I recommend that the author revise this submission."). Its
  review type is the press's default, "Anonymous Reviewer/Anonymous
  Author". Nothing to create.

Steps:

1. Sign in as `dbarnes` and open submission 16.
2. In "Reviewers", Adela Gallego's row: "More Actions" › "Edit". Choose
   the review type "Open", tick "Publicly Show Reviewer Comments", press
   "OK".
3. Adela Gallego's row: "Read Review", then "Mark as Complete". Press
   "Mark as Complete" in the dialog.
4. "Accept Submission": go through its steps and press "Record
   Decision".
5. "Send To Production": go through its steps and press "Record
   Decision".
6. In "Publication" › "Title & Abstract", press "Publish", then
   "Publish" in "Schedule For Publication" (the version is "Version of
   Record 1.0").
7. Sign out and open the book's page,
   `/index.php/publicknowledge/catalog/book/16`.
8. Sign in as `dbarnes` again and open the same page.

**Expected:** the dialog of step 3 promises the review a public place:

```
Mark this review as complete?
This review will be made publicly visible alongside the article. You can still modify this review after marking it as complete. You will have the opportunity to thank the reviewer in the next step.
```

So the book's page shows Adela Gallego's review: her name, since the
review is Open, and "I recommend that the author revise this
submission.", under a review heading.

**Observed:** the notice "The review has been marked as complete."
follows the dialog, and the book is published (the
header offers "Unpublish"). The book's page, in steps 7 and 8 alike,
holds "Authors", "Synopsis", the chapters, "Published" and "Versions",
and no review: no "Adela Gallego", no "I recommend that the author
revise this submission." (not in the page's source either), no review
heading. The page requests no review data, and no request or script
fails.

## Cause

The display of public reviews was built for OJS's article page and
never added to OMP. Three parts are missing, each in OMP's own code:

- **No data.** `CatalogBookHandler::book()`
  (`pages/catalog/CatalogBookHandler.php`) never builds the shared
  `PKP\components\OpenReviewComponent`, which resolves a submission's
  public reviews, and never calls `requiresVueRuntime()`. OJS's
  `ArticleHandler::view()` does both and assigns the result as
  `openReviewConfig`.
- **No display in the bundle.** OMP's `js/load_frontend.js`, the entry
  of `js/build_frontend.js`, is still the five-line Vue runtime of
  `pkp/pkp-lib#11468` ([be6883bb58](https://github.com/pkp/omp/commit/be6883bb58decb623325a754e267eb31d5742bf3)).
  OJS's took the shared loader `lib/pkp/js/load_frontend.js` with
  `pkp/pkp-lib#11698` (OJS
  [f649b1ada1](https://github.com/pkp/ojs/commit/f649b1ada16d66485eb6a54842d25483329f42e3)
  and [b310814d35](https://github.com/pkp/ojs/commit/b310814d35a09131f8dd61f550be61888f78d94c),
  `pkp/ojs#5040`, 2025-08): it imports the loader, adds a
  `<pkp-modal-manager>` root and mounts every `data-vue-root`. The
  loader registers `PkpOpenReview` since pkp-lib
  [4ca4afcafe](https://github.com/pkp/pkp-lib/commit/4ca4afcafe11c0f12e5d7fc955ebfa3f052f5a57)
  (OJS side [a35b58fe0a](https://github.com/pkp/ojs/commit/a35b58fe0af0f124bfba32f2e73ec91dc0649579),
  `pkp/ojs#5285`, 2026-01-23). OMP's
  `package.json` also lacks `@fastify/deepmerge`, which that loader's
  usage chart imports, so the loader does not build in OMP without it.
- **No place on the page.** `templates/frontend/objects/monograph_full.tpl`
  has no element for the display.

Meanwhile the options that promise the display reached OMP through the
shared code: the box on each review with `pkp/pkp-lib#12204` (OMP's side
[17b988fde4](https://github.com/pkp/omp/commit/17b988fde4e79492c82f747712fe82df8f84c543),
`pkp/omp#2213`), the press's setting with `pkp/pkp-lib#12045`, and the
dialog's sentence with `pkp/pkp-lib#13156`. The rule broken is the
feature's own: the box "will make the review assignment's data publicly
visible on published articles" (the 3.6 feature notes,
`pkp/pkp-lib#11939`).

The reach:

- **The public API.** OMP routes `api/v1/publicationPeerReviews` to
  `PKP\API\v1\publicationPeerReviews\PublicationPeerReviewController`
  (`pkp/omp#2160`), a class pkp-lib no longer has since the controller
  moved to `PKP\API\v1\peerReviews\PeerReviewController`; OJS renamed
  its entry point to `api/v1/peerReviews`, OMP did not. So OMP serves
  the public reviews at no address either (checked in the code, not
  driven). That is its own one-file fix, outside this one: the page
  does not use the API.
- **Chapter pages** use `chapter.tpl` and show no review either; the
  reviews belong to the book, so the fix leaves them out (checked in
  the code).

## Proposed fix

A proposal.

**The section.** In OMP, the same three pieces OJS has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-public-review-never-shown/fix.diff)):

- `js/load_frontend.js`: copy OJS's file as it is. It imports
  `lib/pkp/js/load_frontend.js` and, on `DOMContentLoaded`, prepends a
  `data-vue-root` holding `<pkp-modal-manager>` to the page and mounts
  every `data-vue-root`. `package.json` adds `"@fastify/deepmerge":
  "^3.2.0"`, as OJS's has (then `npm install`, which updates the lock
  file).
- `CatalogBookHandler::book()`, for the book's page (not a chapter's),
  with `use PKP\components\OpenReviewComponent;` among the imports. The
  block goes after `setChapter()` has run, since that call sets
  `isChapterRequest`; `fix.diff` puts it after the `creditRoleTerms`
  assignment:

```php
        // Open peer review: the reviews made public, shown on the book's page
        if (!$this->isChapterRequest) {
            $templateMgr->requiresVueRuntime();
            $openReviewComponent = new OpenReviewComponent($submission);
            $templateMgr->setLocaleKeys($openReviewComponent->getLocaleKeys());
            $templateMgr->addSvgIcons($openReviewComponent->getSvgIcons());
            $templateMgr->assign('openReviewConfig', $openReviewComponent->getConfig());
            $templateMgr->setConstants($openReviewComponent->getConstants());
        }
```

- `monograph_full.tpl`, at the end of the main column, after
  "References":

```smarty
			{* Open peer review: shown once a review made public is confirmed by an editor *}
			{if $openReviewConfig.submissionPeerReviews.reviewRounds}
				<section id="open-review" class="item open_review" data-vue-root>
					<h2 class="label">
						{translate key="openReview.title"}
					</h2>
					<pkp-open-review v-bind='{$openReviewConfig|json_encode_html_attribute}'></pkp-open-review>
				</section>
			{/if}
```

The handler and the template follow OJS's `ArticleHandler::view()` and
the section the OJS report proposes, condition and encoding included.
The condition reads `submissionPeerReviews.reviewRounds`, which lists
only rounds with a public review an editor has confirmed ("Mark as
Complete"), not `submissionPeerReviewSummary`, which counts every
accepted public review. So a book whose public review was never
confirmed gets no empty section.

Tried on OMP `main`, with `@fastify/deepmerge` resolved from another
install in place of `npm install`: the book's page shows a "Peer
Review" section with "Round 1", "Version of Record 1.0" and Adela
Gallego's review (her name, "State University of New York", "I
recommend that the author revise this submission."), for the visitor
and for `dbarnes`. Books 5 and 14 (no review made public) show no
section. On submission 13, published with one review made public after
it was confirmed and another left private, the section holds the public
one alone; without the fix the same book shows none.

**The layout.** As on the article page, the components were built for a
tabbed page (a summary card and a "peer-review-record" tab), which the
default theme does not have. Which layout the default themes give the
reviews is one design decision for OJS and OMP together. Until it is
made, the section above shows what the dialog and the setting promise.

**Alternatives:**

- A slim OMP entry that registers `PkpOpenReview` alone: a smaller
  bundle, but OMP's front end would drift from OJS's, and each later
  reader component would need its own OMP change.
- Take the promise back on a press (no box, no dialog sentence, no
  setting in OMP) until a theme shows reviews: a product call.

**What goes with it:**

- Styles for the display. Unstyled it reads, but roughly: "Round 1" and
  "Version of Record 1.0" run together, as do the reviewer's name and
  affiliation. Neither app loads the bundle's own
  `styles/build_frontend.css`, and OJS's default theme has no styles for
  the display either, so where they belong (the theme, or the bundle's
  CSS loaded with the Vue runtime) is part of the layout decision.
- Every book page then loads the reader bundle, as every OJS article
  page does.
- The guard: an e2e scenario where a confirmed public review shows on
  the book's page and a private one does not (a Planned item in U69).

Medium: three OMP files and a dependency, tried; the bundle change
brings every shared reader component to OMP's front end, and the styles
wait on the layout decision.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-public-review-never-shown/walk.js)
  (helpers in `lib.js` beside it): Steps 1–8, with books 5 and 14 read as
  controls; with the argument `neighbour` it takes submission 13, "Mobile Learning:
  Transforming the Delivery of Education and Training" (Copyediting, two
  confirmed reviews), makes Adela Gallego's review Open and public from
  "External Review" › "Review Round 1" › "Edit", leaves Gonzalo Favio's
  private, sends it to production and publishes it, then reads books 13,
  5 and 14. On an install freshly loaded from the default dataset
  (pkp/datasets 384e28b, 2026-10-12, PostgreSQL):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-public-review-never-shown/walk.js [neighbour]`.
- Fix trial: `trial.diff` beside the script is `fix.diff` without the
  `package.json` line and with a `vite.config.frontend.js` alias that
  resolves `@fastify/deepmerge` from the OJS checkout's install. Without the
  dependency the build stops at `Rolldown failed to resolve import
  "@fastify/deepmerge" from ".../PkpUsageChart/PkpUsageChart.vue"`. The
  steps and the neighbour were walked with it in; the neighbour also
  with it out (no review on any of the three books).
- Tips: OMP `main` eb9381314 (pkp-lib f4c2578c94, ui-library c9889f00);
  OMP `stable-3_5_0` 486cbf9eb (pkp-lib 8094f06bf5); OMP
  `stable-3_4_0` 0aec65441 (pkp-lib 55c8e406b3); OMP `stable-3_3_0`
  8e72fc883 (pkp-lib 5e84acd11b).
- Code read on `main`: `CatalogBookHandler::book()`, `book.tpl`,
  `monograph_full.tpl`, OMP's and OJS's `js/load_frontend.js`,
  `vite.config.frontend.js` and `package.json`, `lib/pkp/js/load_frontend.js`,
  `PKPTemplateManager::requiresVueRuntime()` and
  `loadVueComponentStyles()`, `OpenReviewComponent`,
  `SubmissionPeerReviewResource` and `ReviewerRecommendationSummary`
  (app-neutral: review rounds of the published versions, publicly
  visible, accepted and confirmed reviews), `APIRouter` and OMP's
  `api/v1/publicationPeerReviews/index.php`. `git log` of OMP's
  `js/load_frontend.js` (last changed by be6883bb58) against OJS's (the
  reader components came with f649b1ada1).
- 3.5: walked to step 2, where "Edit" has no "Public Visibility"
  section; pkp-lib 3.5 has no public visibility field and OMP no review
  display. 3.4 and 3.3 (code): `git grep` over pkp-lib's classes,
  controllers, API, templates and English locale for the option, and
  over OMP's pages, templates and API for a review display: neither
  exists.
- Upstream search, 2026-10-13, pkp/pkp-lib, pkp/omp and pkp/ui-library,
  by the symptom's words and by
  `OpenReviewComponent`, `PkpOpenReview`, `publicationPeerReviews`,
  `load_frontend`. Read and not the same fault: `pkp/pkp-lib#11698`
  (open; the reader components' groundwork, OJS only), `#13205`,
  `#13242`, `#2976`; `pkp/omp#2160`, `#2180`, `#2213`, `#2222`, `#2232`
  (the feature's OMP sides, none with a display).
- Not driven: OMP's public API (the dangling entry point is read in the
  code); a press with "Make reviewer comments publicly visible with
  published content" on (U69's earlier probe of A26 showed the same
  page); an
  internal review made public (`SubmissionPeerReviewResource` keeps
  every round of a published version, internal ones included, so the
  section would list it; whether a press wants that is unverified).
- Unverified: whether the new theme of `pkp/pkp-lib#13242` will show the
  reviews on a press.
