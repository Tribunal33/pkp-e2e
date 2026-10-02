# The Identifiers page refuses an article's own URN as "already in use" when saved again or on a new version

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10826` for `pkp/pkp-lib#10821` · [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5) · 2025-01-20 · Bozana Bokan (bozana); with `pkp/ojs#4613` ([3576a57f07](https://github.com/pkp/ojs/commit/3576a57f0777a0a82a5698eddd7de41c815a9cd0)) and `pkp/omp#1813` ([0de89cb31c](https://github.com/pkp/omp/commit/0de89cb31cbd711110fe063a4ac500a11420e838))
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor presses "Save" on an article's "Identifiers" page with the URN
the article already carries. The save is refused with "The given URN
suffix is already in use for another published item. Please enter a
unique URN suffix for each item." This happens on every new version,
which inherits the URN from the version before it. Once any new version
has been made on the site, it also happens on the second save of every
submission's first version created after that; the first save of a URN
passes.

Nothing is lost, and the version still publishes with its URN. But the
message tells the editor to change a correct persistent identifier, and
on a new version there is no way to save the page with its URN.

The same check can also let a real duplicate through silently, though
only in a rare coincidence. It needs the URN plugin with URNs on for
articles (monographs on a press).

## Impact

- **Lost**: nothing stored. A refused save leaves the URN as it was.
  When the rare duplicate passes, two articles carry one URN, an
  identifier meant to name one item.
