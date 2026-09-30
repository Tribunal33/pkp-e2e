# Editors saving an article's or book's own URN again are told it is "already in use"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10826` with `pkp/ojs#4613` and `pkp/omp#1813`, for `pkp/pkp-lib#10821` (the OMP commit's message cites `pkp/pkp-lib#9497`, "Update pubIds plugin for vue3") · [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5), [3576a57f07](https://github.com/pkp/ojs/commit/3576a57f0777a0a82a5698eddd7de41c815a9cd0) and [0de89cb31c](https://github.com/pkp/omp/commit/0de89cb31cbd711110fe063a4ac500a11420e838) · 2025-01-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U44 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a4)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

An editor opens the "Identifiers" page of an article (on a press, a
book) whose URN is already saved and presses "Save" without changing
it. For example, they save a new version's page as it arrives, or they
clear the URN and assign it again. The save is refused with "The given
URN suffix is already in use for another published item. Please enter
a unique URN suffix for each item.", but no other item carries that
URN.

This happens whenever the version's internal number differs from its
submission's number. That is always the case for a second or later
version. On a journal or press, it is also the case for every
submission created after any submission first got a second version.
The same check also lets a real duplicate through. If another
submission's number equals this version's number and that submission
already carries the URN, the save is accepted.

The URN is the only field on the page in a standard install, so the
refusal blocks only that save. It needs the "URN" plugin switched on
with URNs for articles (on a press, for monographs). Preprint servers
have no URN plugin.

## Impact

- **Lost.** Nothing already saved: the version keeps its URN. Where the
  duplicate gets through, two articles carry one URN, and once both are
  published, both article pages link it to the resolver.
- **Who.** Editors and managers on the "Identifiers" page, under the
  condition in the Summary. In PKP's test journal, that is every
  submission after the first, and every new version on both apps.
- **Way round.** Leave the page without saving, or change the URN to a
  new value, which saves. A new version's URN that was cleared and saved
  cannot be put back, because the earlier version's copy counts against
  it (read in the code).

Medium: the refusal points editors to a duplicate that does not exist,
and the same check lets a real duplicate through for the submission
whose number matches. A standard install has no other field on the page
for the refusal to block. A pub-ID plugin that adds fields to the page
would make the refusal block those fields too, and would raise this.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS and OMP).
- The "URN" plugin switched on and set up, as `rvaca`: Settings ›
  Website › "Plugins", under "Public Identifier Plugins" tick "URN".
  Then open the row's arrow › "Settings":
  - under "Journal Content" tick "Articles" (press: "Press Content" ›
    "Monographs");
  - "URN Prefix": `urn:nbn:de:0000-`;
  - "URN Suffix": "Enter an individual URN suffix for each published
    item. You'll find an additional URN input field on each item's
    metadata page.";
  - "Namespace": `urn:nbn:de`; "Resolver URL": `https://nbn-resolving.de/`;
  - "Save".

Saving a URN again, on a version not yet published:

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production) [press: submission 4, "How Canadians Communicate:
   Contexts of Canadian Popular Culture", in Production].
3. In the side menu under "Publication", choose "Identifiers".
4. In "URN" type `urn:nbn:de:0000-u44r2a` and press "Save".
5. Without changing anything, press "Save" again.

A new version:

6. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran" (published) [press: submission 14, "From
   Bricks to Brains: The Embodied Cognitive Science of LEGO Robots",
   published].
7. In the side menu, press "Create New Version". Keep the window's
   choices ("Version of Record (VoR)", "Minor Revision") and press
   "Confirm". [3.5: the "Create New Version" button beside "Unpublish",
   then "Yes" in "Are you sure you want to create a new version?"]
8. Under the new version ("Version of Record 1.1") in the side menu,
   choose "Identifiers". [3.5: the side menu has one "Identifiers"
   entry, which shows the newest version, the one just created.]
9. In "URN" type `urn:nbn:de:0000-u44r2b` and press "Save".
10. Without changing anything, press "Save" again.

**Expected.** Every "Save" shows "Saved": the URN belongs to this
article and to no other.

