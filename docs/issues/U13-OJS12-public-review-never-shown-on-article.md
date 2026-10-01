# A review the editor marks public never shows on the published article's page

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no public review option)
  - 3.4: none (code; no public review option)
  - 3.3: none (code; no public review option)
- **Introduced** not traced (the default theme never got a display for public reviews); present since at least [865ac924a5](https://github.com/pkp/ojs/commit/865ac924a53607f843623ed33f283e8d9dd847bd) (2025-10-15)
- **Upstream** none found for the default theme (2026-10-01); `pkp/ojs#5784` (open) adds the separate Eidos theme, whose article page shows these reviews
- **Tracked in** U13 [OJS12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor ticks "Publicly Show Reviewer Comments" on a review and presses
"Mark as Complete". The dialog says "This review will be made publicly
visible alongside the article." Once the article is published, its page
shows no review at all: no "Peer Review" heading, no reviewer's name and
no comments, whether a visitor or the editor opens it.

The reviews are stored. What is missing is the display: OJS's default
theme has none, and it is the only theme OJS ships. The peer-review DOI
that Crossref can register for such a review points to the same page,
which does not show the review.

Public reviews exist only on `main`, so no released OJS has this problem
and no live journal meets it today. On `main`, every journal that makes
reviews public meets it. pkp has not decided in public whether the default
theme will show these reviews. The commit that removed its styling for
them calls this "TBD for default theme". The new Eidos theme shows them,
but its pull request leaves the default theme unchanged.

## Impact

- **Lost:** the public display of the reviews. Readers see neither the
  comments nor, for a review in the "Open" review mode, the reviewer's
  name. The reviews themselves stay stored and would show in a theme that
  renders them.
- **Who:** on `main`, every journal that marks reviews public, either one
  review at a time or through the journal's review setting. That means
  its readers, the editors who were told the review is public, and anyone
  following a peer-review DOI the journal deposited with Crossref.
- **Way round:** none on screen in the default theme.

High: for every journal that uses public reviews, the article page never
shows them, silently, while the dialog says it will. Peer-review DOIs
registered with Crossref resolve to that page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Submission 10, "Condensing Water Availability Models to Focus on
  Specific Water Management Systems", is in Review round 1, with Aisla
  McCrae's and Adela Gallego's reviews submitted. Issue "Vol. 1 No. 2
  (2014)" is published. Nothing else is needed.

Steps:

1. Sign in as `dbarnes` and open submission 10, "Review" › "Review Round 1".
2. In "Reviewers", on the "Aisla McCrae" row, press "More Actions" ›
   "Edit". Choose the Review Type "Open", tick "Publicly Show Reviewer
   Comments" and press "OK".
3. On the same row, press "Read Review" › "Mark as Complete". The dialog
   reads "Mark this review as complete? This review will be made publicly
   visible alongside the article. You can still modify this review after
   marking it as complete. You will have the opportunity to thank the
   reviewer in the next step." Press "Mark as Complete".
4. Press "Accept Submission", go through the steps with "Continue", and
   press "Record Decision".
5. In "Copyediting", press "Send To Production", then "Record Decision".
6. In "Publication" › "Title & Abstract", press "Schedule For
   Publication". Choose "Assign To Current/Back Issue" and "Vol. 1 No. 2
   (2014)", press "Confirm", then "Publish".
7. Open the article's page, `/index.php/publicknowledge/article/view/10`,
   as `dbarnes` and again signed out.
8. Open the address that a Crossref deposit of Aisla McCrae's Round 1
   review carries: the article's page followed by
   `?tab=peer-review-record&reviewId=` and the number of that review.
   In the dataset as loaded, the full address is
   `/index.php/publicknowledge/article/view/10?tab=peer-review-record&reviewId=15`.

**Expected:** the article page shows the review that step 3 promised to
make public, under a "Peer Review" heading. It names "Aisla McCrae" and
the review date, and once the review is opened it shows "Here are my
review comments". Adela Gallego's review, which was never marked public,
stays off the page.

**Observed:** after step 3, the row reads "Complete" and "Open". After
step 6, the publication is published in "Vol. 1 No. 2 (2014)". In steps 7
and 8, signed in or out, the page has only these headings: the title,
"Authors", "Keywords:", "Abstract", "Published", "Versions", "Issue" and
"Section". Neither "Aisla McCrae" nor "Here are my review comments"
appears on the page or in its source. Every request answers 200, and no
script fails.

## Cause

`ArticleHandler::view()` (`pages/article/ArticleHandler.php`) builds an
`OpenReviewComponent` for every article page. It passes the page the
display's locale keys, icons and constants, and the template variable
`openReviewConfig`. That variable holds `submissionPeerReviews` and
`submissionPeerReviewSummary`, the same public record that the
`peerReviews` API serves. `submissionPeerReviews` holds only reviews that
were marked public, accepted by the reviewer and confirmed by the editor,
from rounds whose version is published. The summary also counts public
reviews that are accepted but not yet confirmed.

No template uses that variable. OJS's
`templates/frontend/objects/article_details.tpl`, which the default theme
renders, mounts the public comments (`<pkp-comments>`) but not the
open-review display. That display exists as the frontend components
`PkpOpenReview` and `PkpOpenReviewSummary`, registered in
`lib/pkp/js/load_frontend.js`. The record was first prepared for the page
as `publicationsPeerReviews` (865ac924a5, `pkp/pkp-lib#11922`) and later
as `openReviewConfig` (a35b58fe0a). The default theme's styling for it
was removed as "TBD for default theme" (08789e4f51, `pkp/ojs#5330`), and
`styles/components/openreview.less` stayed behind, empty and never
imported.

Meanwhile, the editor's screens promise the display:

- the review setting describes making the review process "publicly
  visible alongside published submissions" (`pkp/pkp-lib#12045`);
- the Add Reviewer and Edit windows offer the per-review box
  (`pkp/pkp-lib#12204`);
- the "Mark as Complete" dialog adds the sentence
  `editor.review.confirmReview.message.publiclyVisible`
  (`pkp/pkp-lib#13156`).

Reach:

- Peer-review DOIs work on `main` (code). The DOI settings offer the type
  "Peer Review", and the Crossref plugin allows it
  (`CrossrefPlugin::getAllowedDoiTypes()`). The plugin deposits each
  public review's DOI with the address
  `article/view/<id>?tab=peer-review-record&reviewId=<id>`
  (`PeerReviewCrossrefXmlFilter`). On screen, in the default theme, that
  address shows the page without the review (step 8).
- OMP offers the same box and dialog, through the shared `lib/pkp` and
  `ui-library` code. But OMP builds no open-review record for its book
  page at all (code). That is a separate gap, not covered by this fix.

## Proposed fix

Mount the existing `PkpOpenReview` display in OJS's
`templates/frontend/objects/article_details.tpl`, inside `.main_entry`,
between the References section and the public comments. Show it only when
the record holds a round with a public review. Also import the default
theme's open-review stylesheet
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown-on-article/fix.diff)):

