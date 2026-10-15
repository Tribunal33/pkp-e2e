# Anyone, without signing in, can read an author's response that also answers reviews the editor kept private

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no author responses, no public reviews)
  - 3.4: none (code; no author responses, no public reviews)
  - 3.3: none (code; no author responses, no public reviews)
- **Introduced** `pkp/pkp-lib#12297` for `pkp/pkp-lib#12294` · [bd0db45a05](https://github.com/pkp/pkp-lib/commit/bd0db45a05daf9104baa85830a36bac0b3604a70) · 2026-02-03 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U30 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a10)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The editor decides, review by review, which reviews are published with
the article ("Publicly Show Reviewer Comments"). Once the article is
published, the journal's open peer review API, which anyone may call
without signing in, lists each public review the editor has marked
complete ("Mark as Complete"). It also gives the author's response to
that review round in full, even when other reviews of the round are not
public. The author wrote that response to every reviewer, so whatever
it repeats or answers of the private reviews goes out with it.

The author is not told that the response may be published: the window
they write it in says it "will be shared with the editorial team and
may be sent back to reviewers if needed". No page of the journal
requests this data today. An editor who knows can prevent it only by
making every review of a round public, or none.

## Impact

- **Lost**: the confidentiality of private reviews, as far as the
  author's response quotes or answers them. Nobody is told.
- **Who**: authors who respond to a round whose reviews are partly
  public, and the reviewers of that round whose reviews the editor kept
  private.
- **Way round**: the editor makes every review of the round public, or
  none, before the article is published.

Medium: private review content can reach anyone who asks, silently,
but only for rounds that mix public and private reviews, and only
through the API, as no page shows it today. It would be high once an
article page displays its public reviews. That display is built and
registered on the article page, and the "Mark as Complete" dialog
already says "This review will be made publicly visible alongside the
article.", but no template shows it yet. It prints any response the
data carries, so every reader of the article would see it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
  Submission 1, "Signalling Theory Dividends", is published, and its
  Review round 1 belongs to the published version. Julie Janssen
  (`jjanssen`), Aisla McCrae (`amccrae`) and Adela Gallego (`agallego`)
  have unanswered review requests in it, none public; its author is
  Alan Mwandenga (`amwandenga`). The journal has a privacy statement, so
  a reviewer's first step asks for consent.

Making one review public, as the editor:

1. Sign in as `dbarnes`, open submission 1 and choose "Review" ›
   "Round 1" in the workflow menu.
2. On Aisla McCrae's row in "Reviewers", "Edit": tick "Publicly Show
   Reviewer Comments", "OK".

The three reviews:

3. Sign in as `amccrae` and open the review request of "Signalling
   Theory Dividends". Tick "Yes, I agree to have my data collected and
   stored according to the privacy statement.", press "Accept Review,
   Continue to Step #2", then "Continue to Step #3". In "For author and
   editor" type "hkk25 public review by Aisla McCrae"; Recommendation
   "Accept Submission"; "Submit Review" › "OK".
4. The same as `jjanssen`, typing "hkk25 private review by Julie
   Janssen".
5. The same as `agallego`, typing "hkk25 private review by Adela
   Gallego".

The request, as the editor:

6. Sign in as `dbarnes`, submission 1, "Review" › "Round 1". On Aisla
   McCrae's row, "Read Review" › "Mark as Complete" › "Mark as
   Complete".
7. The "Author Response" table reads "Ready To Invite Author". Press
   "Request Response"; on "Request Author Response", "Submit Request",
   then "View Submission Summary".

The response, as the author:

8. Sign in as `amwandenga`, open submission 1 and choose "Review" ›
   "Round 1". On the "Author Response" card ("Respond to Reviews"),
   "Submit Response"; in the window type "hkk25 our response to the
   three reviews", tick "Alan Mwandenga", "Submit Response".
9. Sign in as `dbarnes`, submission 1, "Review" › "Round 1": the
   "Author Response" table reads "A response was submitted by Alan
   Mwandenga".

The open peer review API, which no screen calls:

10. Sign out and open
    `/index.php/publicknowledge/api/v1/peerReviews/open/submissions/1`.

**Expected**: round 1 is listed with Aisla McCrae's review alone and
`"authorResponse": null`, since the response also answers two reviews
that are not public.

**Observed**: 200, round 1 with Aisla McCrae's review and the author's
response in full, its own flag reading not public:

```json
"authorResponse": {
  "response": {"en": "<p>hkk25 our response to the three reviews</p>", "fr_CA": ""},
  "associatedAuthors": [{"id": 1, "fullName": "Alan Mwandenga", "givenName": "Alan",
    "familyName": "Mwandenga", "preferredPublicName": null, "orcid": null, "hasVerifiedOrcid": false}],
  "submittedByUser": {"id": 17, "fullName": "Alan Mwandenga"},
  "isPublic": false,
  "createdAt": "2026-10-15 11:22:18"
}
```

Control: the same data leaves out Julie Janssen's and Adela Gallego's
reviews, which are not public.

## Cause

`PKP\API\v1\peerReviews\resources\SubmissionPeerReviewResource::toArray()`
builds the public record of a submission's reviews, round by round. It
lists the reviews that are public, accepted by the reviewer and marked
"Complete" by the editor (`dateConsidered` or `dateAcknowledged` set),
and then adds the round's author response whenever one exists
([SubmissionPeerReviewResource.php#L141](https://github.com/pkp/pkp-lib/blob/b17fadae59/api/v1/peerReviews/resources/SubmissionPeerReviewResource.php#L141)):

```php
'authorResponse' => $currentRoundResponse ? (new ReviewRoundAuthorResponseResource($currentRoundResponse))->resolve() : null,
```

A response answers every review of its round, so it belongs in the
record only when every one of those reviews is in it. pkp's own
criterion says so for JATS (`pkp/pkp-lib#12198`: "When all peer reviews
for a publication are publicly visible, open, and accepted by the
editor, and an author response has been added, the author response
will appear"). The code's version of that rule,
`AuthorResponse::isPublic()`, is weaker: it asks only that every review
not declined or cancelled has the public box ticked, not that the
editor has marked it complete. The record does not apply even that. The
JATS template plugin does (`PeerReview::createAuthorComment()` returns
nothing unless `isPublic`), so a response there waits for the boxes but
not for "Mark as Complete".

The response entered the record with
[bd0db45a05](https://github.com/pkp/pkp-lib/commit/bd0db45a05daf9104baa85830a36bac0b3604a70)
("Include author responses in peer review outputs"), before any
response had a public flag. The flag came with
[8f3a560193](https://github.com/pkp/pkp-lib/commit/8f3a560193c91029a22bf7a44d03aaafecdaf0c5)
(issue `pkp/pkp-lib#12319`, PR `pkp/pkp-lib#12320`), which added it to
the response's output but not as a condition in the record.

Reach:

- `GET …/peerReviews/open/submissions/{id}` and `GET
  …/peerReviews/open/submissions?submissionIds=…` (many submissions in
  one request), both without a session.
- The article page's `OpenReviewComponent` builds this resource, and
  ui-library's `PkpOpenReviewByRound.vue` prints `round.authorResponse`
  whenever it is set, with no look at `isPublic`. No template prints the
  component today (pkp-e2e's
  [report on the article page's missing reviews](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OJS12-public-review-never-shown.md)).
  Checked in the code.
- The journal's JATS and the OAI-PMH `jats` records built from it apply
  the weaker `isPublic`, as above. Checked in the code.
- OMP's `publicationPeerReviews` entry point names a controller that is
  not in pkp-lib, and OPS has no review stage, so neither serves this
  data. Checked in the code.

## Proposed fix

Make `AuthorResponse::isPublic()` the full rule (every review of the
round that was not declined or cancelled is public, accepted and marked
complete by the editor, the same filter the record applies to reviews),
and add the response to the record only when it holds
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-data-unpublic-author-response/fix.diff),
paths from the OJS root, `lib/pkp/…`; drop that prefix for a pkp-lib
branch):

```diff
--- a/lib/pkp/api/v1/peerReviews/resources/SubmissionPeerReviewResource.php
-                'authorResponse' => $currentRoundResponse ? (new ReviewRoundAuthorResponseResource($currentRoundResponse))->resolve() : null,
+                // A response answers every review of its round, so it joins the public record only when all of
+                // them are part of it (AuthorResponse::isPublic)
+                'authorResponse' => $currentRoundResponse?->isPublic ? (new ReviewRoundAuthorResponseResource($currentRoundResponse))->resolve() : null,
--- a/lib/pkp/classes/submission/reviewRound/authorResponse/AuthorResponse.php
-                $visibility = DB::table('review_assignments')
+                $assignments = DB::table('review_assignments')
                     ->where('review_round_id', $this->review_round_id)
                     ->where('declined', 0)
                     ->where('cancelled', 0)
-                    ->pluck('is_review_publicly_visible');
+                    ->get(['is_review_publicly_visible', 'date_confirmed', 'date_considered', 'date_acknowledged']);
 
-                return $visibility->isNotEmpty() && $visibility->every(fn ($visibility) => (bool) $visibility);
+                return $assignments->isNotEmpty() && $assignments->every(
+                    fn ($assignment) => (bool) $assignment->is_review_publicly_visible
+                        && $assignment->date_confirmed !== null
+                        && ($assignment->date_considered !== null || $assignment->date_acknowledged !== null)
+                );
```

The rule belongs in the model because both its readers need it: the
record, and the JATS plugin, which then also waits for "Mark as
Complete" as `pkp/pkp-lib#12198` asks. "Open" from that criterion is
left out: the API lists public reviews that keep the reviewer
anonymous, so for the record the review method does not matter.

Tried on OJS `main`. With the fix, step 10 gives `"authorResponse":
null`. With all three reviews made public in step 2, the response stays
out while only Aisla McCrae's is marked complete, where it shows
without the fix. Once the editor marks the other two complete, the
response is listed with `"isPublic": true`, with the fix in and out.

- **Alternatives**:
  - Gating the record on today's `isPublic` alone (tried first) still
    lists the response beside public reviews the editor has not marked
    complete, which are not in the record yet.
  - Computing the full rule in the resource alone covers the API, the
    article page and JATS (which read the record), but leaves `isPublic`
    with the weaker meaning where the workflow's own API returns it.
  - A check in `PkpOpenReviewByRound.vue` covers the article page but
    leaves the data public.
  - Filtering in `ReviewRoundAuthorResponseResource` would also hide the
    response from the editors and the author, whose workflow reads it
    through the same resource (`PKPReviewController`, the submission's
    `Schema` map, `PKPBackendDoiController` L211).
- **What goes with it**: nothing is stored, so no repair. The
  workflow's API returns `isPublic` false until every review is marked
  complete; no screen reads it. A JATS sub-article for the response now
  waits for every "Mark as Complete". Whether JATS, which writes only
  open reviews, should also hold back a response when some of the
  round's public reviews keep the reviewer anonymous is the JATS
  plugin's own question, left out here. The open `pkp/pkp-lib#13210`
  (for `pkp/pkp-lib#13205`) reworks the resource's queries without
  touching this line. pkp-e2e's
  [report on editor-only review form answers](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U29-OJS1-public-review-data-editor-only-answers.md)
  fixes another line of the same resource; the two diffs apply side by
  side. No test covers either class yet: the guard is a unit test of
  `isPublic` over a round's assignments (one not public, one not marked
  complete, all done), and one that resolves the resource for such a
  round and expects `authorResponse` null until the last case.

Medium: a few lines, but in two classes, and the JATS output and the
workflow API's flag change with it.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-data-unpublic-author-response/walk.js)
  with
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-data-unpublic-author-response/lib.js)
  takes Steps 1–10 on OJS. `MODE=nb` takes the neighbour check: all
  three reviews made public, the API read with only Aisla McCrae's
  marked complete, then again after the editor marks the other two
  complete. Every step goes through the screens except step 10; the
  script reads the round's id (the workflow menu's key) from
  `review_rounds`. Run on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> [MODE=nb] node bin/probe.js ojs shared/playwright/checks/issues/public-review-data-unpublic-author-response/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked 2026-10-15 on PostgreSQL, PKP's default test dataset at
  pkp/datasets `7912e09` (2026-10-14): OJS `main` (ojs `378eced941`,
  lib/pkp `b17fadae59`, ui-library `47b565cb`) and OJS `stable-3_5_0`
  (ojs `ca763c91cd`, lib/pkp `4045d9241e`). The fault does not depend on
  the database (the rule is applied in PHP); MySQL not checked.
- 3.5: the "Edit" window of step 2 has no "Publicly Show Reviewer
  Comments" box, round 1 shows no "Author Response" table, and step 10
  answered 404. Code read: no `api/v1/peerReviews`, no `AuthorResponse`,
  no `is_review_publicly_visible` in 3.5's ojs or lib/pkp.
- 3.4 and 3.3 (code): `git grep` for `peerReviews`, `AuthorResponse` and
  `is_review_publicly_visible` on `upstream/stable-3_4_0` (ojs
  `daf0ca971d`) and `upstream/stable-3_3_0` (ojs `d7d9dd14ec`), and on
  `origin/stable-3_4_0` (`55c8e406b3`) and `origin/stable-3_3_0`
  (`5e84acd11b`) of lib/pkp: no match.
- Introduced: `git blame` on L141 names ec7fbac9bb (`pkp/pkp-lib#12372`,
  2026-02-19), which wrapped the line in `->resolve()`, under the file's
  old name `PublicationPeerReviewResource.php`; the file was renamed to
  `SubmissionPeerReviewResource.php` by 756ec10460
  (`pkp/pkp-lib#11922`, 2026-07-21). `git log -G authorResponse` on the
  resource leads to bd0db45a05 (Erik Hanson, PR `pkp/pkp-lib#12297`,
  merged 2026-02-03), which added the response as `authorResponses`
  with no condition; e35b6a9e0d (2026-02-10) renamed the key
  `authorResponse`.
- What the author is told: the response window's text read in the walk;
  the request email is `emails.reviewRound.requestAuthorResponse.body`
  in `lib/pkp/locale/en/emails.po`, which does not mention publication.
  The article page display: `ArticleHandler` L242 assigns
  `openReviewConfig`, `lib/pkp/js/load_frontend.js` registers
  `PkpOpenReview`, no template in ojs or its themes reads either.
- Fix trial: `fix.diff` applied to OJS `main`, the install reloaded from the
  dataset before each walk: Steps 1–10 with the fix in, then the
  neighbour check (`MODE=nb`) with the fix in and again with it out.
  The editor's table read "A response was submitted by Alan Mwandenga"
  in every run, and no run recorded a response of 400 or more. OMP and
  OPS carry the same lib/pkp files but serve no such data, so it was
  tried on OJS alone.
- Unverified: the list form (`?submissionIds=`) and the article page's
  component were read in the code, not walked.
