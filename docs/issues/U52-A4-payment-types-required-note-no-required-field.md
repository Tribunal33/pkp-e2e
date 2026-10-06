# "Payment Types" says required fields are marked with an asterisk, but no field is marked or required

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#1816`, no PR · [6d3fa52e52](https://github.com/pkp/ojs/commit/6d3fa52e5264a2e45e5b51453c1a93d8813a6076) · 2017-09-28 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Under "Save", the "Payment Types" tab of the journal's "Payments" page
reads "Required fields are marked with an asterisk: *". No field on the
tab carries an asterisk, and none is required: an empty fee box turns
that fee off, by design, so the form rightly saves with every box empty.

The line only sends the journal manager looking for a required field
that does not exist.

## Impact

- **Lost**: nothing.
- **Who**: journal managers (and subscription managers) on Payments ›
  "Payment Types", on every journal that takes payments.
- **Way round**: none needed.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Payments are off there, so
  step 2 turns them on.

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Payments". Tick "Enable", choose "US
   Dollar" under "Currency" and "Manual Fee Payment" under "Payment
   Plugins", type any text in "Manual Payment Instructions" and press
   "Save".
3. Reload the page, press "Payments" in the side menu, then the "Payment
   Types" tab. Read the field labels and the line under "Save".
4. Leave the four fee text boxes empty and the "Only Restrict Access to
   PDF version of issues and articles" checkbox unticked, and press
   "Save".

**Expected**: no required-fields line, since no field is required.

**Observed**: under "Save" the tab reads "Required fields are marked
with an asterisk: *". The labels "Article Processing Charge", "Purchase
Issue", "Purchase Article", "Only Restrict Access to PDF version of
issues and articles" and "Association Membership" carry no asterisk, and
none of the fields is marked required. Step 4 answers "Your changes have
been saved."

Control: the "Subscription Policies" tab of the same page shows the same
line, and there "Name", "Email address" and "Mailing Address" carry the
asterisk.

## Cause

`templates/payments/paymentTypesForm.tpl` ends with the required-fields
note after its buttons:

```smarty
	{fbvFormButtons hideCancel=true submitText="common.save"}
	<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
```

None of the template's `fbvElement`s passes `required=true`, and
`classes/subscription/form/PaymentTypesForm.php` adds no required check: each fee has a
`FormValidatorCustom` of type `optional` (a number of 0 or more, when
given), plus a CSRF check. The template was written in the same shape
as the "Subscription Policies" form beside it, whose fields are
required.

Reach:

- The other forms of the "Payments" page that carry the note all have
  required fields marked with the asterisk: "Subscription Policies",
  "Create New Subscription Type", and the individual and institutional
  subscription forms (on screen for the first two, code for the rest).
- A search of OJS's and lib/pkp's templates for the note in a template
  that marks no field required finds these other forms, each then read
  with its includes and its form class (code); the list is complete for
  that search:
  - the same leftover, no required value: the settings forms of the
    Announcement Feed, Google Analytics, Web Feed and OAI JATS plugins;
    the user's "Roles", "Public" profile and notification settings
    forms; and the reviewer cancel, unassign and reinstate forms;
  - not the same fault, since a value is needed though no field is
    marked: "Add Participant" (`AddParticipantForm` requires a role) and
    the Native XML import (the file to import);
  - not the same fault, since an included template marks required
    fields: the user details form and the registration page; the
    reviewer's step 3 has the note commented out;
  - the PubMed and DOAJ settings forms, in
    [U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS5-pubmed-doaj-settings-cancel-does-nothing.md).

## Proposed fix

Drop the note from the template
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-required-note-no-required-field/fix.diff)):

```diff
 	{fbvFormButtons hideCancel=true submitText="common.save"}
-	<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
 </form>
```

This is how the code base handles a legacy form with no required field:
the note is printed by the template, form by form, and forms without
required fields leave it out (OJS's issue form, the reviewer reminder
and review-edit forms, the user role and disable forms, among others).

Tried on OJS `main`: the tab then showed "Save" with no line under it,
and an empty save still answered "Your changes have been saved."

**Alternatives**:

- Make a fee box required. No fee is required by the product: an empty
  box turns that fee off.
- Have `fbvFormButtons` print the note only when the form has a
  required field. That would fix every form at once, but the helper does
  not know the form's fields, and it is a change to every legacy form.

**What goes with it**:

- Other instances: the fix covers this form only. The forms the Cause
  lists with the same leftover could lose the line in the same way; each
  is a one-line change in its own template, left out here because they
  belong to other screens.
- Backport: the same two lines close the template on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`; the diff applies as written.
- The guard: the spec's scenario that opens "Payment Types" can assert
  the form has no required-fields line.

Small: one line removed from one template, following the forms that
already leave the note out; no code or data changes.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-required-note-no-required-field/walk.js)
  (steps 1 to 4 and the control; helpers in
  `payment-types-promise-fees-on-about/lib.js`), run on an install
  freshly loaded from PKP's default test dataset (pkp/datasets c657990,
  2026-10-01, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/payment-types-required-note-no-required-field/walk.js`.
  Walked on `main` and on `stable-3_5_0`, with the same result on both.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs`, then `walk.js`
  and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-required-note-no-required-field/neighbour.js),
  which read the same with the fix in and out (the note and marked
  fields of "Subscription Policies" and "Create New Subscription Type",
  the refusal of "abc", a valid save).
- Branch tips: OJS `main` 68615b5a32 (lib/pkp 25562b0e1a); OJS
  `stable-3_5_0` 3517e640f2 (lib/pkp b1981810da); OJS `stable-3_4_0`
  75cc2d488b (lib/pkp 32b0f4b4af); OJS `stable-3_3_0` ac77c9fb35
  (lib/pkp f6ab331645).
- Code reads: on `main`, `paymentTypesForm.tpl`, `PaymentTypesForm`,
  `PaymentsHandler`, the other `templates/payments/*Form.tpl`, and the
  search the Cause describes: templates holding `common.requiredField`
  and no other `required`, each hit then read with its includes and its
  form class. On `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`: the same
  template, ending with the same note, and the same
  `common.requiredField` string.
- Introduced: `git log --follow` on `paymentTypesForm.tpl` reaches
  6d3fa52e52, which created the template with the note, through two
  moves (d106e9eed2 and 37de9bf480, `pkp/pkp-lib#2964`).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  for "Required fields are marked", "payment types required asterisk",
  `paymentTypesForm`. `pkp/pkp-lib#9503` and `pkp/pkp-lib#9370` are
  about forms that have required fields; neither covers this one.
