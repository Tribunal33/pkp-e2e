# A book file for sale shows its price twice, or no price in a format with several files

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced**
  - the doubled price: commit for `pkp/pkp-lib#5453` · [c31969665](https://github.com/pkp/omp/commit/c31969665439ae7282380d9a6d4c83d34f227bbf) · 2020-01-30 · Alec Smecher (asmecher)
  - the missing price: `pkp/omp#283` for `pkp/pkp-lib#1428` · [25f2ea793](https://github.com/pkp/omp/commit/25f2ea7936832f74df192a01f8fb5c545e7e667e) · 2016-05-06 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a7), [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a press's book page, the link of a file for sale is worded wrongly.
A format with one listed file, which is what a press usually has,
shows the format's name with the price twice: "25.00 Purchase PDF
(25.00 USD)". A format with several listed files, in the side column
or as several files of one chapter in the table of contents, shows
each file's name and no price and no "Purchase".

In the second case a reader cannot tell a file for sale from a free
one. A signed-out reader who presses it gets the Login page, which
says nothing about a purchase. A signed-in reader gets the payment
page, which states the fee before anything is paid.

It needs a press that sells files: a currency under Settings ›
Distribution › "Payments" and a file set to "Direct Sales".

## Impact

- **Lost.** Nothing: the purchase goes on from the link either way.
- **Who.** Every reader of a book or chapter page that lists a file
  for sale, on a press with a currency.
- **Way round.** None needed.

Low: the wording is wrong and the purchase still gets done. It would
be medium if the payment page did not state the fee before payment.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published. Its format "PDF" holds six free files:
  one for each of four chapters ("chapter1.pdf" to "chapter4.pdf") and
  two that belong to no chapter.
- The dataset has no currency and no file for sale; steps 1 to 4 set
  them.

Setting a currency and two prices:

1. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque u69r5" in
   "Manual Payment Instructions" and press "Save".
2. Open the book's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`)
   and, under "Publication", "Publication Formats".
3. In the row of "chapter1.pdf", press "Open Access". In "Set Terms
   for Downloading" choose "Direct Sales", type 25.00 under "Price
   (USD)" and press "Save". A published book's file terms can be
   changed without unpublishing it.
4. Do the same in the row of "Segmentation of Vascular Ultrasound
   Imag.pdf".

Reading the book's page:

5. Sign out. Open "Catalog" and press the book's title
   (`/index.php/publicknowledge/en/catalog/book/14`).
6. Read the link under "Chapter 1: Mind Control—Internal or
   External?", and the two links under "PDF" in the side column.
7. Press the side column's link "Segmentation of Vascular Ultrasound
   Imag.pdf". Then sign in as `aclark`, open the book's page and press
   it again.

**Expected.** Chapter 1's link reads "Purchase PDF (25.00 USD)", the
price once.

In the side column the row of the file at 25.00 shows its price and
"Purchase". With the proposed fix the row reads the name as text and
then the link with the name again:

```
Segmentation of Vascular Ultrasound Imag.pdf   Purchase Segmentation of Vascular Ultrasound Imag.pdf (25.00 USD)
```

The other wording, "Segmentation of Vascular Ultrasound Imag.pdf" then
a link "Purchase PDF (25.00 USD)", is the first alternative under
Proposed fix. Which of the two the row should read is a question for
the team.

**Observed.** Chapter 1's link reads:

```
25.00 Purchase PDF (25.00 USD)
```

The side column lists, under "PDF", each file's name as text followed
by a link that reads the name again:

```
Segmentation of Vascular Ultrasound Imag.pdf   Segmentation of Vascular Ultrasound Imag.pdf
The Canadian Nutrient File: Nutrient Val.pdf   The Canadian Nutrient File: Nutrient Val.pdf
```

The first is for sale and the second is free, and the two read alike.
At step 7 the first link leads a signed-out visitor to "Login", a page
with no word about a purchase or a price, and `aclark` to "Manual Fee Payment" with "Title" "Segmentation of
Vascular Ultrasound Imag.pdf" and "Fee" "25.00 (USD)".

The free files are worded as they should be: chapters 2 to 4 each show
"PDF".

## Cause

OMP's `templates/frontend/components/downloadLink.tpl` writes the text
of every file link on the book page. Lines 28 to 36 choose it, and
both branches go wrong for a file with a price.

With `$useFilename` unset (the link names the format), line 31 prints
`{$downloadFile->getDirectSalesPrice()}` right after the `{if}`, and
line 32 then prints `payment.directSales.purchase`, "Purchase {$format}
({$amount} {$currency})", which holds the amount already. The bare
price came in with c31969665, which moved the template from the old
currency object (`$currency->format(…)`, `getCodeAlpha()`) to the ISO
codes library and added `&& $currency` to the condition. Before it the
link read the sentence alone.

With `$useFilename` set (line 28), the template prints the file's name
and never reaches the price check. 25f2ea793 wrote the template that
way when it gathered the book page's link code into this one file. The
code it replaced printed "Purchase {format} ({amount} {currency})" for
a priced file in the several-file list too.

Reach:

- **The side column, a format with one listed file** (code): the link
  through `publicationFormats.tpl` line 40, without `useFilename`: the
  price twice.
- **The side column, a format with several listed files** (on screen):
  `publicationFormats.tpl` line 58 passes `useFilename=true`: no price.
- **The table of contents** (on screen for one file):
  `monograph_full.tpl` line 219 sets `useFilename` when a chapter holds
  several files of one format: the price twice for one file, no price
  for several (code).
- **A chapter's own page** (code): `chapter.tpl` lists the chapter's
  files through `publicationFormats.tpl`, so both forms show there.
- **An older version's page** (code): the same templates.
- **A press with no currency** (on screen): the condition fails and a
  priced file reads as a free one, in both forms. With no currency
  set, a priced file is shown as free on purpose, and the fix leaves
  that as it is.
- **OJS and OPS** (code): neither has the template or files for sale
  on a format.

## Proposed fix

Choose the name first, then word the link once for both forms: the
purchase sentence around the name for a file with a price, the name
alone otherwise
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/fix.diff)):