```diff
--- a/templates/frontend/objects/article_details.tpl
+++ b/templates/frontend/objects/article_details.tpl
@@ -291,6 +291,16 @@
 				</section>
 			{/if}
 
+			{* Open peer review: the reviews the editor marked public *}
+			{if $openReviewConfig.submissionPeerReviews.reviewRounds}
+				<section id="peer-review-record" class="item open_review" data-vue-root>
+					<h2 class="label">
+						{translate key="openReview.title"}
+					</h2>
+					<pkp-open-review v-bind='{$openReviewConfig|json_encode_html_attribute}'></pkp-open-review>
+				</section>
+			{/if}
+
 			{if $enablePublicComments}
 				<section id="public-comments" class="item comments" data-vue-root>
 					<h2 class="label">
--- a/plugins/themes/default/styles/index.less
+++ b/plugins/themes/default/styles/index.less
@@ -37,6 +37,7 @@
 @import "components/dropdownMenu.less";
 @import "components/dialog.less";
 @import "components/comments.less";
+@import "components/openreview.less";
 @import "components/icon.less";
```

How the parts work:

- **The guard.** It tests `reviewRounds`, so an article without a public
  review is unchanged. No "Peer review data is not available" line
  appears across the journal.
- **What the guard hides.** It also hides the "Reviews in progress" state
  (`PkpOpenReviewInProgress`), which the summary reports while a public
  review is accepted but not yet confirmed. That state never shows in the
  default theme. This is a choice for the team. The alternative is to
  test `submissionPeerReviewSummary.reviewStatus.dateInProgress`.
- **Escaping.** `json_encode_html_attribute` (as used in
  `lib/pkp/templates/submission/wizard.tpl`) escapes quotes, `<` and `&`
  in the single-quoted attribute, because a reviewer's comments may
  contain them.
- **The DOI address.** The deep link works through `reviewId`, not
  through the section id, which is only an anchor. On load,
  `usePkpOpenReviewStore.initialize()` opens the review that `reviewId`
  names. `scrollToReviewFromUrl()` then scrolls to its
  `[data-review-id]`. `initialize()` also calls `viewFullRecord()`, which
  sets the `tab` group to `peer-review-record` and rewrites `?tab=` in the
  address with `history.replaceState`. The default theme has no tabs, so
  this changes only the address bar, and a deposited DOI still lands on
  the opened review.