**Observed.** Steps 4 and 9 show "Saved". Steps 5 and 10 are refused on
the journal, and step 10 on the press. The "URN" field reads (the
second line is the field's description):

```
URN
The URN must begin with urn:nbn:de:0000-.
The given URN suffix is already in use for another published item. Please enter a unique URN suffix for each item.
```

The page's error summary reads "Please correct one error. Go to URN:
The given URN suffix is already in use for another published item.
Please enter a unique URN suffix for each item.". The notice "The form
was not saved because 1 error(s) were encountered. Please correct these
errors and try again." appears. The page's save request answers:

```
PUT /index.php/publicknowledge/api/v1/submissions/5/publications/6   (sent as POST with X-Http-Method-Override)
400 {"pub-id::other::urn":["The given URN suffix is already in use for another published item. Please enter a unique URN suffix for each item."]}
```

On the press, step 5 saves: submission 4's first version (publication
4) has the same number as the submission.

Another article's URN (journal; from a fresh dataset, with the plugin
set up as above):

11. As `dbarnes`, open submission 10, "Condensing Water Availability
    Models to Focus on Specific Water Management Systems" (publication
    11), and choose "Identifiers". Type `urn:nbn:de:0000-u44r2n` and
    press "Save".
12. Open submission 9, "Hansen & Pinto: Reason Reclaimed" (publication
    10), and choose "Identifiers". Type `urn:nbn:de:0000-u44r2n` and
    press "Save".

**Expected.** Step 12 is refused with "The given URN suffix is already
in use for another published item…".

**Observed.** Step 12 shows "Saved", and both submissions now carry
`urn:nbn:de:0000-u44r2n`. On the press, the same two steps with
submission 7 and then submission 4 are refused: submission 4's
publication has the submission's own number, so no other book is left
out of the check.

## Cause

`URNPubIdPlugin::validatePublicationUrn()` checks a publication's URN
when the publication is saved. It calls
`$this->checkDuplicate($props['pub-id::other::urn'], $publication, $contextId)`
(`plugins/pubIds/urn/URNPubIdPlugin.php`, line 317 in OJS, line 290 in
OMP). `PKPPubIdPlugin::checkDuplicate()`
(`lib/pkp/classes/plugins/PKPPubIdPlugin.php`, line 491) passes the
object's own ID to its DAO:
`$typeDao->pubIdExists($this->getPubIdType(), $pubId, $pubObject->getId(), $contextId)`.
For a publication, that is the publication ID.

`PKP\publication\DAO::pubIdExists()`
(`lib/pkp/classes/publication/DAO.php`, line 330) leaves out a
submission, not a publication:
`->where('s.submission_id', '<>', $excludePubObjectId)`. That is by
design. All versions of one submission may share a pub ID. Up to and
including 3.4, the query carried the comment "The excludePubObjectId
refers to the submission id because multiple versions of the same
submission are allowed to share a DOI". So the query now compares a
publication ID with submission IDs, with two results:

- The version's own row is left out only when its publication ID equals
  its submission ID. Otherwise its own stored URN counts as another
  item's, and the save is refused.
- The submission whose submission ID equals this publication ID is left
  out instead, so a URN it carries is not seen.

Publication IDs and submission IDs advance together until some
submission gets a second publication. From then on, publication IDs run
ahead for every later submission. So the two differ for every second
version, and for every submission created after the first second
version.

Up to 3.4, the plugin called
`checkDuplicate($urn, 'Publication', $submission->getId(), $contextId)`.
`pkp/pkp-lib#10826` changed `checkDuplicate()` to take the object
itself and pass `$pubObject->getId()`. `pkp/ojs#4613` and
`pkp/omp#1813` changed the plugin to pass `$publication`. The
publication DAO kept comparing submission IDs; its comment had already
gone in a 2024 query-builder rewrite.

`pkp/pkp-lib#10826` also narrowed the check to the object's own type.
Before, the loop checked a publication's URN against galleys and
submission files too, with no exclusion. Now a URN a galley carries no
longer blocks the same URN on a publication. That is a separate
behaviour change. This report does not propose to change it, and the
team may want to confirm it was intended.

