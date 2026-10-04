# Preprint server emails: "Insert Content" describes the server's initials with a raw code

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; OPS offers no initials placeholder)
  - 3.3: none (code; no placeholder list)
- **Introduced** `pkp/pkp-lib#12164` for `pkp/pkp-lib#10962` · [9020247d95](https://github.com/pkp/pkp-lib/commit/9020247d95bb40d02799df897e6c92ba1c13e92b) · 2025-12-19 · Hafsa Naeem (Hafsa-Naeem); on 3.5 earlier, `pkp/pkp-lib#11778` with `pkp/ops#1133` · [950fe1fa28](https://github.com/pkp/pkp-lib/commit/950fe1fa289323325005dd42d7319567d3705f87) · 2025-11-10
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U34 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U34-editorial-decision-recording.md#ops2) · spec U56 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#ops1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, every "Insert Content" window in an email lists
the server's initials with the description
"##emailTemplate.variable.context.contextAcronym##" instead of a
sentence. A journal reads "The journal's initials", a press "The
press's initials".

The row's "Insert" button still works, and every other row reads as a
sentence. The raw code shows in a decision's email (such as "Decline
Submission"), in the server's "Signature" under Settings › Workflow ›
"Emails", and in the body of "Edit Template" on the Emails page.

It shows in every interface language, because no language of OPS has
the sentence. Released servers have shown it since OPS 3.5.0-2.

## Impact

- **Lost**: nothing. The placeholder inserts and fills in as it should.
- **Who**: managers and moderators of a preprint server, when they write
  an email, a template or the server's signature.
- **Way round**: none needed. In "Edit Template" and the "Signature",
  the row shows the placeholder's name, `{$contextAcronym}`. In a
  decision's email it shows the server's own initials ("JPKPKP")
  instead of the name, so the row's meaning can be read from either.

Low: no work or data is lost, and the only fault is a raw translation
key in a list.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS. The steps save nothing.

In a decision's email:

1. Sign in as `dbarnes`.
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. Press "Decline Submission".
4. On "Notify Authors", press "Insert Content" in the message's toolbar.
5. Read the row whose value is "JPKPKP", the server's initials. Close
   the window.

In the server's signature:

6. Open Settings › Workflow › "Emails"
   (`/index.php/publicknowledge/en/management/settings/workflow#emails`).
7. Under "Signature", press "Insert Content" and read the
   `{$contextAcronym}` row. Close the window.

In an email template:

8. Open Settings › "Emails"
   (`/index.php/publicknowledge/en/management/settings/manageEmails`).
9. Search "Submission Declined", press "Edit" on its row, then "Edit" on
   the "Submission Declined" template in the window that opens.
10. In the body's toolbar, press "Insert Content" and read the
    `{$contextAcronym}` row.

**Expected**: each window describes the row in words, "The server's
initials", as the rows around it do ("The server's name", "The URL to
the server's homepage").

**Observed**: the row's description is the raw code in all three
windows. In the decision's email (step 5) the row reads:

```
JPKPKP
##emailTemplate.variable.context.contextAcronym##
```

In the "Signature" (step 7) and "Edit Template" (step 10) it reads:

```
{$contextAcronym}
##emailTemplate.variable.context.contextAcronym##
```

Control: the same steps on OJS (submission 4, "Computer Skill
Requirements for New and Existing Teachers…") and on OMP (submission
10, "Lost Tracks: Buffalo National Park, 1909-1939") read "The
journal's initials" and "The press's initials". On both, step 9 opens
the email "Submission Declined (Pre-Review)" and its template of the
same name. Their search also lists "Submission Declined", the email
for a decline after review.

## Cause

`PKP\mail\variables\ContextEmailVariable::descriptions()`
(`lib/pkp/classes/mail/variables/ContextEmailVariable.php`, line 64)
describes the placeholder with
`__('emailTemplate.variable.context.contextAcronym')`. lib/pkp's locale
files do not define the key. Each app describes the context's
placeholders in its own words ("journal", "press", "server"), and OJS's
and OMP's `locale/en/manager.po` define this one. OPS's
`locale/en/manager.po` defines all its siblings (`contextName`,
`contextUrl`, `contactName`, `contextSignature`, `contactEmail`,
`mailingAddress`) but not this one.

No language of OPS or lib/pkp defines the key (none of OPS's 18 locale
folders). `Locale::translate()` looks the key up in the interface
language's files only, with no fallback to English, and prints a key it
cannot find as `##key##`. So every language shows the raw code.

OJS and OMP defined the key before OPS had an initials placeholder.
Until 3.5, each had its own placeholder in its own `ContextEmailVariable`
subclass (`journalAcronym`, `pressAcronym`), described by this key in
its own locale file. OPS had no such placeholder.

`pkp/pkp-lib#10962` reported that the shared `{$contextAcronym}` in the
copyediting email's subject was never filled in. Its fix moved the
placeholder into lib/pkp's class as `contextAcronym`, for every app. On
3.5 that was 950fe1fa28 (`pkp/pkp-lib#11778`), with two OPS commits in
`pkp/ops#1133`:
[c3cc15ea14](https://github.com/pkp/ops/commit/c3cc15ea1460e9b22b37924a21b2861dcac47854)
declared the constant in OPS's subclass, and
[92b55ee3db](https://github.com/pkp/ops/commit/92b55ee3db0039d42a097b485a505154e48c523d)
("Update context email variables in OPS") removed it again once lib/pkp
held it. Neither added the description to OPS's locale file. Main
received the same change later, in 9020247d95.

Reach:

- All three windows were walked. The other emails' "Insert Content"
  windows read the same `descriptions()` (code).
- The REST API carries the same text: a mailable's read lists the
  descriptions (`PKP\mail\Repository::summarizeMailable()`,
  `dataDescriptions`), and so does the task templates' variable list
  (`PKPEditTaskTemplateController::getVariables()`, whose
  `TemplateVariables` mailable takes the context) (code).
- Every other description key used in the mail code resolves in all
  three apps. A search of every `__('emailTemplate.variable.…')` in
  `lib/pkp/classes` and each app's `classes` on `main` found 107 keys on
  OJS, 91 on OMP and 91 on OPS. This is the only one missing, and only
  on OPS.
- Neighbour:
  [U59-OPS1-preprint-server-path-zero-raw-code.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U59-OPS1-preprint-server-path-zero-raw-code.md)
  is the same kind of fault, a lib/pkp key that only OJS and OMP
  define, but with another key, file and change.

## Proposed fix

Give OPS the description in `locale/en/manager.po`, beside its sibling
keys and worded as they are, as OJS and OMP do:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-initials-placeholder-raw-key/fix.diff).

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -554,6 +554,9 @@
 msgid "emailTemplate.variable.context.contactName"
 msgstr "The name of the server's primary contact"
 
+msgid "emailTemplate.variable.context.contextAcronym"
+msgstr "The server's initials"
+
 msgid "emailTemplate.variable.context.contextSignature"
 msgstr "The server's email signature for automated emails"
 
```

Tried on `main`, OPS. All three windows then read "The server's
initials". The other rows of each window read the same with and
without the fix, and "Insert" on the row still puts "JPKPKP" into the
decision's message.

**Alternatives**:

- One app-neutral sentence in lib/pkp's `manager.po`. It breaks the
  pattern every sibling key follows and would read differently from the
  rows around it.
- A fallback in `descriptions()` for an untranslated key. It hides the
  next missing key instead of fixing this one.

**What goes with it**:

- Translations: the fix covers English. OPS's other languages show the
  raw code until Weblate supplies the sentence. OJS has the key in 62 of
  its 78 locale folders and OMP in 18 of 34. Translators can copy those
  sentences and change the word.
- No data repair. An API client sees only the description's text change.
- Backport: the same hunk applies to 3.5's `locale/en/manager.po`
  (checked with `patch --dry-run`). 3.4 and 3.3 need nothing.
- Test: a lib/pkp unit test that runs every `Variable` subclass's
  `descriptions()` in each app and refuses a `##` result would have
  caught this and the next missing key.

Small: one message in one locale file, with no data repair, tried.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-initials-placeholder-raw-key/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-initials-placeholder-raw-key/lib.js))
  takes steps 1–10 on OJS, OMP and OPS and records every row of each
  window. Its `neighbour` mode is the check of the fix: it opens the
  decision's window alone and presses "Insert" on the initials row. Each
  run starts from an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-server-initials-placeholder-raw-key/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The walks ran in Chromium on PostgreSQL, datasets pkp/datasets 566bb1f
  (2026-10-03). On `main` and 3.5 the walks saw the same thing. No
  request failed and no page script failed. The fix was tried on
  `main`, OPS: the steps and the "Insert" check with the fix in, and
  the "Insert" check again with it out. On OJS and OMP the script
  searches step 9's full email name, "Submission Declined
  (Pre-Review)".
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib 771474347e (OJS)
  and cf3f984335 (OMP, OPS). 3.4: OJS d68934d0d1, OMP 0aec65441, OPS
  acd8ae704b; pkp-lib 767353f4fe. 3.3: OPS c5532e2161; pkp-lib
  ac3fa73402.