- **Who**: editors and managers on journals and presses that assign URNs
  to articles or monographs; OPS ships no URN plugin. Every new version
  meets the refusal. A first version meets it when its publication ID
  (the version's internal ID, not a version number such as 1.1) differs
  from the submission's ID. Each new version takes a publication
  ID without a submission ID, so that is true of every submission
  created after the first new version anywhere on the site. The
  duplicate passes only when the article that already carries the URN
  has a submission ID equal to the saving version's publication ID.
- **Way round**: leave the page without saving. A new version publishes
  with its inherited URN, since publishing does not run this check.
  Typing a different URN, or clearing the box, saves. But a cleared
  inherited URN cannot be entered again on that version, because the
  earlier version still holds it.

Medium: saving the "Identifiers" page fails with a misleading message on
every new version, and a duplicate URN can slip through unseen, though
rarely. It would be high if another identifier plugin's fields sat on
the same page, because the refusal would then block saving those too; a
default install has only the URN there.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` or OMP `main` (or
  `stable-3_5_0`). The URN plugin is off; steps 1 to 3 turn it on.

Setting up the URN plugin:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins". On the "URN" row under "Public
   Identifier Plugins", tick "Enabled".
3. Press the row's arrow, then "Settings". Tick "Articles" (OMP:
   "Monographs"), type `urn:nbn:de:0000-` under "URN Prefix", choose
   `urn:nbn:de` under "Namespace", choose "Enter an individual URN suffix
   for each published item…" under "URN Suffix", type
   `https://nbn-resolving.de/` under "Resolver URL", and press "Save".

Saving again (OJS):

4. Open submission 5, "Genetic transformation of forest trees" (its
   only version has publication ID 6), and select Publication ›
   "Identifiers".
5. Type `urn:nbn:de:0000-u44b5` into "URN" and press "Save". The page
   shows "Saved".
6. Press "Save" again without changing anything.

A new version (OJS submission 17, "Antimicrobial, heavy metal resistance
and plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran"; OMP book 14, "From Bricks to Brains: The
Embodied Cognitive Science of LEGO Robots"):

7. Open it, press "Create New Version", choose "Minor Revision" under
   "Revision Significance" and press "Confirm" (version 1.1). [3.5: the
   publication header's "Create New Version", then "Yes".]
8. On version 1.1's "Identifiers", type `urn:nbn:de:0000-u44b17` and
   press "Save". The page shows "Saved".
9. Publish version 1.1. OJS: "Publish", "Confirm" under "Review
   Publishing Details", then "Publish". OMP: "Publish", then "Publish"
   in the confirmation.
10. Press "Create New Version" again, "Minor Revision", "Confirm"
    (version 1.2). [3.5: the header's "Create New Version", then "Yes".]
11. Open version 1.2's "Identifiers". The box shows
    `urn:nbn:de:0000-u44b17`. Press "Save".

A real duplicate (OJS):

12. Open submission 6, "Investigating the Shared Background Required for
    Argument: A Critique of Fogelin's Thesis on Deep Disagreement",
    select "Identifiers", type `urn:nbn:de:0000-u44b6` and press "Save".
    The page shows "Saved".
13. Open submission 5's "Identifiers" again, replace its URN with
    `urn:nbn:de:0000-u44b6` and press "Save". Submission 5's version has
    publication ID 6, so the check leaves out submission 6, the one that
    holds this URN.

**Expected**: steps 6 and 11 show "Saved"; the URN is the article's own.
Step 13 is refused, because the URN is submission 6's.

**Observed**: steps 6 (OJS) and 11 (OJS and OMP) are refused. Under
"URN", and in the page's "Please correct one error." list:

```
The given URN suffix is already in use for another published item. Please enter a unique URN suffix for each item.
```

```
POST …/api/v1/submissions/5/publications/6   400
{"pub-id::other::urn":["The given URN suffix is already in use for another published item. Please enter a unique URN suffix for each item."]}
```

Step 13 shows "Saved": submissions 5 and 6 now both carry
`urn:nbn:de:0000-u44b6`.

Control: on OMP, steps 4 to 6 on book 4, "How Canadians Communicate:
Contexts of Canadian Popular Culture", save twice without a refusal. In
the OMP dataset every book's publication ID equals its submission ID, so
on OMP only new versions are refused. In the OJS dataset, submission 1's
first version is publication ID 1 and saves twice too; its version 1.1
takes ID 2, which puts every later submission's publication ID one ahead.

## Cause

The duplicate check passes a publication ID where a submission ID is
expected. `URNPubIdPlugin::validatePublicationUrn()` (OJS
`plugins/pubIds/urn/URNPubIdPlugin.php` line 317, OMP line 290) calls
`checkDuplicate($urn, $publication, $contextId)`.
`PKPPubIdPlugin::checkDuplicate()` (`lib/pkp/classes/plugins/PKPPubIdPlugin.php`
line 491) hands `$pubObject->getId()`, the publication ID, to
`PKP\publication\DAO::pubIdExists()`.

`pubIdExists()` (`lib/pkp/classes/publication/DAO.php` line 330) leaves
out one submission, not one publication:
`->where('s.submission_id', '<>', $excludePubObjectId)`. That is the
intended rule: the versions of one submission share their identifiers.
The query carried a comment saying so ("The excludePubObjectId refers to
the submission id because multiple versions of the same submission are
allowed to share a DOI") until a clean-up in 2024
([6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347))
removed it without changing behaviour.

So the check leaves out the submission whose submission ID equals the
saving version's publication ID. The article's own versions stay in, and
its stored URN counts as a duplicate whenever the two IDs differ. When
the left-out submission is another article that already carries the
URN, its real duplicate is missed.

Until January 2025 the plugins passed `$submission->getId()`.
`pkp/pkp-lib#10826` changed `checkDuplicate()` to take the object
instead of a type name and an ID, so it could tell galleys and files
apart by class, and the URN plugins were moved to pass `$publication`.
The publication case kept the object's own ID.

Reach:

- The publication "Identifiers" page on OJS and OMP: checked on screen.
- The legacy "Identifiers" tabs reach `checkDuplicate()` through
  `verifyData()` with galleys, issues, chapters, formats and files,
  never a publication. Their DAOs leave out the object's own ID, so they
  are not affected (checked in the code). A new version's galleys meet a
  different fault (spec U44 A5).
- `JournalDAO`/`PressDAO`/`ServerDAO::anyPubIdExists()`: no caller
  passes a publication (checked in the code).
- Out of scope, a separate fault: 3fdd61a86a also narrowed
  `checkDuplicate()` to the object's own type. Before it, every type was
  checked, so a publication URN equal to a galley's or a file's URN was
  refused (3.4 does); on 3.5 and `main` it is accepted. This fix does not
  cover it (checked in the code).
- Out of scope, a separate fault: on adding a publication
  (`$object` null), `validatePublicationUrn()` never sets
  `$publication`, so `checkDuplicate()` gets `null`, matches no type and
  passes: a URN sent with a new publication is not checked. No screen
  reaches it; only a REST API client posting to
  `submissions/{id}/publications` does ("Create New Version" uses the
  `version` endpoint, which does not validate). Checked in the code.

## Proposed fix

In `PKPPubIdPlugin::checkDuplicate()`, pass the publication's submission
ID for the `Publication` type, and restore the note on the publication
DAO's `pubIdExists()`. This is a proposal; the team decides.

```diff
-            if (isset($typeDao) && $typeDao->pubIdExists($this->getPubIdType(), $pubId, $pubObject->getId(), $contextId)) {
+            // The versions of one submission share their identifiers, so a
+            // publication is excluded by its submission (see DAO::pubIdExists()).
+            $excludeId = $type === 'Publication' ? $pubObject->getData('submissionId') : $pubObject->getId();
+            if (isset($typeDao) && $typeDao->pubIdExists($this->getPubIdType(), $pubId, $excludeId, $contextId)) {
```

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/article-own-urn-refused-as-in-use/fix.diff),
one change in pkp-lib, so it covers OJS and OMP. It was tried on `main`.
With it, steps 6 and 11 showed "Saved" on OJS and OMP, and step 13 was
refused. As a neighbour check, a URN that one submission holds was typed
on another submission whose IDs do not coincide (OJS submission 9, OMP
book 7): it was refused with and without the fix, so the fix does not
loosen the check.

**Alternatives**

- Make `pubIdExists()` take a publication ID and leave out its
  submission by subquery: this changes what a DAO method that plugins
  and `anyPubIdExists()` call expects.
- Pass `$submission` from each app's `validatePublicationUrn()`: two
  repos, and `checkDuplicate()` would still pass the wrong ID for any
  other plugin that hands it a publication.

**What goes with it**

- No API or plugin hook change. `checkDuplicate()` keeps its signature.
- Duplicates the missed check let through stay stored; which article
  keeps the URN is the journal's call. A query over
  `publication_settings` (`pub-id::other::urn`) grouped by value across
  submissions lists them.
- Backport: the diff applies to 3.5 as written. 3.4 and 3.3 need
  nothing.
- Guard: a pkp-lib test that saves a publication's URN twice and on a
  new version, and refuses another submission's URN.

Small: one line in the shared plugin class, a doc comment, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/article-own-urn-refused-as-in-use/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/article-own-urn-refused-as-in-use/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front takes the
  neighbour check alone on a fresh load: submission 6 (OMP: book 4)
  saves `urn:nbn:de:0000-u44b6`, then submission 9, "Hansen & Pinto:
  Reason Reclaimed" (OMP: book 7), tries the same URN. The fix was
  applied with `node bin/try-fix.js apply …/fix.diff ojs omp` for those
  walks and reverted after.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c;
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c (pkp-lib cf3f984335);
  `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441 (pkp-lib 32b0f4b4af);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883 (pkp-lib f6ab331645).
- Code read on each branch: `plugins/pubIds/urn/URNPubIdPlugin.php`
  (3.3: `.inc.php`) `validatePublicationUrn()`,
  `lib/pkp/classes/plugins/PKPPubIdPlugin.php` (3.3: `.inc.php`)
  `checkDuplicate()`, and the publication DAO's `pubIdExists()` (3.3:
  `PKPPublicationDAO.inc.php`). 3.5 matches `main`. 3.4 and 3.3 pass
  `$submission->getId()` to a check with the same submission-based query.
- Introduced: before 3fdd61a86a, `checkDuplicate()` took a type name and
  an ID and passed the caller's ID to the matching type's DAO. OJS
  3576a57f07 and OMP 0de89cb31c changed the URN plugins' call from
  `'Publication', $submission->getId()` to `$publication`. Every 3.5 tag
  (3_5_0rc2, 3_5_0-0 to 3_5_0-5) contains them; `stable-3_4_0` does not.
- Way round, read in the code: publishing runs
  `Repo::publication()->validatePublish()` and its hook, which the URN
  plugin does not use; the URN check runs only on `Publication::validate`
  (a publication edit). Step 9 published version 1.1 with its URN.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp, issues and PRs,
  for "URN already in use", "URN suffix unique version", "unique URN
  suffix", "URN duplicate publication", `checkDuplicate` and
  `pubIdExists`, and pkp/ui-library for "URN". `pkp/pkp-lib#10821` and
  its PRs are the introducing change; `pkp/pkp-lib#6293` (PR
  `pkp/pkp-lib#8986`) is about check numbers.
- Not driven: the default-pattern and own-pattern suffix choices (the
  same save path, `validatePublicationUrn()`); clearing and re-entering
  an inherited URN (read in the code). MySQL not checked (the query
  compares integers only).