```diff
--- a/templates/frontend/components/downloadLink.tpl
+++ b/templates/frontend/components/downloadLink.tpl
@@ -23,15 +23,17 @@
 	{capture assign=downloadUrl}{url op="view" path=$monograph->getBestId()|to_array:"version":$publication->getId():$publicationFormatId:$downloadFile->getBestId()}{/capture}
 {/if}
 
-{* Display the download link *}
+{* Display the download link: the format's name, or the file's name where
+   the format lists several files; a file for sale says so, with its price *}
+{if $useFilename}
+	{assign var=linkName value=$downloadFile->getLocalizedData('name')}
+{else}
+	{assign var=linkName value=$publicationFormat->getLocalizedName()}
+{/if}
 <a href="{$downloadUrl}" class="cmp_download_link">
-	{if $useFilename}
-		{$downloadFile->getLocalizedData('name')}
+	{if $downloadFile->getDirectSalesPrice() && $currency}
+		{translate key="payment.directSales.purchase" format=$linkName amount=$downloadFile->getDirectSalesPrice() currency=$currency->getLetterCode()}
 	{else}
-		{if $downloadFile->getDirectSalesPrice() && $currency}{$downloadFile->getDirectSalesPrice()}
-			{translate key="payment.directSales.purchase" format=$publicationFormat->getLocalizedName() amount=$downloadFile->getDirectSalesPrice() currency=$currency->getLetterCode()}
-		{else}
-			{$publicationFormat->getLocalizedName()}
-		{/if}
+		{$linkName}
 	{/if}
 </a>
```

The fix keeps what c31969665 was for, the ISO codes library's letter
code, and what 25f2ea793 was for, the file's name in a several-file
list.

Tried on OMP `main`: chapter 1's link read "Purchase PDF (25.00 USD)"
and the side column's "Purchase Segmentation of Vascular Ultrasound
Imag.pdf (25.00 USD)". The free files' links stayed "PDF" and "The
Canadian Nutrient File: Nutrient Val.pdf", and the priced link still
led to Login and to the payment page. On a press with no currency
every link read the format's or the file's name alone, with the fix
and without it.

- **Alternatives.**
  - In a several-file list, wording the priced link "Purchase PDF
    (25.00 USD)", with the format's name, as it read before 25f2ea793.
    In the side column the row then reads the file's name as text and
    "Purchase PDF (25.00 USD)" as the link, without the name twice. In
    the table of contents nothing stands before the link, so a
    chapter's several priced files would all read "Purchase PDF (25.00
    USD)". The proposed fix keeps the file's name for that reason, and
    because the free files' links in the same list read the file's
    name.
  - Removing the bare price on line 31 alone fixes the doubled price
    and leaves the several-file list without one.
- **What goes with it.**
  - No data is involved, and no API or hook.
  - A theme that overrides `downloadLink.tpl` keeps its own wording.
  - Five translations of `payment.directSales.purchase` have no
    `{$format}`: `fr_CA`, `fr`, `ca`, `el` and `it` (the French
    reads "Achat ({$amount} {$currency})"). Today a chapter's several priced files each show
    their file name there. After the fix each would read "Achat (25.00
    USD)" with no name, so they could not be told apart; in the side
    column the name still stands as text before the link.
    [U69-A15-omp-french-book-page-raw-keys.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A15-omp-french-book-page-raw-keys.md)
    proposes "Achat {$format} (…)" for the two French files. `ca`,
    `el` and `it` need the same placeholder, and this diff does not
    touch them: whether they are edited with this fix or through the
    translation process is a question for the team.
  - The same lines are in 3.5, 3.4 and 3.3, so the diff applies there
    as written.
  - The guard is an e2e check of both link forms on a press with a
    currency (spec U69, a **Planned** item).

Small: one block of one template, no data and no caller to change.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/walk.js),
  with its helpers in `lib.js` beside it. Run it on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `WALK=neighbour` in
  front leaves out step 1, for the press with no currency.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/fix.diff omp`,
  the walk and the neighbour walk, then reverted. The neighbour walk
  also ran without the fix.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets 92050d9 (2026-10-01).
- Tips: OMP `main` 3b0ecf794, `stable-3_5_0` b24879c3d, `stable-3_4_0`
  0aec65441, `stable-3_3_0` 8e72fc883.
- Code reads:
  - `downloadLink.tpl` on each branch: the link block is the same on
    all four. `stable-3_3_0` has no `publicationFormats.tpl`; its
    `monograph_full.tpl` includes `downloadLink.tpl` itself, at line
    371 for a single file and at line 389 with `useFilename=true`.
  - The three includes of `downloadLink.tpl` on `main`
    (`publicationFormats.tpl` lines 40 and 58, `monograph_full.tpl`
    line 219) and `chapter.tpl`'s include of `publicationFormats.tpl`.
  - `git log -L31,31` on the template for the bare price, and
    25f2ea793's diff of `monograph_full.tpl` for the wording it
    replaced. c31969665 has no pull request.
  - `payment.directSales.purchase` in each `locale/*/locale.po`.
- Not driven: the wording in French and the other four languages (a
  read of the `locale.po` files).
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/omp and pkp/ui-library
  for the purchase link, its price, direct sales, `downloadLink.tpl`,
  `getDirectSalesPrice` and `payment.directSales.purchase`.