- Code reads. `main` and 3.5: pkp-lib's
  `classes/mail/variables/ContextEmailVariable.php` (the key at line 64
  on both), `classes/i18n/Locale.php` (`getBundle()`, `translate()`),
  and every locale folder of OPS and its lib/pkp for the key (none
  defines it). 3.4: pkp-lib's `ContextEmailVariable.php` has no
  initials placeholder; OJS's and OMP's own
  `classes/mail/variables/ContextEmailVariable.php` add `journalAcronym`
  and `pressAcronym`; OPS's subclass adds none. 3.3: pkp-lib has no
  `ContextEmailVariable` and its `classes` use no
  `emailTemplate.variable.` key.
- Introduced: `git blame` on line 64 gives 9020247d95 on `main` and
  950fe1fa28 on 3.5, each adding the constant, its value and its
  description. The GitHub API (`commits/<sha>/pulls`) confirms
  `pkp/pkp-lib#12164` for 9020247d95 (merged 2026-01-09),
  `pkp/pkp-lib#11778` for 950fe1fa28 (authored 2025-11-10, merged
  2025-11-28), and `pkp/ops#1133` for c3cc15ea14 and 92b55ee3db (merged
  2025-11-28). Main's OPS-side commit, 03ed15b966, has no PR the API
  returns.
- Released versions: `git tag --contains` gives 3_5_0-2 (2025-11-28) as
  the first tag holding 950fe1fa28 in pkp-lib and 92b55ee3db in OPS;
  3_5_0-1 holds neither.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/ops and pkp/ui-library
  by "contextAcronym", the key, "Insert Content" with "initials",
  "serverAcronym" and `ContextEmailVariable`.
- Not walked: the other emails' "Insert Content" windows on OPS, OPS in
  a language other than English, the task template editor, and the REST
  API's reads.
