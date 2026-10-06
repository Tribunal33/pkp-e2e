# A review marked "Publicly Show Reviewer Comments" never shows on the published article's page

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (OMP: see Cause)
  - 3.5: none (no "Publicly Show Reviewer Comments")
  - 3.4: none (code; no public review option)
  - 3.3: none (code; no public review option)
- **Introduced** not traced (a part never added, not a changed line); present since at least [865ac924a5](https://github.com/pkp/ojs/commit/865ac924a53607f843623ed33f283e8d9dd847bd) (2025-10-15)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor ticks "Publicly Show Reviewer Comments" on a review and
presses "Mark as Complete", whose dialog says "This review will be made
publicly visible alongside the article." Once the article is published,
its page shows no review at all: no comments, no reviewer's name, no
review heading, for a visitor or for the editor.

The journal believes its reviews are public, and nobody learns that
readers never see them. No setting puts the review on the page.

It concerns journals that publish reviews: the editor ticks the box on
each review, or the journal ticks it for every new review under
Settings › Workflow › Review › Setup ("Make reviewer comments publicly
visible with published content"), which is off until a journal turns it
on.

## Impact

- **Lost.** The published reviews, the reason a journal opts into
  transparent peer review. The reviews stay stored and would show once
  the page has a display.
- **Who.** Readers of every article with a review made public, on
  journals that publish reviews, once they run the release that brings
  public reviews.
- **Way round.** None on screen.

Medium: the feature a journal opts into does nothing on the page,
silently, but only journals that opt in meet it and nothing stored is
lost; it would be high for a journal that deposits peer-review DOIs,
whose landing address is this page (read in the code, not driven).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, journal `publicknowledge`.
- Submission 10, "Condensing Water Availability Models to Focus on
  Specific Water Management Systems", is in Review, round 1, with two
  submitted reviews, from Aisla McCrae and Adela Gallego, each with the
  comment "Here are my review comments". Nothing to create.

Steps:

1. Sign in as `dbarnes` and open submission 10.
2. In "Reviewers", Aisla McCrae's row: "More Actions" › "Edit". Choose
   the review type "Open", tick "Publicly Show Reviewer Comments", press
   "OK".
3. Aisla McCrae's row: "Read Review", then "Mark as Complete". Press
   "Mark as Complete" in the dialog.
4. Adela Gallego's row (left private): "Read Review", "Mark as
   Complete", and "Mark as Complete" in the dialog.
5. "Accept Submission": go through its steps and press "Record
   Decision".
6. "Send To Production": go through its steps and press "Record
   Decision".
7. In "Title & Abstract", press "Schedule For Publication". In "Review
   Publishing Details" pick "Version of Record", "Assign To Current/Back
   Issue" and "Vol. 1 No. 2 (2014)", press "Confirm", then "Publish".
8. Sign out and open the article's page,
   `/index.php/publicknowledge/article/view/10`.
9. Sign in as `dbarnes` again and open the same page.

**Expected:** the dialog of step 3 reads

```
Mark this review as complete? This review will be made publicly visible alongside the article. You can still modify this review after marking it as complete. You will have the opportunity to thank the reviewer in the next step.
```

so the article's page shows Aisla McCrae's review: her name, since the
review is Open, and "Here are my review comments". Adela Gallego's
private review stays off the page.

**Observed:** the dialog reads as above, the notice "The review has
been marked as complete." follows, and the article is published
("Status: Published"). The article's page, in steps 8 and 9 alike,
holds "Authors", "Keywords:", "Abstract", "Published", "Versions",
"Issue" and "Section", and no review: no "Aisla McCrae", no "Here are
my review comments" (not in the page's source either), no review
heading. The page requests no review data, and no request or script
fails.

Control: step 4's dialog has no "publicly visible" sentence, so the
editor is told about a difference that the page never shows.

## Cause

OJS's `ArticleHandler::view()` (`pages/article/ArticleHandler.php`,
lines 242–246) builds an `OpenReviewComponent` for every article page.
It resolves the public reviews (`SubmissionPeerReviewResource`,
`SubmissionPeerReviewSummaryResource`), adds the display's locale keys,
icons and constants to the page, and assigns the result to the
template as `openReviewConfig`. The frontend bundle registers the
display that takes it, `PkpOpenReview` (`lib/pkp/js/load_frontend.js`).

No template mounts that display. The theme's
`templates/frontend/objects/article_details.tpl` has no
`<pkp-open-review>` element and never reads `$openReviewConfig`, so the
reviews are computed and dropped. The rule it breaks is the feature's
own: the 3.6 feature notes (`pkp/pkp-lib#11939`) say the box "will make
the review assignment's data publicly visible on published articles".

The article page has prepared review data without showing it since
`pkp/pkp-lib#11922` ("Expose Publication's Open Peer Reviews via API"),
whose OJS commit assigned `publicationsPeerReviews` to the template.
`pkp/ojs#5285` ("initial work on OPR") replaced that with today's
component, together with default-theme styles for the display, which a
later commit removed as "TBD for default theme". No OJS template has
ever read either variable. Meanwhile the options that promise the
display shipped: the journal's setting with `pkp/pkp-lib#12045`, the box
on each review with `pkp/pkp-lib#12204`, the dialog's sentence with
`pkp/pkp-lib#13156`.

The reach:

- **Peer-review DOIs.** `PeerReviewCrossrefXmlFilter` deposits each
  public review's DOI with the address
  `…/article/view/{id}?tab=peer-review-record&reviewId={n}`, this page
  (checked in the code, not driven).
- **The public API** serves the same reviews to anyone, at
  `GET /api/v1/peerReviews/open/submissions/{submissionId}` (checked in
  the code).
- **OMP** has the same box and dialog and no display on a book's page;
  no OMP handler prepares one, so that needs a separate fix, left out
  here (checked in the code).
- **Cost.** The component's queries run on every article view and every
  galley view (the PDF reader page goes through the same `view()`), for
  nothing; `pkp/pkp-lib#13205` counts them.

## Proposed fix

A proposal, in two parts: a section that shows the reviews now, and a
design decision on the layout the components were built for.

**The section.** Mount the display in the default theme's article page,
where the handler already prepares it, the way the public comments
section beside it mounts `pkp-comments`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown/fix.diff)):

