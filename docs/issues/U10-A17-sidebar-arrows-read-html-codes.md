# Screen readers hear "&quot;" or "&#039;" in the Sidebar arrows of a block named with a quote or apostrophe

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code, not walked)
  - 3.3: OJS, OMP, OPS (code, not walked)
- **Introduced** a direct commit, without a PR or an issue · [43e3855022](https://github.com/pkp/pkp-lib/commit/43e3855022dab1f60a48e062640a7d008e540de3) · 2023-09-15 · Alec Smecher (asmecher); on 3.4 as [85b35c1052](https://github.com/pkp/pkp-lib/commit/85b35c10527dd15f3d1f1dea45a8d80da1c3a1b8) (3.4.0-4), on 3.3 as [f88b5d13e6](https://github.com/pkp/pkp-lib/commit/f88b5d13e6c7bdb581913cdd8d3fc397ae0499e5) (3.3.0-16)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U10 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a17)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Website › Appearance › "Setup" › "Sidebar", a screen
reader names each block's up and down arrows after the block. When the
block's name holds a double quote, an apostrophe or "&", it hears the
HTML code instead of the character: "Avancer la position de Bloc
d&#039;abonnement" for "Bloc d'abonnement", "Increase position of
&quot;Developed By&quot; Block". The block's tick box, whose name
includes the arrows' names (a separate fault), carries the same codes.

The likeliest case needs no setup: a journal or press used in French.
On a new journal "Bloc d'abonnement" and "Bloc "Renseignements"" are on
and listed under "Barre latérale", on a new press "Bloc
d'informations". In English it needs a custom block named with "&"
(read as `&amp;`) or a block plugin a manager turns on, such as
""Developed By" Block". The visible labels are right and the arrows
work.

The names were right until a 2023 change escaped the sidebar labels on
the server (shipped since 3.3.0-16 and 3.4.0-4). The fault is in one
ui-library component, which passes the escaped label to the arrows as
plain text.

## Impact

- **Lost**: nothing is stored or shown wrong; only what a screen reader
  announces carries the codes.
- **Who**: managers (and other roles allowed into Website settings)
  who place sidebar blocks with a screen reader, on a block whose name
  in their interface language has one of those characters; the site
  administrator on the site-wide "Sidebar" list.
- **Way round**: none needed: the rest of the name still tells the
  block apart, and the arrows work.

Low: the task gets done. It would be medium if the codes kept a
listener from telling which block an arrow moves.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). In it no
  sidebar block is placed, and the block plugins that are on are listed
  under "Sidebar". Steps 5–7 rely on two of them, on by default: on OJS
  "Subscription Block" (in French "Bloc d'abonnement"), on OMP
  "Information Block" ("Bloc d'informations"). ""Developed By" Block"
  is off; step 2 turns it on.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements
  › Accessibility › "Computed Properties" › "Name").

In English:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Website", choose the tab "Plugins", and under
   "Block Plugins" tick ""Developed By" Block".
3. Reload the page, choose "Appearance" › "Setup" and scroll to
   "Sidebar".
4. Read the names of the up and down arrows, and of the tick box, in
   the row ""Developed By" Block".

In French (OJS and OMP; OPS has no default block with such a name in
French):

5. Open the initials menu at the top right and choose "français".
   The same page opens in French.
6. Choose "Apparence" › "Configuration" and scroll to "Barre
   latérale".
7. Read the names of the up and down arrows in the row "Bloc
   d'abonnement" (OJS) or "Bloc d'informations" (OMP).

**Expected.** The arrows are named after the block as its row shows
it: "Increase position of "Developed By" Block" and "Decrease position
of "Developed By" Block"; "Avancer la position de Bloc d'abonnement"
and "Reculer la position de Bloc d'abonnement". The tick box is named
""Developed By" Block" (today it also holds the arrows' names, which is
U10 A3; those names then show the quote too).

**Observed.** The same on the three apps:

- Step 4: the row reads ""Developed By" Block". Its arrows are named
  `Increase position of &quot;Developed By&quot; Block` and
  `Decrease position of &quot;Developed By&quot; Block`, and its box
  `"Developed By" Block Increase position of &quot;Developed By&quot;
  Block Decrease position of &quot;Developed By&quot; Block` (that it
  holds the arrows' names at all is
  [U10 A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A3-appearance-ordering-arrows-misnamed.md)).
