# A book's "Add Representative" window shows both role lists and refuses a supplier until "Agent" and "Supplier" are clicked

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced; present since at least [781de5cb7](https://github.com/pkp/omp/commit/781de5cb70624836ee2c30285e04a1db6cea9436) (2016-11-02)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens a book's "Marketing" › "Representatives" and presses
"Add Representative". The window opens with "Supplier" chosen but
shows two "Role" lists side by side: the agent roles on the left, the
supplier roles on the right. They choose a supplier role, type a name
and press "OK". The window refuses with "This field is required."
under the agent list and saves nothing.

The supplier saves only after "Agent" and then "Supplier" are clicked,
and nothing on the screen suggests doing that. Editing a supplier
fails the same way: its "Edit" window also shows both lists, so "OK"
is refused even with nothing changed. A supplier saved this way is
stored correctly.

Agents are not affected: clicking "Agent" hides the supplier list.
Representatives matter to presses that send ONIX records to the book
trade, where a book's suppliers and agents are part of each product
record.

## Impact

- **Lost**: nothing; the typed details stay in the open window.
- **Who**: a press that sends ONIX to the trade; whoever keeps its
  books' representatives (press managers and editors, and the series
  editors and assistants assigned to a book), each time they add or
  edit a supplier.
- **Way round**: click "Agent", then "Supplier", then press "OK". The
  "Agent" and "Supplier" choices are in plain view, but neither the
  screen nor the message points to them.

Medium: adding a supplier, the type the window starts on, fails with a
message about a list the user did not mean to fill, and the way round
must be guessed. It would be low if the way round were shown or
obvious; the count of presses that keep representatives for ONIX,
which this report cannot give, decides how much it matters.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OMP.
  Submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production and has no representatives.

Setting up: steps 3 and 4 add an agent first, only so that the
supplier added later is listed without a reload. On an install where
no representative exists yet, the first one added is not listed until
a reload, which is a separate fault.

1. Sign in as `dbarnes`.
2. Open submission 4 and choose "Marketing" › "Representatives" in the
   side menu. "Agents" and "Suppliers" each read "No Items".
3. Press "Add Representative", click "Agent", choose "Sales agent (08)"
   under "Role", type `Beta Agency` in "Name" and press "OK".
4. Reload the page: "Beta Agency" is listed under "Agents".

Adding a supplier:

5. Press "Add Representative".
6. Under "Role", in the right-hand list, choose "Distributor to
   end-customers (12)". Type `Alpha Books` in "Name" and press "OK".
7. Click "Agent", then "Supplier", and press "OK".

Editing it without changes:

8. Press the arrow before "Alpha Books", then "Edit".
9. Press "OK".

**Expected**: at step 5, "Role" shows only the supplier roles, as
"Supplier" is chosen. At step 6 the window closes with "Representative
added.", and "Alpha Books" is listed under "Suppliers". At step 8 the
window shows only the supplier list, on "Distributor to end-customers
(12)", and step 9 closes it with "Representative edited.".

**Observed**: at step 5 the window, headed "Add Representative", has
"Supplier" chosen and shows both lists: the agent list (an empty choice
and four roles) on the left, the supplier list (an empty choice and 16
roles) on the right. At step 6, "This field is required." shows under
the agent list, the window stays open and no request is sent. At step 7
the agent list hides after "Supplier" is clicked, and "OK" saves:
"Representative added.", and "Alpha Books" is listed under "Suppliers"
reading "Distributor to end-customers (12)". At step 8 the "Edit"
window again shows both lists, the agent list on its empty choice, and
step 9 is refused the same way.

Control: at step 3, with "Agent" clicked first, the agent is saved at
once with "Representative added.".

## Cause

`templates/controllers/grid/catalogEntry/form/representativeForm.tpl`
(lines 29 to 32) means to hide the role list of the type not chosen
by giving that `<select>` the class `hidden`. No stylesheet hides a
form `<select>` with that class:

