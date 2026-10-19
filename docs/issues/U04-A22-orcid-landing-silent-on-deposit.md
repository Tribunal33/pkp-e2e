# The ORCID authorization page never tells a contributor their published work is going to their record

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · 2024-06-21 (merged into main) · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U04 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a22)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a member-API journal, a contributor who completes the emailed
authorization for an article already published sees only that their iD
is verified. The article is queued for their ORCID record in the
background, and the page says nothing about it. For an article not yet
published the same page adds "The submission will be added to your
ORCID record during publication." The page holds a line for the
published case, "The submission has been added to your ORCID record.",
which never shows.

Up to 3.4, when ORCID came as the ORCID Profile plugin, the same page
showed that line for a published article (read in the plugin's code).
The deposit still goes out, so nothing is lost: the contributor is only
not told.

## Impact

- **Lost:** the confirmation that the work is on its way to the
  contributor's ORCID record.
- **Who:** every contributor who answers the verification email after
  their work was published, on a journal or preprint server set to a
  member API ("Member" or "Member Sandbox").
- **Way round:** a contributor who wants to be sure can look at their
  record on orcid.org.

Low: a confirmation line is missing while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OPS in brackets).
- For step 9's ORCID sign-in: an ORCID Member Sandbox API client
  registered with the install's address as a redirect URI (its Client
  ID and Secret go in step 3), and a user account on the ORCID sandbox
  (sandbox.orcid.org) to sign in with. Without them, ORCID's answer can
  be stood in for as Evidence describes.

Turning ORCID on:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles, tab "ORCID".
3. Tick "Enable ORCID functionality", set "ORCID API" to "Member
   Sandbox", fill in "Client ID" and "Client Secret", and press "Save".

Asking for verification:

