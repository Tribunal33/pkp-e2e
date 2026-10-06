# Saving a version's "Associated review round" silently takes the round from the published version

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no "Associated review round")
  - 3.4: none (code; no "Associated review round")
  - 3.3: none (code; no "Associated review round")
- **Introduced** `pkp/pkp-lib#13123` for `pkp/pkp-lib#12800` · [9080316078](https://github.com/pkp/pkp-lib/commit/90803160785ec08630bfa6db7d02331970057646) · 2026-07-29 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U40 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a21)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A review round belongs to one version of an article. A version's
"Issue" page lists a round that another version holds as greyed out, so
it cannot be picked there. The server does not hold to this: a save
naming a round another version holds is accepted, the round moves to
the saved version, and the version that held it, here the published
one, loses it with no message.

There are two ways in. An editor saves an "Issue" page that was opened
while the round was free, after another version took it (two editors,
or one editor in two tabs). An Author allowed to make changes to the
new version has no such field, but can name the round in a request of
their own.

The public peer review record lists only rounds whose version is
published. The moved round drops out of it, and its reviews are
credited to the new version once that version is published.

## Impact

- **Lost**: the published version's link to the round it was reviewed
  in, and with it that round's reviews in the public peer review
  record. The link can be moved back by hand, if someone notices.
- **Who**: OJS editors with two "Issue" pages of one article open at
  once; and Authors given "Allow this person to make changes to the
  publication…" on a new version. An Author gains a record that credits
  the earlier round's reviews to their new version once it is
  published, and takes them from the version they were written for.
- **Way round**: on the version that took the round, untick it and
  save, then tick it again on the published version.

Medium: on the editor's way in it needs two pages open at once, and on
the Author's it needs a request the screens never send; either way the
published record changes silently. It would be high if the screens let
Authors choose the round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Submission 1, "Signalling
  Theory Dividends": version 1.0 is published, version 1.1 unpublished.
  Version 1.0's "Issue" page shows "Round 1" ticked under "Associated
  review round" (the round's `review_rounds.publication_id` is 1).

The option reads "Round 1 — opened <date>", the date of the round's
first reviewer assignment, which depends on when the dataset was built.

Steps, as `dbarnes` in two tabs of one browser:

1. Tab A: open submission 1, version 1.0's "Issue" page (Publication ›
   the version › "Issue").
2. Tab A: open the "Associated review round" list, untick "Round 1",
   press "Save".
3. Tab B: open submission 1, version 1.1's "Issue" page. "Round 1" is
   offered, unticked.
4. Tab A: tick "Round 1" again and press "Save". Version 1.0 is as it
   was.
5. Tab B, without reloading: tick "Round 1" and press "Save".
6. Open version 1.0's and version 1.1's "Issue" pages afresh.

**Expected**: step 5 is refused with a message on the field, because
round 1 belongs to version 1.0 again, as the list shows when the page
is loaded now.

**Observed**: step 5 shows "Saved". The save is `PUT
/api/v1/submissions/1/publications/2`, which the browser sends as POST
with `X-Http-Method-Override: PUT`, and it answers 200. In step 6
version 1.0's field reads "Select a review round", with "Round 1"
unticked and greyed out; version 1.1's field shows "Round 1".

Moving a round that really is free still works: when tab B is opened
after step 2 and saved before step 4, round 1 moves to version 1.1, as
it should.

## Cause

`Repo::publication()->validate()` (lib/pkp
`classes/publication/Repository.php`, lines 250–268) checks a
`reviewRoundIds` value only for rounds of another submission:

```php
$nonSubmissionReviewRounds = array_diff($props['reviewRoundIds'], array_keys($submissionReviewRoundsById));
```

`PKPSubmissionController::editPublication()` (lib/pkp
`api/v1/submissions/PKPSubmissionController.php`, lines 1399–1427)
then points every listed round at the saved publication with
`updatePublicationId()`, whichever version held it. The rule that a
round held by one version is not offered to another lives only in the
browser: `useWorkflowPublicationFormReviewRound` (ui-library) greys out
an option whose `publicationId` is set and differs. Two forms use it:
the "Issue" page and the version window that "Schedule For Publication"
opens (`useWorkflowVersionForm.js`, publish mode), and both send
`reviewRoundIds` to `editPublication()`. The rule is read when the page
loads, so a page loaded earlier, or any other client of the API, is not
held to it.

Both the check and the form came with pkp/pkp-lib#12800, whose
requirements ask for a "field-level validation check to ensure
alignment" in the publication settings form. The server check covers
the submission, not the version.