```diff
--- a/templates/frontend/objects/article_details.tpl
+++ b/templates/frontend/objects/article_details.tpl
@@ -291,6 +291,16 @@
 				</section>
 			{/if}
 
+			{* Open peer review: shown once a review made public is confirmed by an editor *}
+			{if $openReviewConfig.submissionPeerReviews.reviewRounds}
+				<section id="open-review" class="item open_review" data-vue-root>
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
```

The condition reads the list the display shows, not the summary. The
list (`SubmissionPeerReviewResource`) keeps only reviews an editor has
confirmed ("Mark as Complete", or the decision's reviewer email); the
summary's dates count every accepted public review by the reviewer's own
dates (`pkp/dev-team#380`). Keyed on the summary, an article whose only
public review was never confirmed would get the display's "Sort by" tabs
over an empty list (a submitted review) or its "reviews in progress"
note (an accepted one). The attribute is encoded with
`json_encode_html_attribute`, not the `json_encode` the comments section
uses: this configuration carries reviewers' comments as HTML, and an
apostrophe in one would end the single-quoted attribute.

Tried on OJS `main`: the article's page shows a "Peer Review" section
with "Round 1", "Version of Record 1.0" and Aisla McCrae's review
("Revisions Requested", her name and affiliation, "Here are my review
comments"), for the visitor and for `dbarnes`. Adela Gallego's review is
not on it. Articles 1 and 17 (no public review) show no section, and
neither does article 7, published with a public review that was
submitted but never confirmed. At the DOI's landing address
(`?tab=peer-review-record&reviewId=…`), McCrae's review is open on
arrival: the display reads the `reviewId` and ignores a tab the page
does not have.

**The layout.** The ui-library components were built for a tabbed
article page: `PkpOpenReviewSummary` on the article's own tab, whose
"See full record" switches to a `peer-review-record` tab holding
`PkpOpenReview`, the tab the DOI address names. The default theme's
article page has no tabs. Giving it that layout, or a summary card that
links to a section, is a design decision for the default theme, the one
the earlier "TBD for default theme" commit left open. The section above
keeps the promise and the DOI address meanwhile. When a tabbed layout
comes, the section's element moves into the tab, and the summary card
is added with the same condition.

**Alternatives:**

- Print the element from the handler through a template hook
  (`Templates::Article::Main`): it would also reach third-party themes
  that keep the hook, but puts markup in the handler at a place the
  theme cannot choose. Themes that override `article_details.tpl` add
  the same element.
- Take the promise back until a theme shows reviews (drop the dialog's
  sentence, reword the settings): the feature would then serve only the
  API and DOI deposits, a product call.
- Leave the display to a new theme: journals on the default theme
  would still publish nothing.

**What goes with it:**

- Styles for the display in the default theme. Unstyled it reads, but
  roughly: the round's number and version run together and the open
  card's "Hide Review" is drawn upside down. The stylesheet the earlier
  commit removed is a starting point.
- No data repair and no backport (3.5 has no public review option).
- The guard: the e2e scenario above, a confirmed public review shown on
  the article's page, a private or unconfirmed one not (a Planned item
  in U13).

Medium: the section is a few lines in one template (tried), but the
default theme's layout for the reviews (a section, or the summary and
record tab the components were built for) and its styles need a design
decision first.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-never-shown/walk.js)
  (helpers in `lib.js` beside it): Steps 1–9, then articles 1 and 17 as
  controls; with `neighbour` it adds article 7 (Paul Hudson's submitted
  review made public, the Accept decision's reviewer email skipped so it
  stays unconfirmed) and the DOI landing address. On an install freshly
  loaded from the default dataset (PostgreSQL):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/public-review-never-shown/walk.js [neighbour]`.
  Walked with the fix in and out; on 3.5 it stops at step 2.
- Tips: OJS `main` bade233f73 (pkp-lib 2e377d27fc, ui-library
  280f98c5); OJS `stable-3_5_0` 92b9a16b48 (pkp-lib a9c76aed62); OJS
  `stable-3_4_0` 9571d8fde7 (pkp-lib df13621c2d); OJS `stable-3_3_0`
  9fdb9bcf9a (pkp-lib d446601ebe). Dataset: pkp/datasets 38ab955
  (2026-09-30).
- Code read on `main`: `ArticleHandler::view()`,
  `OpenReviewComponent`, `SubmissionPeerReviewResource` and
  `SubmissionPeerReviewSummaryResource` (accepted versus confirmed
  reviews), `PublicReviewStatusData`, `NotifyReviewers` (the decision's
  reviewer email confirms the review), `PeerReviewController` (routes,
  `PublicAccessPolicy`), `PeerReviewCrossrefXmlFilter`,
  `load_frontend.js`, `PkpOpenReview.vue`, `PkpOpenReviewSummary.vue`,
  the store and `usePkpTab.js`, `article_details.tpl`. `git log -S` for
  `openReviewConfig`, `publicationsPeerReviews` and `open-review` over
  OJS's templates and themes: no template ever used them. The data was
  first assigned in
  [865ac924a5](https://github.com/pkp/ojs/commit/865ac924a53607f843623ed33f283e8d9dd847bd),
  replaced in
  [a35b58fe0a](https://github.com/pkp/ojs/commit/a35b58fe0af0f124bfba32f2e73ec91dc0649579),
  whose styles went with
  [08789e4f51](https://github.com/pkp/ojs/commit/08789e4f5104e9b986aa9a87b76afe7e46fee36d).
  The options: setting
  [408d83d163](https://github.com/pkp/pkp-lib/commit/408d83d163a7045e93bb568ba287e061f1461d8f),
  box [4c8551e04c](https://github.com/pkp/pkp-lib/commit/4c8551e04c2304d13409f1df787b2dc50b0700f2),
  dialog sentence [4017a024f3](https://github.com/pkp/pkp-lib/commit/4017a024f31cbfccd8e36287a836587f8a7b5fb9).
  OMP: no handler, template or theme of OMP names a review display.
- 3.5: walked to step 2, where "Edit" has no "Public Visibility"
  section; pkp-lib has no public visibility field, setting or
  `peerReviews` API, and OJS's article handler prepares no display.
  3.4 and 3.3 (code): `git grep` over pkp-lib's classes, controllers,
  API, templates and English locale for the option, and over OJS's pages
  and templates for a review display: neither exists.
- Upstream search, 2026-10-01, pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom's words and by `OpenReviewComponent`, `PkpOpenReview`,
  `openReviewConfig`. Read and not the same fault: `pkp/pkp-lib#12045`,
  `#12204`, `#11922`, `#11939` (the feature notes quoted above),
  `#13205`; `pkp/pkp-lib#13242` (open, a placeholder for a new theme)
  with `pkp/ui-library#972` (open; reworks the review display's
  components for it), neither of which mentions the default theme.
- The outcome of a summary-keyed condition is read in the code, not
  walked: `PkpOpenReview.vue` renders the tabs unless the summary has no
  date, and its "in progress" note only for an accepted, unsubmitted
  review with no round listed.
- Not driven: OMP's book page; the public API and the Crossref deposit
  (code only); a review left anonymous but made public. At the DOI
  landing address the review's card was open; whether the page scrolls
  to it was not checked.
- Unverified: whether the new theme of `pkp/pkp-lib#13242` will show the
  reviews.