4. Sign out and sign in as `dbarnes`.
5. Open submission 5 "Genetic transformation of forest trees" (in
   Production) [OPS: submission 1 "The influence of lactation on the
   quantity and quality of cashmere production", in Production],
   Publication › "Contributors", and press "Edit" on Diaga Diouf [OPS:
   Carlo Corino].
6. Under "ORCID iD" press "Request verification", then "Yes".
   `ddiouf@mailinator.com` [OPS: `ccorino@mailinator.com`] receives
   "Requesting ORCID record access".

Publishing:

7. Publication › "Title & Abstract", "Schedule For Publication". In
   "Review Publishing Details" choose "Assign To Current/Back Issue" and
   "Vol. 1 No. 2 (2014)", press "Confirm", then "Publish". [3.5:
   "Schedule For Publication" opens "Select an issue to schedule for
   publication"; pick "Vol. 1 No. 2 (2014)", "Save", then "Publish".]
   [OPS: "Post the preprint", "Post", then "Post" in the window; 3.5:
   "Post", then "Post" in the window.]
8. Sign out.

Authorizing:

9. Not signed in to the journal, open the email from step 6 in
   `ddiouf@mailinator.com`'s mailbox [OPS: `ccorino@mailinator.com`],
   follow its link "Register or Connect your ORCID iD", sign in at the
   ORCID sandbox with the sandbox user and press "Authorize". ORCID
   returns the browser to
   `/index.php/publicknowledge/orcid/verify?token=…&state=…&author_id=…&code=…`.

**Expected:** the "ORCID Authorization" page shows the iD, "Your ORCID
iD has been verified and successfully associated with the submission."
and "The submission has been added to your ORCID record.", and the work
is sent to the contributor's ORCID record.

**Observed:** the page shows only the iD and

```
Your ORCID iD has been verified and successfully associated with the submission.
You will now be automatically directed back to Journal of Public Knowledge.
```

The work is sent all the same: as the page loads, the app posts it to
the contributor's record (`POST https://api.sandbox.orcid.org/v3.0/<iD>/work`,
the queued `DepositOrcidSubmission` job, which the job runner runs at the
end of the same request).

Control: authorizing before step 7, while the work is unpublished, the
page adds "The submission will be added to your ORCID record during
publication."

## Cause

`orcidVerify.tpl` shows the deposit line only inside
`{if $sendSubmission}`, where `$sendSubmissionSuccess` chooses between
the keys `orcid.verify.sendSubmissionToOrcid.success` and `.failure`.
`OrcidHandler::verify()`
and `updateScope()` assign `sendSubmission` false, and nothing sets it
afterwards. `VerifyIdentityWithOrcid::depositOrcidItem()`
([lib/pkp/classes/orcid/actions/VerifyIdentityWithOrcid.php](https://github.com/pkp/pkp-lib/blob/042726ebf6da656b4d3485644d644a0a6fc3b48f/classes/orcid/actions/VerifyIdentityWithOrcid.php#L206-L208)),
which queues the deposit for a published work, sets only
`sendSubmissionSuccess`, so the outer condition is never true.

In the ORCID Profile plugin of 3.4 and 3.3, the handler's verify step
assigned `sendSubmission` true for a published work, sent
it, and set `sendSubmissionSuccess` from the result. The move of the
plugin into pkp-lib (`pkp/pkp-lib#9771`) kept the template and the
success flag but dropped the `sendSubmission` assignment.

Reach:

- OMP: a press deposits nothing (`SendSubmissionToOrcid::canDepositSubmission()`
  returns false), so the page for a published monograph rightly has no
  deposit line. It was walked with the fix applied and stays silent.
- The review branch of `depositOrcidItem()` (reached from a reviewer's
  `orcid/updateScope` link) sets `sendSubmissionSuccess` the same way and
  shows nothing either (code). The success line reads "The submission
  has been added…", which would be wrong for a review, so the fix
  deliberately does not set `sendSubmission` there.
- The work branch of `updateScope()` (the "Requesting updated ORCID
  record access" link) fails today before it gets this far: the link
  carries no `state`, `getAuthorToVerify()` finds no contributor, and
  constructing `VerifyIdentityWithOrcid` with the null identity throws a
  `TypeError` (reported as
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a14)).
  Once that is fixed, the change below in `depositOrcidItem()` applies
  to that path too.

## Proposed fix

Let `PKPSendSubmissionToOrcid::execute()` say whether it queued a
deposit, and set both template flags from that in
`VerifyIdentityWithOrcid::depositOrcidItem()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-landing-published-no-deposit-line/fix.diff)):

```diff
-    public function execute(): void
+    public function execute(): bool
     {
         if (!OrcidManager::isEnabled($this->context)) {
-            return;
+            return false;
         }
 
         if (!OrcidManager::isMemberApiEnabled($this->context) || $this->canDepositSubmission() === false) {
             // Sending to ORCID only works with the member API
             // FIXME: OMP cannot deposit submissions currently. Check can be removed once added
-            return;
+            return false;
         }
 …
+        $queued = false;
         if (empty($authorsWithOrcid)) {
 …
             if ($orcidWork === null) {
-                return;
+                return false;
             }
             foreach ($authorsWithOrcid as $orcid => $author) {
                 dispatch(new DepositOrcidSubmission($author, $this->context, $orcidWork->toArray(), $orcid));
             }
+            $queued = true;
         }
 
         $this->depositReviewsForSubmission();
+
+        return $queued;
     }
```

```diff
             if ($publication->getData('status') == PKPPublication::STATUS_PUBLISHED) {
-                (new SendSubmissionToOrcid($publication, $this->context))->execute();
-                $this->addTemplateVar('sendSubmissionSuccess', true);
+                $queued = (new SendSubmissionToOrcid($publication, $this->context))->execute();
+                // The landing's deposit line shows only under sendSubmission (orcidVerify.tpl)
+                $this->addTemplateVar('sendSubmission', $queued);
+                $this->addTemplateVar('sendSubmissionSuccess', $queued);
```

Every early `return;` of `execute()` becomes `return false;`, as PHP
requires once the method returns `bool`. Setting the flags from what
`execute()` did keeps the page silent where no deposit is queued: on a
press, or when no contributor holds a valid token.

The template's failure line, "The submission could not be added to your
ORCID record.", stays unreachable from `verify()`, as it is today. That
is right for now: the deposit runs in a job, so the page cannot know
whether ORCID accepts it, and right after a successful authorization a
journal or server that deposits always queues one (the contributor's
token was just stored). Whether to drop the branch and its key is the
team's call.

Tried on OJS, OMP and OPS `main`: after the steps the page adds
"The submission has been added to your ORCID record." on OJS and OPS;
with the fix in and out, authorizing before publication still shows
"The submission will be added to your ORCID record during publication."
(OJS), and a published monograph's page still has no deposit line and
queues nothing (OMP).

**Alternatives:**

- Assign `sendSubmission` true beside `sendSubmissionSuccess`: one line,
  but a press would then claim "The submission has been added to your
  ORCID record." for a monograph it never sends.
- Reword the line to "will be sent" since the deposit runs in a job: a
  product call and a new locale key in every translation. With
  `job_runner = On` (the default in `config.TEMPLATE.inc.php`) the job
  runs at the end of the same request.

**What goes with it:**

- `execute()`'s callers (`SendSubmissionToOrcid` listener on publish)
  ignore the return value; no app class overrides `execute()`.
- No stored data to repair. The same code is on 3.5, where the diff
  applies with one context line changed (3.5 reads
  `PKPSubmission::STATUS_PUBLISHED`).
- The proposed fix for A14 changes the two lines just above in the same
  method (which publication is read); the two changes are independent.
- The guard: an end-to-end test that authorizes after publication and
  reads the page's deposit line.

Small: two methods in pkp-lib, no data to repair, tried as written.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-landing-published-no-deposit-line/walk.js)
  with [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-landing-published-no-deposit-line/lib.js)
  beside it, on an install loaded from the default dataset. PHP on that
  install must trust the local ORCID stand-in's TLS certificate; the
  script's header says how. The command:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> STUB_DIR=<dir> node bin/probe.js ojs|ops shared/playwright/checks/issues/orcid-landing-published-no-deposit-line/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `MODE=nb` runs the
  neighbour: OJS authorized before publication, and OMP monograph 4
  "How Canadians Communicate" (Bart Beaty) published, then authorized.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`. Tried on OJS, OMP and OPS `main`: the Steps
  on OJS and OPS with the fix applied, and the neighbour (`MODE=nb`) on
  OJS and OMP with the fix applied and again after removing it.
- Not driven: ORCID's sign-in and consent screens. ORCID's token answer
  came from a local stand-in
  ([`orcid-token-stub.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js))
  with ORCID's documented success body, and the return was taken by
  ORCID's redirect back to the install was simulated by opening the
  email link's `redirect_uri` directly with `&code=…` added.
  On `main` the stand-in answered with the member scope
  `/activities/update`. The deposit job then posted the work, which the
  stand-in answers with 404, so the job failed; ORCID itself was not
  reached. On 3.5 the stand-in answered with the public scope
  `/authenticate`. The page read the same as on `main`. The deposit job
  was queued and ran, but with a public-scope token it sent "Requesting
  updated ORCID record access" instead of posting the work, so the
  member-scope deposit was not exercised on 3.5. Unverified: the deposit
  against ORCID's real member sandbox.
- Walked on `main` and `stable-3_5_0`, OJS and OPS, PostgreSQL, the
  default datasets of pkp/datasets eaf024c5 (2026-10-18), each walk on a
  freshly loaded dataset.
- Tips:
  - main: OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4 (lib/pkp 042726ebf6)
  - 3.5: OJS 007c2cd0d6, OMP 2d575f250, OPS e737a9e465 (lib/pkp 092ec34b0f)
  - 3.4: OJS 0012bd1022, OPS 0f1e21a117 (lib/pkp a71d6bd2ca); ORCID Profile plugin 894c2593e0 (OJS), 7d8c4e3c51 (OPS)
  - 3.3: OJS d7d9dd14ec, OPS c5532e2161 (lib/pkp 5e84acd11b); ORCID Profile plugin 41864d3770 (OJS, OPS)
- Code reads: on main the template, `OrcidHandler` and
  `VerifyIdentityWithOrcid` are the same in the three apps' lib/pkp; 3.5
  holds the same code. On 3.4 and 3.3 lib/pkp has no ORCID pages; the
  ORCID Profile plugin's handler (`OrcidProfileHandler.php` on 3.4,
  `pages/OrcidHandler.inc.php` on 3.3) assigns `sendSubmission` true for
  a published work and `sendSubmissionSuccess` from the send's result,
  and its `templates/orcidVerify.tpl` has the same branches. OMP bundles
  no ORCID plugin on 3.4 and 3.3.
- Introduced: `git blame` on the template's `{if $sendSubmission}` and
  on `OrcidHandler::verify()`'s `'sendSubmission' => false` gives
  c79f538c51 (pkp-lib#9771); its `VerifyAuthorWithOrcid` set only
  `sendSubmissionSuccess`. That code moved to `VerifyIdentityWithOrcid`
  in 5fafc6ffbb (pkp-lib#10819) unchanged. c79f538c51 was authored
  2023-10-06 and merged into `main` with PR `pkp/pkp-lib#9818` on
  2024-06-21, the header's date.
- Upstream search: pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/ui-library and
  pkp/orcidProfile, by the line's words and by the class and method
  names in the Cause.