Reach:

- The "Identifiers" page of OJS and OMP is the only screen that calls
  the publication DAO with a publication to leave out (read in the
  code). The tab forms' `verifyData()` path serves galleys, issues,
  chapters, formats and files, whose DAOs compare their own IDs.
  `JournalDAO::anyPubIdExists()` and `PressDAO::anyPubIdExists()` pass
  the caller's ID for a publication, but no current caller passes a
  publication, so they pass 0.
- Every "URN Suffix" choice is affected: the check runs whenever the
  saved URN is not empty (read in the code; walked with the individual
  suffix).
- "Create New Version" copies the URN of the version it came from.
  Saving that copy unchanged is refused the same way (walked
  2026-09-24).
- The duplicate that gets through is shown in steps 11 and 12.
- A third-party pub-ID plugin that calls `checkDuplicate()` with a
  publication meets the same fault (read in the code).
- A separate fault, outside this fix: "Create New Version" also copies
  galleys (on a press, publication formats and chapters) with their
  identifiers. Their DAOs leave out only the object's own ID, so the old
  copy counts against the new one. The galley side is spec U44 A5,
  reported on its own.

## Proposed fix

Make the publication DAO leave out every version of the given
publication's submission. It then keeps its own rule (versions share a
pub ID, other submissions may not), whatever ID a caller passes. The
diff, as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-resave-refused-already-in-use/fix.diff)
holds it:

```diff
--- a/lib/pkp/classes/publication/DAO.php
+++ b/lib/pkp/classes/publication/DAO.php
@@ -319,6 +319,9 @@
 
     /**
      * @copydoc PKPPubIdPluginDAO::pubIdExists()
+     *
+     * The versions of one submission may share a pub id, so every version of
+     * the excluded publication's submission is left out of the check.
      */
     public function pubIdExists(string $pubIdType, string $pubId, int $excludePubObjectId, int $contextId): bool
     {
@@ -327,7 +330,12 @@
             ->join('submissions AS s', 'p.submission_id', '=', 's.submission_id')
             ->where('ps.setting_name', '=', "pub-id::{$pubIdType}")
             ->where('ps.setting_value', '=', $pubId)
-            ->where('s.submission_id', '<>', $excludePubObjectId)
+            ->whereNotIn(
+                'p.submission_id',
+                DB::table('publications')
+                    ->where('publication_id', '=', $excludePubObjectId)
+                    ->select('submission_id')
+            )
             ->where('s.context_id', '=', $contextId)
             ->count() > 0;
     }
```

Every other `pubIdExists()` (galleys, issues, issue galleys, chapters,
formats, submission files) leaves out the object whose ID it is given.
This makes the publication DAO do the same, widened to the object's
sibling versions as it always intended. The change is in pkp-lib only,
and neither app changes. When a caller passes 0, the subquery is empty
and nothing is left out, as before.

Tried on `main`, OJS and OMP:

- With the fix, steps 5 and 10 show "Saved" on both apps.
- On the journal, step 12 is now refused. Before the fix, it was
  accepted.
- On the press, submission 7's URN on submission 4 is refused with and
  without the fix. This shows the fix does not loosen the check; on the
  press, the re-save and the new version prove the fix.

**Alternatives**

- Compare `p.publication_id`, like the other DAOs. The re-save passes,
  but a new version would still be refused the URN it copied from its
  earlier version.
- Pass the submission from `validatePublicationUrn()`. Since
  `pkp/pkp-lib#10826`, `checkDuplicate()` takes an object and checks
  only the types it matches. A Submission matches none, so it would skip
  the check unless each plugin special-cased it, and other callers would
  keep the fault.
- Revert `pkp/pkp-lib#10826`'s `checkDuplicate()`. This loses that
  change's other fixes, and needs the object-type question above
  settled first.

**What goes with it**

- Stored data: a duplicate that got through before the fix stays. An
  editor decides which article keeps the URN. A `GROUP BY
  setting_value` over `publication_settings` rows named
  `pub-id::other::urn`, counting distinct submissions, finds them. No
  migration is proposed.