- Step 7, OJS: the row reads "Bloc d'abonnement"; its arrows are named
  `Avancer la position de Bloc d&#039;abonnement` and `Reculer la
  position de Bloc d&#039;abonnement`. OMP: the row reads "Bloc
  d'informations"; its arrows are named `Avancer la position de Bloc
  d&#039;informations` and `Reculer la position de Bloc
  d&#039;informations`.

## Cause

`lib/ui-library/src/components/Form/fields/FieldOptions.vue` treats an
option's `label` as HTML: it prints it with `v-strip-unsafe-html`
(line 80). Further down, after the label's column, it passes the same
string to the `Orderer` as `:item-title="option.label"` (line 97). `Orderer.vue`
prints the title inside its hidden texts with text interpolation
(`{{ t('common.orderUp', {itemTitle}) }}`), which sets the text as it
is, so an entity in the label is read as its literal characters.

The sidebar labels hold entities because pkp-lib escapes them for the
HTML print: `PKPAppearanceSetupForm` (line 55) and
`PKPSiteAppearanceForm` (line 52) send
`htmlspecialchars($plugin->getDisplayName())`. On PHP 8.1 and later
that turns `"` into `&quot;`, `'` into `&#039;` and `&` into `&amp;`.
The escape is right for the visible label. The `Orderer` line is the
one that goes wrong: it has passed the label since the first forms
implementation (`pkp/pkp-lib#3594`, 2018), and it turned wrong when
43e3855022 ("Add escaping to field labels", 2023-09-15) escaped the
sidebar labels and four other forms' labels, so that they show as
typed when printed as HTML.

Reach:

- Settings › Website › Appearance › "Setup" › "Sidebar" (walked). Every
  block whose name has `"`, `'` or `&` in the manager's language is hit:
  ""Developed By" Block" and ""Make a Submission" Block" in English;
  OJS's "Bloc "Renseignements"" and, on OJS and OMP, "Bloc "Faire une
  soumission"" in French (read in the code); and a custom block whose
  name keeps an "&" (`&amp;`, seen on 2026-10-05, not walked today).
- Administration › Site Settings › Appearance › "Sidebar"
  (`PKPSiteAppearanceForm`, the same escape; read in the code: the tab
  shows only on a site with more than one journal, press or server).
- The "Editorial Masthead" list is the only other orderable
  `FieldOptions`. Its labels are the roles' names, sent unescaped
  (`PKPAppearanceMastheadForm`), so a role named with "&" keeps its
  arrows' names (read in the code).
- The other `FieldOptions` labels 43e3855022 escaped, announcement types
  (`PKPAnnouncementForm`) and file types (`PKPSubmissionFileForm`), are
  not orderable and print only as HTML: not hit (read in the code).
- A related fault of the same commit, already reported as
  [U60 A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U60-A12-site-redirect-list-name-html-codes.md):
  43e3855022 also escaped the theme, payment method and currency names,
  which feed `FieldSelect` lists. `SelectInput.vue` (line 20) prints a
  label as text, so those names show `&quot;`, `&#039;` or `&amp;` on
  screen; the French "Currency" list shows `Florin d&#039;Aruba` (seen
  in U60 A12's walk, 2026-10-04; code read again today). Its fix drops
  the escape from those lists and leaves this one's.
- The same mistake in the Highlights list (`HighlightsListPanel.vue`
  passes a rich-text title to its `Orderer`) is reported on its own:
  [U11 A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U11-A3-highlights-list-title-html-codes.md).
  The Contributors and Catalog lists pass plain-text names (read in the
  code).

## Proposed fix

Recommended (a proposal; the team decides): give the `Orderer` the
label as plain text, in `FieldOptions.vue`, the component that knows its
labels are HTML
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sidebar-arrows-read-html-codes/fix.diff),
in `lib/ui-library`):

```diff
 					<Orderer
 						v-if="isOrderable"
 						:item-id="option.value"
-						:item-title="option.label"
+						:item-title="optionTitle(option.label)"
…
 	methods: {
+		optionTitle(label) {
+			return new DOMParser()
+				.parseFromString(label ?? '', 'text/html')
+				.body.textContent.trim();
+		},
```

`DOMParser` reads the label's text without putting it on the page
(the parsed document is inert). The `Orderer` then prints that text as
it prints every other caller's title. The server's escape stays for
the visible label. This is the fix proposed for the Highlights list
(U11 A3).