- **Why not the summary.** `PkpOpenReviewSummary` is left out because its
  "See full peer review record" button only switches that tab, which the
  default theme does not have.

Tried on `main` (OJS) with both changes. After the Steps, the page shows
"Peer Review", "Round 1 Version of Record 1.0", "Status: Completed" and
"Aisla McCrae | Review Date: September 30, 2026". Pressing "Read Review"
shows "Aisla McCrae University of Manitoba" and "Here are my review
comments". The step 8 address opens on that same review. Adela Gallego's
name stays off the page. Articles 1 and 17, which have no public review,
show no peer-review section and no script error, with the fix in or out.

**Alternatives:**

- Drop the "publicly visible" sentence and the setting's promise while
  the default theme shows no reviews. That would be honest, but it leaves
  the reviews and their DOIs without a page.
- Leave public reviews to the Eidos theme (`pkp/ojs#5784`). Only journals
  that switch themes would get them, and the dialog and DOIs would stay
  wrong in the default theme.
- Render the record in Smarty, as Eidos does in Blade. That would
  duplicate the markup and the by-round and by-reviewer views that the
  shared component already provides.

**What goes with it:**

- Styles in `openreview.less`. Without them, the display is complete and
  readable, but its sort buttons and review cards use browser defaults.
- No data repair.
- A test: an e2e scenario that marks a review public, publishes the
  article and reads the review on its page (U13 Rule 23).

Medium: the template and the import are a few lines on an existing
pattern, but the display's look in the default theme still needs styles
and a design call.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown-on-article/walk.js)
  takes Steps 1–8 on the default dataset and also checks Adela Gallego's
  name and article 17:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown-on-article/walk.js`.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/public-review-never-shown-on-article/fix.diff ojs`.
  [`trial.sh`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown-on-article/trial.sh)
  walks `walk.js` and
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown-on-article/neighbour.js)
  (articles 1 and 17) with the fix in, then walks `neighbour.js` again
  with the fix reverted.
- The walks ran on PostgreSQL, on pkp/datasets `38ab955` (2026-09-30).
  MySQL was not checked; a missing template section does not depend on
  the database.
- Tips: OJS `main` `bade233f73`, `lib/pkp` `2e377d27fc`, `lib/ui-library`
  `280f98c5`. `stable-3_5_0`: `92b9a16b48`, `lib/pkp` `a9c76aed62`.
  `stable-3_4_0`: `9571d8fde7`, `lib/pkp` `df13621c2d`. `stable-3_3_0`:
  `9fdb9bcf9a`, `lib/pkp` `d446601ebe`.
- Code read on 3.5, 3.4 and 3.3:
  - `editReviewForm.tpl` has no `isReviewPubliclyVisible` box.
  - The locale has no "Publicly Show Reviewer Comments" text.
  - `ArticleHandler` prepares no peer-review record.
  - 3.5 has no `api/v1/peerReviews`.

  Step 2 cannot be taken on these versions, so 3.5 was read in the code
  rather than walked.
- Introduced: `git log -S` on `openReviewConfig` and
  `publicationsPeerReviews` finds only
  [a35b58fe0a](https://github.com/pkp/ojs/commit/a35b58fe0af0f124bfba32f2e73ec91dc0649579)
  (`pkp/ojs#5285`) and 865ac924a5 (`pkp/ojs#5138`). The lib/pkp commits
  behind the promise are
  [408d83d163](https://github.com/pkp/pkp-lib/commit/408d83d163a7045e93bb568ba287e061f1461d8f),
  [4c8551e04c](https://github.com/pkp/pkp-lib/commit/4c8551e04c2304d13409f1df787b2dc50b0700f2)
  and
  [4017a024f3](https://github.com/pkp/pkp-lib/commit/4017a024f31cbfccd8e36287a836587f8a7b5fb9).
  The styling removal is
  [08789e4f51](https://github.com/pkp/ojs/commit/08789e4f5104e9b986aa9a87b76afe7e46fee36d).
- The plan for the default theme: `pkp/ojs#5330` (08789e4f51) and
  `pkp/ojs#5285` have no discussion. `pkp/pkp-lib#11309` ("[Implementation]
  Open Peer Review", open) has no description. `pkp/ojs#5784`, the Eidos
  theme, renders `openReviewConfig` on a `peer-review-record` tab
  (`templates/components/article/tab-peer-review.blade`, read in
  NateWr/Eidos `f25cf54`). Its only change to `article_details.tpl` is a
  locale key, and its change to the default theme's styles is in
  `comments.less`.
- Not driven: OMP's book page (code only) and the "in progress" state.