- On `main` and 3.5 the backend's only `.hidden` rule is Tailwind's
  `hidden` utility (`display: none`), compiled from the ui-library
  into `styles/build.css`. It loses to pkp-lib's `.pkp_form select {
  display: block; }` (`styles/form/form.less`), which is more specific.
- On 3.4 and 3.3 there is no `.hidden` rule in any backend stylesheet
  at all.

So both lists show, the agent list first. Both are also
`required="true"`. jQuery validation skips fields that are not
visible, but the agent list is visible, so a supplier's "OK" is
refused for an empty agent role before anything is sent. Clicking a
type runs `RepresentativeFormHandler.radioToggleHandler_()`, which
hides the other list with jQuery's `hide()`, an inline
`display: none`. That is why "Agent" then "Supplier" clears the
refusal. The same handler also runs `parent().removeClass('hidden')`
on each list's wrapper, but the template never puts that class on the
wrapper, so those lines do nothing.

Both lists are also drawn with `selected=$role`, so an existing
representative's other list starts on whatever role shares its code:
an agent at "Exclusive sales agent (05)" shows "Sales agent
(Discontinued)" in the supplier list, and switching it to "Supplier"
offers that role ready chosen.

The form stores only the role of the type chosen
(`RepresentativeForm::execute()`, one `role` column), so a supplier
saved by the way round has its supplier role and nothing else (checked
in the database).

Reach:

- "Add Representative" for a supplier and "Edit" of any representative
  (checked on screen).
- No other `fbvElement` in OMP or its lib/pkp passes `class=…hidden`
  (searched).

## Proposed fix

Hide the list of the type not chosen with an inline `display: none`,
the same style `RepresentativeFormHandler` sets and clears, and start
that list on its empty choice:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/representative-window-refuses-supplier/fix.diff).

```diff
-			{if $isSupplier}{assign var="agentClass" value="hidden"}{/if}
-			{fbvElement type="select" from=$agentRoleCodes selected=$role id="agentRole" … class=$agentClass … required="true"}
-			{if !$isSupplier}{assign var="supplierClass" value="hidden"}{/if}
-			{fbvElement type="select" from=$supplierRoleCodes selected=$role id="supplierRole" … class=$supplierClass … required="true"}
+			{if $isSupplier}
+				{assign var="agentStyle" value="display: none;"}{assign var="agentSelected" value=""}
+				{assign var="supplierStyle" value=""}{assign var="supplierSelected" value=$role}
+			{else}
+				{assign var="agentStyle" value=""}{assign var="agentSelected" value=$role}
+				{assign var="supplierStyle" value="display: none;"}{assign var="supplierSelected" value=""}
+			{/if}
+			{fbvElement type="select" from=$agentRoleCodes selected=$agentSelected id="agentRole" … style=$agentStyle … required="true"}
+			{fbvElement type="select" from=$supplierRoleCodes selected=$supplierSelected id="supplierRole" … style=$supplierStyle … required="true"}
```

`_smartyFBVSelect()` copies an attribute it does not know, such as
`style`, onto the `<select>`. The window then opens in the state a
click on the chosen type leaves it in, and the fix stays in the one
template that draws that state. OMP's own format window hides its
remote URL box the same way (`formatForm.tpl`, `<div id="remote"
style="display:none">`). The fix leaves the handler's dead
`removeClass('hidden')` lines in place, so no JavaScript changes and
the app's `js/pkp.min.js` needs no rebuild; they can go in the same
change if the team prefers.

Tried on `main`. The window opens with only the supplier list, the
supplier saves at the first "OK", and its unchanged "Edit" saves with
"Representative edited.". An agent or a supplier with "Role" on its
empty choice is still refused, under its own list only. An agent's
"Edit" shows only the agent list, with the supplier list hidden on its
empty choice.

**Alternatives**:

- Add a `.pkp_form select.hidden { display: none; }` rule to pkp-lib's
  form styles. The handler would still work, as jQuery 3's `show()`
  overrides a stylesheet's `display: none`. But it is a change to the
  shared stylesheet, in another repo, for one OMP template, and the
  borrowed role in the other list would stay.
- Run the handler's toggle once when the form loads: it fixes the
  display, but the template keeps drawing a state the window never
  shows, and the borrowed role stays.

**What goes with it**:

- Backport: the lines the diff touches are the same on 3.5, 3.4 and
  3.3, and the diff applies to each as written (checked with `patch
  --dry-run`; tried on `main` only).
- No stored data needs repair.
- A test: add a supplier on the "Representatives" page with one "OK".

Small: one template in OMP, following a pattern the app already uses.

## Evidence

- The kept script, which takes steps 1 to 9 on an install freshly
  loaded from the default dataset and records each list's computed
  `display`, its class and style, and the field messages:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js).
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Chromium on PostgreSQL. Datasets: pkp/datasets e8dafbc (2026-10-02).
- Branch tips. `main`: OMP 3b0ecf794, pkp-lib 3dc90c81a6. 3.5: OMP
  9c5e24246, pkp-lib cf3f984335. 3.4: OMP 0aec65441, pkp-lib
  767353f4fe. 3.3: OMP 8e72fc883, pkp-lib ac3fa73402.
- Code reads for 3.4 and 3.3: `representativeForm.tpl` and
  `RepresentativeFormHandler.js` are the same as on `main`;
  `FormBuilderVocabulary::smartyFBVElement()` hands `class` to the
  `<select>` through `FBV_class` and `templates/form/select.tpl`; no
  `.hidden` rule is in pkp-lib's styles or the ui-library's sources
  (git grep); `styles/form/form.less` has the same `.pkp_form select {
  display: block; }`. On 3.5 the four files are identical to `main`.
- Introduced, not traced: the `hidden` assignments date from
  5e0d3c7ff9 (OMP, 2012, Jason Nugent) and the `required="true"` on
  both lists from 781de5cb7 (OMP, 2016, Nate Wright, for
  `pkp/pkp-lib#1772`), which turned the extra list into a refusal.
  Before pkp-lib 6f68fc9819 (2015-08-05, Alec Smecher) form selects had
  no `display` rule, and `styles/lib/tagit.css` held a global
  `.hidden { display: none; }` (added in 622a44e6f0, 2011; the file was
  deleted in dc6e2b9099, 2015-08-07). 6f68fc9819 added
  `.pkp_form select { display: block; }`, which would outrank it.
  Whether tagit.css reached this window then (through `styles/lib.css`)
  was not confirmed, so the lists may have shown since 2012 or since
  2015.
- Upstream: the one related hit, `pkp/pkp-lib#8968` (a new
  representative not listed, closed in 2023 with a fix to
  `CategoryGridHandler`), is another fault of the same page.
- Neighbouring reports on this page:
  [U74-A13-representative-type-change-listed-twice.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A13-representative-type-change-listed-twice.md)
  and, for a refused "Delete",
  [U62-A9-refused-confirmation-window-keeps-spinning.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U62-A9-refused-confirmation-window-keeps-spinning.md).
- MySQL not checked (nothing here depends on the database).
