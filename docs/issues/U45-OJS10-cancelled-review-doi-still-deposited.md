# A cancelled reviewer's review stays on the DOIs page and is still deposited with Crossref

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no review DOIs)
  - 3.4: none (code; no review DOIs)
  - 3.3: none (code; no review DOIs)
- **Introduced** `pkp/pkp-lib#12257` and `pkp/ojs#5297` for `pkp/pkp-lib#11332` · [231d428cdd](https://github.com/pkp/pkp-lib/commit/231d428cdd4c5074e7b4651e27362d86eaba8878) · 2026-01-27 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U45 [OJS10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs10)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor presses "Cancel Reviewer" on a completed review that the
editor has already marked complete or thanked the reviewer for (its row
read "Complete" or "Reviewer Thanked", and now reads "Request
Cancelled"). The journal's public review data stops listing the review,
and the manager expects its DOI to stop going to Crossref, as it does
once the review's "Publicly Show Reviewer Comments" box is unticked.
Instead the DOI keeps its status: the DOIs page still lists "Peer Review
{number}", moved to the end of the work's rows with nothing to say it
was cancelled, and the deposits and the "Mark DOIs …" actions still
take it.

A review DOI not yet sent goes to Crossref with the work's next deposit,
whether a manager presses "Deposit DOIs" or "Deposit All" or the
journal's automatic deposit runs. One already registered goes again
once the work's DOIs are marked "Needs Sync" and deposited. Nothing on
screen says so.

Neither the fix nor any way round removes a record Crossref already
holds; they stop the review being sent, or sent again.

## Impact

- **Lost**: a correct public record. Crossref receives, or receives
  again, a peer-review record (its title, date and the article's DOI,
  and for an open review the reviewer's name) for a review the journal
  no longer shows.
- **Who**: managers and editors of a journal with "Peer Review" among
  its DOI kinds, each time a reviewer is cancelled after the editor has
  marked the review complete or thanked the reviewer.
- **Way round**: untick the review's "Publicly Show Reviewer Comments"
  box. A cancelled row offers no "Edit", so this means reinstating the
  reviewer, unticking the box and cancelling again; nothing on screen
  leads there.

Medium: what goes to Crossref is wrong for a few reviews, silently, in a
state editors reach rarely. The way round is on screen but hidden, so it
does not lower the level. What would raise it: journals that cancel
completed reviews as their routine way of setting a review aside.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded (journal
  `publicknowledge`). Its DOI settings: DOIs on, "Articles" ticked, no
  prefix, no agency, "Automatic DOI Assignment" "Upon reaching the
  copyediting stage".
- Submission 13, "Hydrologic Connectivity in the Edwards Aquifer between
  San Marcos Springs and Barton Springs during 2009 Drought Conditions",
  in review round 1 with three completed reviews the editor has thanked
  (Julie Janssen, Aisla McCrae and Adela Gallego, each row "Reviewer
  Thanked"). Their review assignments are 19, 20 and 21.

Setup, signed in as `dbarnes`:

1. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   tick "Peer Review", "Save".
3. "Registration": choose "Crossref", depositor name "Public Knowledge
   Project", depositor email `dbarnes@mailinator.com`, "Save".
4. Open submission 13 (Review). On each of the three reviewer rows:
   "More Actions" › "Edit", tick "Publicly Show Reviewer Comments", "OK".
5. "Accept Submission", through its steps to "Record Decision".
6. "Send To Production", through its steps to "Record Decision".
7. "Title & Abstract" › "Schedule For Publication": "Publication Stage"
   "Version of Record", "Assign To Current/Back Issue" with "Vol. 1 No. 2
   (2014)", "Confirm", then "Publish". The status reads "Published".
8. "DOIs" in the side menu: expand submission 13. It lists "Article",
   "Peer Review 19", "Peer Review 20" and "Peer Review 21", each with a
   DOI and "Unregistered".

A review whose DOI is not yet deposited:

9. Submission 13: Julie Janssen's row › "More Actions" › "Cancel
   Reviewer"; tick "Do not send email to Reviewer."; "Cancel Reviewer".
   The notice reads "Reviewer cancelled." and the row "Request
   Cancelled".
10. Signed out, open
    `/index.php/publicknowledge/api/v1/peerReviews/open/submissions/13`,
    the journal's public review data for the article, and read the `id`
    of each entry under `reviewRounds` › `reviews`.
11. "DOIs": expand submission 13.
12. Tick submission 13, "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs".
    Expand submission 13.

A review whose DOI is registered:

13. Tick submission 13, "Bulk Actions" › "Mark DOIs Registered" › "Mark
    DOIs Registered".
14. Submission 13: Aisla McCrae's row › "Cancel Reviewer", as in step 9.
15. "DOIs": expand submission 13.
16. Tick submission 13, "Bulk Actions" › "Mark DOIs Needs Sync" › "Mark
    DOIs Needs Sync". Expand submission 13.
17. "Deposit All" › "Deposit all DOIs". Expand submission 13.

**Expected.** A cancelled review is treated as one whose "Publicly Show
Reviewer Comments" box is unticked, as the public review data already
treats it (step 10). Step 9: "Peer Review 19" leaves the DOIs page and
its "Unregistered" DOI is deleted, and step 12 deposits the article and
reviews 20 and 21 only. Step 14: review 20 keeps its "Registered" DOI,
its row leaves the page, and steps 16 and 17 leave it "Registered".

**Observed.** Step 10 lists reviews 20 and 21 only. Step 11:

```
Article: 10.1234/tcdra257 Unregistered
Peer Review 20: 10.1234/219ept97 Unregistered
Peer Review 21: 10.1234/2sfs9p49 Unregistered
Peer Review 19: 10.1234/mt8kn326 Unregistered
```

Step 12 shows "Items successfully submitted for deposit", and all four
rows read "Submitted", "Peer Review 19" included: the deposit took its
DOI with the work's. It queued one `PKP\jobs\doi\DepositSubmission` job
for submission 13. Once the article's record is accepted, that job
queues a `PKP\jobs\doi\DepositPeerReview` for each review in its list,
which held 19, 20 and 21.

Step 13 turns all four "Registered". After step 14, step 10's address
lists review 21 alone, while step 15 still lists "Peer Review 19" and
"Peer Review 20" ("Registered") as the last two rows. Step 16 turns all
four "Needs Sync". Step 17 shows "Items successfully submitted for
deposit", queues one `DepositSubmission` for submission 13 with the same
list, and all four rows read "Submitted".

## Cause

`ClearReviewForm::execute()`
(`lib/pkp/controllers/grid/users/reviewer/form/ClearReviewForm.php`,
lines 55–61) cancels a review the reviewer accepted by setting
`cancelled` and `dateCancelled` through `Repo::reviewAssignment()->edit()`.
Every DOI path decides whether a review can carry a DOI by whether the
editor has confirmed it (`date_considered` or `date_acknowledged`) and
whether it is publicly visible, and the export and deposit lists also
by whether it is completed and its version published. None of them
asks whether the review was cancelled.

The journal's public review data does ask.
`SubmissionPeerReviewResource::toArray()` and
`SubmissionPeerReviewSummaryResource::toArray()`
(`lib/pkp/api/v1/peerReviews/resources/`) add
`Collector::filterByIsAccepted(true)`: the reviewer accepted
(`date_confirmed` set) and the assignment is neither declined nor
cancelled (`Collector.php`, lines 670–673). The rule broken: a review's
DOI goes only where its review is public.

The five methods that leave the acceptance test out (lib/pkp unless
named):

- `reviewAssignment\Repository::canHaveDoi()` (lines 249–253). `edit()`
  compares it before and after a change and deletes an "Unregistered"
  DOI when it turns false (`removeUnregisteredDoi()`), so an untick
  deletes the DOI and a cancel does not (steps 9, 11).
- `publication\Repository::getReviewDoiItemsGroupedByPublication()`
  (lines 1331–1336): the DOIs page's review rows (steps 11, 15).
- `publication\Repository::getCompletedReviewAssignments()` (lines
  1267–1275). Its callers: OJS `doi\Repository::getDoisForSubmission()`
  and `getDoisForPublication()` (`classes/doi/Repository.php`, lines 224
  and 281), the DOIs a work's deposit and the "Mark DOIs …" actions
  change (steps 12, 13, 16); and OJS
  `publication\Repository::createDois()` (`classes/publication/Repository.php`,
  line 374), the reviews "Assign DOIs" and the automatic assignment give
  a DOI.
- `reviewAssignment\DAO::getExportableDOIsPeerReviewIds()` (lines
  196–224): the reviews "Export DOIs" puts in its second file and for
  which `DepositSubmission` queues a `DepositPeerReview`
  (`lib/pkp/jobs/doi/DepositSubmission.php`, lines 68–79). It returned
  19, 20 and 21 after both cancels.
- OJS `doi\DAO::getAllDepositableSubmissionIds()`
  (`classes/doi/DAO.php`, lines 73–85): what "Deposit All" and the
  automatic deposit (`DepositDois` › `DepositContext` ›
  `Repo::doi()->depositAll()`, when "Automatic Deposit" is ticked) take
  and mark "Submitted" (step 17). The author-response block of the same
  query already leaves out declined and cancelled assignments.

What leaves the journal, read in the code: the Crossref plugin's
`PeerReviewCrossrefXmlFilter` writes the review's title ("Review:
{article title} (Round1/Review1)"), its date, the article's DOI, the
review's address on the article page, and for an open review the
reviewer's name, affiliation and ORCID iD.

## Proposed fix

Apply the public review data's acceptance test in all five methods:
`filterByIsAccepted(true)` in the two collectors, and its three
conditions (`date_confirmed` set, not declined, not cancelled) in
`canHaveDoi()` and the two raw queries
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancelled-review-doi-still-deposited/fix.diff),
pkp-lib and OJS):

```diff
 // lib/pkp/classes/submission/reviewAssignment/Repository.php, canHaveDoi()
-        return ($reviewAssignment->getDateConsidered() || $reviewAssignment->getDateAcknowledged())
+        return $reviewAssignment->getDateConfirmed()
+            && !$reviewAssignment->getDeclined()
+            && !$reviewAssignment->getCancelled()
+            && ($reviewAssignment->getDateConsidered() || $reviewAssignment->getDateAcknowledged())
             && $reviewAssignment->getIsReviewPubliclyVisible();

 // lib/pkp/classes/publication/Repository.php, getCompletedReviewAssignments()
 // and getReviewDoiItemsGroupedByPublication()
             ->filterByIsPubliclyVisible(true)
+            ->filterByIsAccepted(true)
             ->getMany();

 // lib/pkp/classes/submission/reviewAssignment/DAO.php, getExportableDOIsPeerReviewIds()
             ->where('is_review_publicly_visible', true)
+            ->whereNotNull('review_assignments.date_confirmed')
+            ->where('review_assignments.declined', '<>', 1)
+            ->where('review_assignments.cancelled', '<>', 1)

 // classes/doi/DAO.php (OJS), getAllDepositableSubmissionIds(), peer-review block
-                                ->where(fn (Builder $q) => $q->whereNotNull('ra.date_considered')->orWhereNotNull('ra.date_acknowledged'));
+                                ->where(fn (Builder $q) => $q->whereNotNull('ra.date_considered')->orWhereNotNull('ra.date_acknowledged'))
+                                ->whereNotNull('ra.date_confirmed')
+                                ->where('ra.declined', '<>', 1)
+                                ->where('ra.cancelled', '<>', 1);
```

One rule everywhere: a review can carry a DOI exactly when the public
review data shows it. For every review the screens produce, the extra
two conditions change nothing. A completed review always has
`date_confirmed`: the reviewer's "Accept" sets it
(`ReviewerAction::confirmReview()`), and so does an editor completing a
review for the reviewer (`PKPReviewerGridHandler`, line 825). A declined
review is never completed. No import path creates review assignments
(the native import carries none), so a review without `date_confirmed`
exists only if written outside the app; it gets no DOI, as it gets no
place in the public review data.

With `canHaveDoi()` false after a cancel, the `edit()` that
`ClearReviewForm` already calls deletes an "Unregistered" DOI and keeps
any other status, as for an untick (`pkp/pkp-lib#13460`). "Reinstate
Reviewer" turns it true again: the review comes back to the page and
gets a new DOI by "Assign DOIs", or at once under "Immediately…", as a
review ticked public again does.

Tried on the Steps, the revised diff on 2026-10-15 as the first:
step 11 listed the article, 20 and 21, and review 19 had no DOI left;
step 12 marked and queued those three only; after step 14 review 20
kept "Registered" off the page, and steps 16 and 17 changed only the
article and 21. Neighbour check: with the fix in and out, review 21,
never cancelled, kept its row and went with "Deposit DOIs"; "Reinstate
Reviewer" after step 9 brought "Peer Review 19" back, with the fix
reading "Needs DOI" until "Assign DOIs" gave it a new DOI.

**Alternatives**

- Folding the cancel into `filterByIsConfirmedByEditor()`: one place for
  the collectors, but that filter also serves the OpenSearch index and
  the Crossref review numbering, which would change with it unasked,
  and the two raw queries and `canHaveDoi()` still need their own test.
- Deleting or withdrawing the DOI in `ClearReviewForm`: a second copy of
  `removeUnregisteredDoi()`'s rule in a legacy form, missed by any other
  way of cancelling.

**What goes with it**

- Left out on purpose: `PeerReviewCrossrefXmlFilter::loadAllReviewsPerRound()`
  (pkp/crossref-ojs) numbers a review within its round without the
  acceptance test, so a cancelled review still takes a number; changing
  it renumbers records already deposited, a choice for the team.
  `OpenSearchEngine` indexes the names of open reviewers without it too;
  it is not a DOI path, and the same `filterByIsAccepted(true)` would
  cover it.
- Crossref: a review record already deposited stays at Crossref, with
  the fix as without it ("Deposited DOIs cannot be withdrawn", says
  `removeUnregisteredDoi()`). The fix stops a cancelled review's first
  deposit and every later one.
- No data repair: peer-review DOIs are in no release.
- The guard: a test of `reviewAssignment\Repository::edit()` that
  cancels a confirmed, public review and expects its "Unregistered" DOI
  gone and the review out of `getExportableDOIsPeerReviewIds()`.

Medium: five methods in two repositories, pkp-lib and OJS, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancelled-review-doi-still-deposited/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancelled-review-doi-still-deposited/lib.js),
  run with `node bin/probe.js ojs <walk.js>` (`WALK=nb` for the
  neighbour check) on a fresh load of PKP's default test dataset for OJS
  `main` (pkp/datasets `7912e09`, 2026-10-14, PostgreSQL). Beside each
  DOIs-page read it reads the stored review DOIs and the lists the
  deposit code builds (`getExportableDOIsPeerReviewIds()`,
  `getAllDepositableSubmissionIds()`) with the read-only
  [xml-read.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/U45/H15/xml-read.php),
  and the queued jobs from the `jobs` table.
- Not seen: what Crossref receives. The test install cannot reach
  Crossref, so the `DepositSubmission` of steps 12 and 17 failed at
  connecting and queued no `DepositPeerReview`; the DOIs stayed
  "Submitted". An install without Crossref credentials stops at the same
  point (the article's deposit fails, so no review is queued; read in
  the code). The
  automatic deposit was not walked; its path is read in the code.
- "Export DOIs" was not walked: on the test install it stops at the
  schema fetch of the articles' file, before the reviews' file is built.
  The reviews' file takes `getExportableDOIsPeerReviewIds()`'s list
  (`PKPDoiController::getPeerReviewExports()`), read in the walk.
- The way round (reinstate, untick, cancel again) was not walked as a
  whole. The cancelled row's "More Actions" offered "Reinstate
  Reviewer", "Email Reviewer", "History", "Login As" and "Editorial
  Notes".
- Introduced: the first version of the DOIs page's rows and of
  `getCompletedReviewAssignments()` (231d428cdd, `pkp/pkp-lib#12257`,
  merged 2026-02-12) took `filterByCompleted(true)`, which does not test
  the cancel either. The OJS deposit list came with 30e82d3876
  (`pkp/ojs#5297`), the export list with 8899a88fd8 (`pkp/pkp-lib#12605`,
  Taslan A. Graham, 2026-07-01), `canHaveDoi()` with 8f74b72119
  (`pkp/pkp-lib#13460`, Bozana Bokan, 2026-10-06); none tests it.
- Code reads: ojs `main` `378eced941` with lib/pkp `b17fadae59` and
  ui-library `47b565cb` (the methods above and their callers,
  `ClearReviewForm`, `ReinstateReviewerForm`, `ReviewerAction`,
  `PKPReviewerGridHandler`, the review assignment `Collector`, the open
  peer-review resources, `PeerReviewCrossrefXmlFilter`, `DepositSubmission`,
  `DepositPeerReview`, `DepositContext`; a search for
  `filterByIsConfirmedByEditor`, `filterByIsPubliclyVisible`,
  `is_review_publicly_visible` and `Repo::reviewAssignment()->add(`);
  omp `f4836d4fb` and ops `2ece50497f`, whose "Setup" forms have no
  review kind. 3.5: ojs `ca763c91cd` with lib/pkp `4045d9241e`, walked
  to step 2, where "Setup" offers "Articles", "Issues" and "Article
  galleys, such as a published PDF" only. 3.4: `upstream/stable-3_4_0`
  `daf0ca971d`, lib/pkp `55c8e406b3`. 3.3: `d7d9dd14ec`, lib/pkp
  `5e84acd11b`.