Reach:

- Editors, through a page loaded before the round was taken (walked).
- Authors whose stage assignment has `canChangeMetadata`:
  `canEditPublication()` lets them save an unpublished version, so a
  `PUT` of the new version naming the published version's round is
  accepted (code; the Author's pages have no "Associated review round"
  field, and this was not walked).
- The public peer review record (`SubmissionPeerReviewResource`,
  `ReviewerRecommendationSummary::getPublicReviewRounds()`) keeps only
  rounds whose `publicationId` is a published publication, and shows
  only rounds with confirmed reviews (code). In the dataset round 1 has
  none, so the walk changed nothing public.
- The route and the check are lib/pkp, so OMP and OPS accept the same
  request, though only OJS offers the field (code).

## Proposed fix

Refuse, in `Repo::publication()->validate()`, a listed round whose
`publicationId` is set and is not this publication's, the rule the form
already applies:

```php
// A round another version holds stays with it until that version lets it go,
// as the "Associated review round" control shows it disabled
$otherVersionReviewRounds = array_filter(
    array_intersect_key($submissionReviewRoundsById, array_flip(array_map('intval', $props['reviewRoundIds']))),
    fn ($reviewRound) => $reviewRound->getPublicationId() && $reviewRound->getPublicationId() !== $publication->getId()
);

if (!empty($otherVersionReviewRounds)) {
    $validator->errors()->add('reviewRoundIds', __('publication.reviewRound.otherVersion'));
}
```

The new message goes in `lib/pkp/locale/en/submission.po` beside the
other `publication.reviewRound.*` keys: "A chosen review round is
associated with another version. Remove it from that version first."
The full change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-round-taken-from-other-version/fix.diff).
Tried on OJS: step 5 is refused with that message under the field and
round 1 stays with version 1.0, while moving a free round still saves.
It covers both forms and any other client, since they all reach
`editPublication()`.

**Alternatives**:

- Make `editPublication()` skip such rounds silently: the editor would
  see "Saved" and the round would not move, a second silent result.
- Reload the round list before each save: it narrows the window for
  editors but leaves the request open.

**What goes with it**:

- No data repair: a move made this way cannot be told apart from a
  deliberate one.
- Tests: there is no test of `validate()` in lib/pkp
  (`tests/classes/publication` has `PublicationTest.php` and
  `HasContextIdentityMetadataTest.php`). `validate()` reads the request
  user and `ReviewRoundDAO`, so the test is a `DatabaseTestCase` with a
  request context: a round held by another publication is refused, a
  free round and the publication's own round are accepted.

Small: one check beside the existing one, a locale string and a test.

## Evidence

- Kept script: `shared/playwright/checks/issues/review-round-taken-from-other-version/walk.js`,
  run on an install loaded with the default dataset: `node bin/probe.js
  ojs <script> [steps|nb]` (`nb` is the free-round case, after its own
  reset).
- Walked on OJS `main`, 2026-10-05, PostgreSQL, dataset pkp/datasets
  58f1d08: OJS 1f4cef786f, lib/pkp a7f5e3081b, lib/ui-library 64d67363.
  Round 1's `review_rounds.publication_id` read 1 at the start, empty
  after step 2, 1 after step 4 and 2 after step 5. No server error or
  page script error.
- Fix tried with `bin/try-fix.js` on OJS: step 5 answered 400
  `{"reviewRoundIds":["A chosen review round is associated with another
  version. Remove it from that version first."]}`, the form showed it
  on "Associated review round", and step 6 showed round 1 ticked on
  version 1.0. The free-round case saved (200) with the fix and without
  it.
- 3.5 walked (stable-3_5_0: OJS 4342473090, lib/pkp 771474347e,
  lib/ui-library d4e01883); its `Repo::publication()->validate()` has no
  `reviewRoundIds`. 3.4 and 3.3 were read in the code at OJS
  `upstream/stable-3_4_0` d68934d0d1 and `stable-3_3_0` ac77c9fb35,
  lib/pkp `origin/stable-3_4_0` 767353f4fe and `origin/stable-3_3_0`
  ac3fa73402.
- Introduced: `git blame` on the validation and on the re-pointing in
  `editPublication()` gives 9080316078 (PR pkp/pkp-lib#13123, merged
  2026-08-07). The greyed-out option came with ui-library f203dee2.
- Upstream: pkp/pkp-lib#13193 (open) asks for the list to show which
  version holds a round, a display change, not this check.
- Not walked: the Author's request, and OMP and OPS. MySQL not checked.