- Backport: applies to `stable-3_5_0` as written (the same line, at
  line 282). 3.4 and 3.3 are not affected.
- Test: a pkp-lib test of `pubIdExists()` for the version's own URN, a
  sibling version's copy, another submission's URN and an exclusion of
  0. Also an e2e scenario for the identifiers feature: save twice, and
  save a new version's copied URN.

Small: one query in pkp-lib's publication DAO, plus a test.

## Evidence

- Kept scripts, in
  [urn-resave-refused-already-in-use/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-resave-refused-already-in-use/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-resave-refused-already-in-use/walk.js)
    takes steps 1–10 on a fresh load of the default dataset:
    `ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-resave-refused-already-in-use/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each
    "Identifiers" page at the address its side-menu entry sets
    (`…/dashboard/editorial?workflowSubmissionId=<n>&workflowMenuKey=publication_<publication>_identifiers`;
    `publication_identifiers` on 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-resave-refused-already-in-use/neighbour.js)
    takes steps 11 and 12 (and the press's submissions 7 and 4). It was
    run with the fix in and out, each time on a fresh load.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-resave-refused-already-in-use/fix.diff ojs omp`,
    then `walk.js` and `neighbour.js`, then `node bin/try-fix.js revert
    ojs omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS and
  OMP; steps 11 and 12 on `main` only. The fix's subquery is standard
  SQL. MySQL was not checked.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    and OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    both with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - The "Identifiers" page's form (`PKPPublicationIdentifiersForm`) has
    no fields of its own. Pub-ID plugins add them, and the only one in
    the apps is the URN plugin (`addPublicationFormFields()`). DOIs are
    not on this page.
  - 3.5: the same lines as `main` (publication DAO at 282), agreeing with
    the walk.
  - 3.4: `plugins/pubIds/urn/URNPubIdPlugin.php` passes `'Publication',
    $submission->getId()` (line 316 in OJS, 289 in OMP). pkp-lib's
    `checkDuplicate($pubId, $pubObjectType, $excludeId, $contextId)`
    passes it to the publication DAO, which compares it with
    `s.submission_id`.
  - 3.3: the same in `URNPubIdPlugin.inc.php` (line 330 in OJS, 308 in
    OMP), `PKPPubIdPlugin.inc.php` and
    `classes/publication/PKPPublicationDAO.inc.php` (the comparison at
    line 233).
  - The copies a new version makes: OJS and OMP
    `classes/publication/Repository.php` `version()` clone galleys (on a
    press, formats and chapters) with their data.
- Introduced, the trace: `git blame` of the plugin's `checkDuplicate()`
  line gives
  [3576a57f07](https://github.com/pkp/ojs/commit/3576a57f0777a0a82a5698eddd7de41c815a9cd0)
  in OJS (`pkp/ojs#4613`, "pkp/pkp-lib#10821 fix checkDuplicate,
  anyPubIdExists, pubIdExists") and
  [0de89cb31c](https://github.com/pkp/omp/commit/0de89cb31cbd711110fe063a4ac500a11420e838)
  in OMP (`pkp/omp#1813`, from branch `bozana/10821`; the commit's
  subject reads "pkp/pkp-lib#9497 fix anyPubIdExists, pubIdExists,
  checkDuplicate"). `PKPPubIdPlugin` line 491 gives
  [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5)
  (`pkp/pkp-lib#10826`). The publication DAO's comparison blames to
  [6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347)
  (2024-07-05), a query-builder rewrite of a line that dates from 3.3.
- Upstream search, 2026-09-30: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by "URN already in use", "URN suffix unique", "URN new
  version", `pubIdExists`, `checkDuplicate` and `validatePublicationUrn`.
  `pkp/pkp-lib#10821` (closed) is the change's own issue, and its
  testing notes do not mention a re-save. `pkp/pkp-lib#10927` is about
  the settings window's prefix message.
- Not driven: OPS (no URN plugin); 3.4 and 3.3 (read in the code).
  Read in the code only, not walked on this date: saving a cleared URN
  back on a new version, and the refusal with a pattern-built URN.
  Refusal of a copied URN was walked on 2026-09-24.
