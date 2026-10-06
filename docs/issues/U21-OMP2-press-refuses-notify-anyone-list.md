# A press refuses the comma-separated "Notify Anyone" list its own help text asks for

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no "Notify Anyone" box)
- **Introduced** `pkp/pkp-lib#6933` and `pkp/omp#957` for `pkp/pkp-lib#6272` · [85aa827895](https://github.com/pkp/pkp-lib/commit/85aa827895e2b6ab56f57ae39a8fbcffc5e1cefd) · 2021-04-08 · Henrique Ramos (henriqueramos)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#omp2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the workflow settings' Emails screen, the help under the "Notify
Anyone" box reads "Separate multiple email addresses with a comma.
Example: one@example.com,two@example.com". On a press, saving two
addresses that way is refused with "This is not a valid email address.",
and nothing on the screen is saved until the box holds one address. A
journal and a preprint server accept the list.

So a press can copy the submission acknowledgement to only one extra
address, though its own screen says otherwise.

## Impact

- **Lost**: copies of the acknowledgement to a second or third address
  cannot be set up, so they never go out. The manager is told at once.
- **Who**: a press manager who wants the acknowledgement copied to more
  than one address beside the press contact.
- **Way round**: one address, such as a shared mailbox or a mailing
  list, plus "Notify Primary Contact" for the press contact.

Low: the refusal is shown when the manager saves, and one shared address
delivers the copies. It would be medium for a press that cannot set up a
shared address.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OMP; OJS and OPS for the comparison).
  Nothing else.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow and press the "Emails" tab
   (`/index.php/publicknowledge/en/management/settings/workflow#emails`).
3. Under "New Submission", read the help under "Notify Anyone": "A copy
   of the submission acknowledgement email will be sent to any of the
   email addresses entered here. Separate multiple email addresses with a
   comma. Example: one@example.com,two@example.com".
4. Type `one@example.com,two@example.com` into "Notify Anyone".
5. Press the form's "Save".

**Expected**: "Saved", and after a reload "Notify Anyone" holds
`one@example.com,two@example.com`.

**Observed** on the press: the save is refused. Under the box:

```
This is not a valid email address.
```

The form's footer reads "Please correct one error.", a notice says "The
form was not saved because 1 error(s) were encountered. Please correct
these errors and try again.", and after a reload the box is empty. The
request behind it:

```
POST /index.php/publicknowledge/api/v1/contexts/1   (X-Http-Method-Override: PUT)
→ 400
```

The same steps on a journal and a preprint server save the list, and
on the press `one@example.com` alone saves. The refused save keeps every
other change on the Emails screen unsaved too, since the form saves as
one request.

## Cause

The box is meant to hold a comma-separated list: its help text says so,
and `SendSubmissionAcknowledgement` splits the value on commas.

OMP's own `schemas/context.json` declares `copySubmissionAckAddress`
with the validation `["nullable", "email_or_localhost"]`. That rule
treats the whole box as one address. `PKPSchemaService::merge()` lets an
app's property replace pkp-lib's property of the same name whole, so on
a press OMP's declaration is the one in force.

Presses already check each address. `PKPContextService::validate()`
splits the box on commas and checks every part ("One or more of these
email addresses is not valid."), and OMP's `ContextService` inherits it
without change. OMP's whole-box rule is the only extra check, and it is
the one that refuses the list. For `one@example.com,not-an-address` an
unpatched press shows both messages.

The list, its help text and the per-address check came with 85aa827895
(`pkp/pkp-lib#6272`, 2021), which put the property in pkp-lib's schema.
OMP's entry is older (88d8a48125, 2018, `pkp/pkp-lib#3594`), from when
the setting held one address. The change's OMP pull request
(`pkp/omp#957`) left that entry in place, so the press has never accepted
a list. OJS and OPS never declared the property in their own schemas.

Reach:

- The press's Emails tab, on every press (walked).
- A list already stored some other way (the database, an import) would
  still be sent to each address, but the screen would then refuse every
  save of the Emails form until the box is cut to one address (code).
- The same stale schema has a second entry with a symptom of its own:
  OMP's `copySubmissionAckPrimaryContact` drops pkp-lib's
  `"default": false`, so "Notify Primary Contact" arrives with neither
  choice selected on a press (code and the dataset's settings rows).
  Reported apart, since existing presses also need an upgrade step:
  [U56 OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U56-OMP2-press-notify-primary-contact-unselected.md);
  the two OMP schema deletions can go in one pull request.

## Proposed fix

Delete OMP's `copySubmissionAckAddress` entry from `schemas/context.json`.
The fix adds no check: it removes the whole-box rule, and the
per-address check presses already run stays
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-refuses-notify-anyone-list/fix-omp.diff)):

```diff
-		"copySubmissionAckAddress": {
-			"type": "string",
-			"validation": [
-				"nullable",
-				"email_or_localhost"
-			]
-		},
```

With the fix in, the press saved the list and kept it after a reload.
A list with a malformed address (`one@example.com,not-an-address`) was
still refused on the press, with and without the fix, and on the other
two apps.

**Alternatives**

- Make OMP's rule accept lists: two declarations of one rule, which can
  drift apart again.
- Change the help text on presses to say one address: it takes a
  feature away from presses that the other apps have.

**What goes with it**

- No data repair: a stored value that saves today is one valid
  address, and stays valid.
- The "Notify Primary Contact" entry is left out: deleting it changes
  the default for new presses only, so existing presses would also need
  a migration.
- Backport: the same deletion applies to `stable-3_5_0` and
  `stable-3_4_0`.
- A test that saves two addresses in "Notify Anyone" on a press.

Small: one entry deleted from one OMP file.

## Evidence

- The kept script takes the Steps on all three apps, with the
  one-address control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-refuses-notify-anyone-list/walk.js).
  The malformed-list check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-refuses-notify-anyone-list/neighbour.js).
  On an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/press-refuses-notify-anyone-list/walk.js`
- The fix was tried with both scripts on OMP `main`; `neighbour.js` was
  also run without it, on all three apps.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  3.5 shows the same as `main`. Datasets: pkp/datasets 27f1204
  (2026-10-01).
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  18d097d94e, OMP b24879c3d, OPS 3f0919468c (lib/pkp 1fb843f491);
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp
  df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main` and 3.5: the three apps' `schemas/context.json`, pkp-lib's
    `schemas/context.json`, `PKPSchemaService::merge()`,
    `PKPContextService::validate()`,
    `PKPEmailSetupForm::addCopySubmissionAckAddress()` and
    `SendSubmissionAcknowledgement`, `PKPContextController::edit()` (a
    refused validation returns 400 before anything is saved) and OMP's
    `ContextService` (no `validate()` of its own). `pkp/pkp-lib#6933`
    was merged on 2021-04-19 with `pkp/omp#957`, which changed OMP's
    submission form and locale only.
  - 3.4: the same OMP entry and pkp-lib check.
  - 3.3: neither pkp-lib nor OMP has the "Notify Anyone" box (OMP's
    schema entry is there, with no form field).
- Upstream searches (2026-10-01): pkp/pkp-lib and pkp/omp by "Notify
  Anyone" and `copySubmissionAckAddress`. Only the introducing issue
  and pull request matched.