Tried on `main` on the three apps: the arrows are named "Increase
position of "Developed By" Block" and "Avancer la position de Bloc
d'abonnement" (OJS) or "Bloc d'informations" (OMP), and the boxes'
names carry the same characters. With the fix in and out alike, the
"Web Feed Plugin" row in "Sidebar" keeps its names, the up arrow of
"Language Toggle Block" still moves it above "Web Feed Plugin", and
the first role in "Editorial Masthead" keeps the names it has today.

**Alternatives**

- Drop the `htmlspecialchars()` in the two pkp-lib forms: the arrows'
  names come out right, but the visible label is printed as HTML, so a
  name holding "<" or a tag would no longer show as typed. The escape
  is there for that.
- Print the title as HTML inside `Orderer.vue`: changes every caller,
  and the Contributors and Catalog lists pass plain text, which would
  then be read as markup.

**What goes with it**

- No data, API or plugin hook change.
- 3.5 has the same code at lines 79 and 85, and the diff applies there
  with an offset (checked with `patch --dry-run`, not tried on screen).
  3.4 and 3.3 pass `:itemTitle="option.label"` to `<orderer>` in the
  same way; the same method fits there.
- Guard: a ui-library unit test that mounts an orderable `FieldOptions`
  with a label holding `&quot;` and reads the arrows' text, or the e2e
  check here (spec U10).

Small: one method and one binding in one ui-library component.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sidebar-arrows-read-html-codes/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps as `dbarnes` on
  PKP's default dataset (pkp/datasets eaf024c5, 2026-10-18, for `main`
  and `stable-3_5_0`) and reads each name from Chromium's accessibility
  tree (CDP `Accessibility.getPartialAXTree`). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sidebar-arrows-read-html-codes/walk.js`.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database):
  - main: OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4; lib/pkp
    042726ebf6 and lib/ui-library 99abe252 in all three.
  - 3.5: OJS 007c2cd0d6, OMP 2d575f250, OPS e737a9e465; lib/pkp
    092ec34b0f and lib/ui-library 2576e00a in all three. The same Steps
    on the same screens show the same names: `&quot;` on the three apps,
    `&#039;` in "Bloc d'abonnement" (OJS) and "Bloc d'informations"
    (OMP).
- Code reads:
  - main: `FieldOptions.vue` lines 78–100, `Orderer.vue` lines 9 and
    15; `PKPAppearanceSetupForm` line 55, `PKPSiteAppearanceForm` line
    52, `PKPAppearanceMastheadForm` lines 44–48, `SelectInput.vue` line
    20. Blame passes through c2aa1feb (a lint rename) to 7496b3c2 for
    the binding, and through 6882fa48c8 (a loop rewrite) to 43e3855022
    for the escape.
  - 3.4 (ui-library ee684b34; pkp-lib a71d6bd2ca; OJS 0012bd1022, OMP
    e30fa7e38, OPS 0f1e21a117) and 3.3 (ui-library 96959f9e; pkp-lib
    5e84acd11b; OJS d7d9dd14ec, OMP 8e72fc883, OPS c5532e2161):
    `FieldOptions.vue` prints the label with `v-strip-unsafe-html` and
    passes it to `<orderer>` as `:itemTitle`; `Orderer.vue` prints it
    with `{{ __('common.orderUp', {itemTitle}) }}`; both appearance
    forms send `htmlspecialchars($plugin->getDisplayName())`. On an
    install running PHP older than 8.1 (3.3 supports it),
    `htmlspecialchars()` leaves `'` alone, so there only `"` and `&`
    show as codes.
- Searched: pkp/pkp-lib, pkp/ui-library and pkp/ojs for "Increase
  position of", sidebar block names with quotes or `&quot;`, "Developed
  By" Block, `Orderer` `itemTitle`, `FieldOptions` label escaping,
  `htmlspecialchars` `getDisplayName`, screen reader with the sidebar
  arrows. `pkp/pkp-lib#10529` (closed) is the order bug whose fix
  rewrote the loop, not this fault.
- Not driven: a real screen reader; the site-wide "Sidebar" list; a
  custom block named with "&" (an earlier walk on 2026-10-05 read
  `&amp;` in its arrows' names); the French "Bloc "Renseignements"" and
  "Bloc "Faire une soumission"" rows' arrows; 3.4 and 3.3; MySQL.
