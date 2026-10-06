# A preprint's first post thanks its authors for "a new version"; "Preprint Posted Acknowledgement" is never sent

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10810` and `pkp/ops#971` for `pkp/pkp-lib#10669` · [958592a159](https://github.com/pkp/pkp-lib/commit/958592a15966ca41ce8b02cfe655b74d7f554241) · 2025-05-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U49 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a moderator or manager posts a preprint for the first time, its
contributors receive "New Version Posted Acknowledgement" ("Thank you for
posting a new version of your preprint … The new version is now
available."). "Preprint Posted Acknowledgement", the email meant for a
first post ("Your preprint … has been posted online"), is never sent.

First-time authors are thanked for a version they never posted. A
manager who rewrote "Preprint Posted Acknowledgement" under Manage Emails
(where it is listed as "Posted Acknowledgement") gets no warning that
their text is never used. It happens on a default install.

## Impact

- **Lost**: the right wording on every first post, and any text the
  manager gave "Preprint Posted Acknowledgement". The author still learns
  the preprint is online, with a working link to its page.
- **Who**: every contributor with an email address, on every preprint's
  first post, wherever Settings › Workflow › Emails › "Preprint Posted"
  is "Send an email to all authors." (the default; the only other option,
  "Do not send an email.", sends neither email).
- **Way round**: reword "New Version Posted Acknowledgement" (Manage
  Emails: "New Version Posted") so that it suits a first post too, which
  then reads wrong for later versions.

Low: on the default texts the author loses nothing but the wording. The
first-post email carries no licence line or next step, and its "Preprint
URL" points at the editorial workflow, while the email that arrives
instead links the preprint's public page. A server whose manager put
something authors need into "Preprint Posted Acknowledgement" loses it
without notice, which would raise this to medium.

## Steps to reproduce

Preconditions: PKP's default test dataset, OPS `main`. Nothing is
created beforehand.

- Preprint 1, "The influence of lactation on the quantity and quality of
  cashmere production", is in Production and has never been posted; its
  one contributor is Carlo Corino (`ccorino@mailinator.com`).
- Preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative
  Study Of Construct Equivalence", is posted (version "Author Original
  1.0"); its contributors are Catherine Kwantes
  (`ckwantes@mailinator.com`) and Urho Kekkonen.
- Settings › Workflow › Emails › "Preprint Posted" has "Send an email
  to all authors." selected.

First post:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open preprint 1 from "Active submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. In the "Preprint" menu open "Title & Abstract" and press "Post". The
   "Post the preprint" window reads "All requirements have been met. Are
   you sure you want to post this? … The stage version that will be
   assigned to the publication is "Author Original 1.0"". Press "Post".
4. Read the email that arrives at `ccorino@mailinator.com`.

A later version (the control):

5. Still as `dbarnes`, open preprint 2
   (`…/dashboard/editorial?workflowSubmissionId=2`).
6. In the "Preprint" menu press "Create New Version", choose "Minor
   Revision" under "Revision Significance" and press "Confirm".
7. Under the new version ("Author Original 1.1") open "Title & Abstract",
   press "Post", and "Post" again in the window.
8. Read the email that arrives at `ckwantes@mailinator.com`.

**Expected**: step 4 delivers "Preprint Posted Acknowledgement": "Carlo
Corino: Your preprint, "The influence of lactation on the quantity and
quality of cashmere production" has been posted online on Public
Knowledge Preprint Server. …". Step 8 delivers "New Version Posted
Acknowledgement".

**Observed**: step 4 delivers "New Version Posted Acknowledgement":

```
Dear Carlo Corino, Thank you for posting a new version of your preprint to
Public Knowledge Preprint Server. The new version is now available. If you
have any questions, please contact me. {$signature}
```

No email with the subject "Preprint Posted Acknowledgement" arrives. (The
raw "{$signature}" is a fault of its own, reported apart.) Step 8
delivers "New Version Posted Acknowledgement", as expected. On 3.5 step 4
delivers "Preprint Posted Acknowledgement".

## Cause

`APP\observers\listeners\SendPostedAcknowledgement::handle()`
([classes/observers/listeners/SendPostedAcknowledgement.php](https://github.com/pkp/ops/blob/main/classes/observers/listeners/SendPostedAcknowledgement.php),
line 54) chooses the email by the publication's `version`:

```php
$mailableClass = $event->publication->getData('version') == 1
    ? PostedAcknowledgement::class
    : PostedNewVersionAcknowledgement::class;
```

On `main` a publication has no `version` any more. 958592a159 (for
`pkp/pkp-lib#10669`, the version stages and major/minor numbering)
replaced it in the publication schema with `versionStage`,
`versionMajor`, `versionMinor` and `versionString`, and its migration
`I4860_MigratePublicationVersion` drops the `publications.version`
column. `getData('version')` is therefore always null, the test is
always false, and every post sends `PostedNewVersionAcknowledgement`
(`POSTED_NEW_VERSION_ACK`). The OPS side of that change, `pkp/ops#971`,
did not update the listener, which is the field's only remaining
reader in OPS. (The commits of both PRs are titled `pkp/pkp-lib#4860`,
the older issue number the change started under.)

The reach, read in the code unless marked otherwise:

- "Do not send an email." stops both emails, as it should; it is read
  before the choice.
- The same removed field is read in one more place: OJS
  `APP\submission\maps\Schema::getPropertyIssueToBePublished()` sorts
  scheduled publications by `version`, which no longer orders them. That
  is a separate, smaller fault and is not part of this fix. The
  publication schema also still lists `version` under `required`.

## Proposed fix

Decide "first post" the way `PKP\publication\Repository::publish()`
already does for the activity log entry ("The submission was posted." or
"A new version was posted."): by the number of the submission's
publications
([fix-first-post.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/fix-first-post.diff)):

```diff
-        $mailableClass = $event->publication->getData('version') == 1
-            ? PostedAcknowledgement::class
-            : PostedNewVersionAcknowledgement::class;
+        // The first post of a preprint is the post of its only version, the
+        // same test Repository::publish() uses for its activity log entry.
+        $mailableClass = count($event->submission->getData('publications')) > 1
+            ? PostedNewVersionAcknowledgement::class
+            : PostedAcknowledgement::class;
```

`PublicationPublished` carries the submission as `publish()` reloaded it,
with all its publications, so the email and the activity log line always
agree.

One case changes from 3.5. When the first version is unposted after a
newer version exists and then posted again, this sends "New Version
Posted Acknowledgement", whereas 3.5 (testing `version == 1`) sent
"Preprint Posted Acknowledgement". That is intended: the preprint has
been online before, and the activity log records this post with the
line "A new version was posted." too. A sole version unposted and posted again still
gets "Preprint Posted Acknowledgement", as on 3.5. If the team prefers
3.5's rule, compare the posted publication's id with the submission's
first publication instead; it is the same size of change. (Read in the
code; the re-post was not walked.)

Tried on OPS `main`: the first post of preprint 1 delivered "Preprint
Posted Acknowledgement" ("Carlo Corino: Your preprint, … has been posted
online on Public Knowledge Preprint Server."), and a minor version of
preprint 2 posted afterwards still delivered "New Version Posted
Acknowledgement", as it does without the fix.

**Alternatives**

- Test `versionMajor == 1 && versionMinor == 0`. It gives the same answer
  on a preprint server today, which has one version stage ("Author
  Original"), but it would call a first "1.0" of another stage a first
  post if OPS gains stages; the publication count needs no such
  assumption.
- Restore a `version` field. It would undo part of `pkp/pkp-lib#10669`
  for one reader.

**What goes with it**

- The first-post email's "Preprint URL" (`{$submissionUrl}`) is the
  editorial workflow's address, not the preprint's page (seen on 3.5 and
  on `main` with the fix), a separate template fault worth correcting
  with this one.
- No data repair and no backport: 3.5 and older still store `version`.
- The guard: a unit test of `SendPostedAcknowledgement` that a
  submission's first publication sends `PostedAcknowledgement` and a
  second sends `PostedNewVersionAcknowledgement`.

Small: the fix is one condition in one OPS listener, with its unit test;
the two repositories in Introduced are the history of the fault, not the
fix.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-posted-acknowledgement/lib.js))
  takes steps 1–4 and reads the mailbox, keeping only messages that link
  to the install walked; its `nb` mode takes steps 5–8. On an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js [nb]`.
- Walked on OPS `main` (the Steps, and the control) and `stable-3_5_0`
  (the Steps), on PostgreSQL; the fault does not depend on the database.
  Dataset: pkp/datasets e8dafbc (2026-10-02).
- Tips: `main` OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OPS
  38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OPS acd8ae704b (lib/pkp
  32b0f4b4af); `stable-3_3_0` OPS c5532e2161 (lib/pkp f6ab331645).
- Introduced: `git blame` on line 54 gives 8fd2c6d834 (2022, the listener
  as written, correct then). The fault came with the removal of
  `version`: pkp-lib 958592a159 (`pkp/pkp-lib#10810`) and the OPS commits
  eadd8a5ff6 to 64f6bbb3b9 (`pkp/ops#971`; the last is its submodule
  update), none of which touches the listener.
- Code read on 3.5 (the walked tip): `publications.version` exists,
  `PKP\submission\Repository::add()` sets it to 1 and
  `PKP\publication\Repository::version()` adds one, so the listener's
  test works. On 3.4 (`upstream/stable-3_4_0`, lib/pkp
  `origin/stable-3_4_0`): the same listener and the same `version` field.
  On 3.3: `APP\Services\PublicationService::publishPublication()` sends
  `POSTED_ACK` only when `version == 1` and nothing on later versions.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-posted-acknowledgement/fix-first-post.diff ops`,
  then steps 1–4 and, on a freshly loaded install, steps 5–8, then
  `node bin/try-fix.js revert … ops`.
- Not driven: "Do not send an email." (read in the code; the spec's own
  walks show it stops both); the re-post of a first version after a
  newer one exists.
