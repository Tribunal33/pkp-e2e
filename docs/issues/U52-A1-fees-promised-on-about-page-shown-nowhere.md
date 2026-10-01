# "Payment Types" says reader fees and the membership appear in About the Journal, but no page lists them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR, for `pkp/pkp-lib#1816` · [6d3fa52e52](https://github.com/pkp/ojs/commit/6d3fa52e5264a2e45e5b51453c1a93d8813a6076) · 2017-09-28 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#4701` (closed without a fix), covering the membership sentence only
- **Tracked in** spec U52 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager sets the journal's fees on the "Payment Types" tab
of the "Payments" page. The side menu offers that page once payments
are enabled under Settings › Distribution › "Payments". The tab says
that the reader fees ("Purchase Issue", "Purchase Article") "will
appear in About the Journal under Policies, as well as at points where
payment is required". Under "General Fees" it says "The Association
Membership will appear in About the Journal under Policies.". No page
lists either: About the Journal shows only the journal's own text.

Nobody pays an amount they could not see. A reader sees the purchase
fee on the locked link where they pay, and no page offers the
membership at all. What goes wrong is that the manager is misled about
what readers are told. The tab promises nothing about the "Article
Processing Charge".

The proposed fix rewords the two sentences. It does not add a list of
fees.

## Impact

- **Lost:** nothing is stored or charged wrongly. A manager who trusts
  the tab expects About the Journal to list the fees, and so does not
  write them there.
- **Who:** the journal manager of any journal that has payments enabled
  and a reader fee or a membership fee set.
- **Way round:** the manager writes the fees into "About the Journal"
  (Settings › Journal › "Masthead") by hand.

Low: what the tab promises is either shown where the reader pays (the
purchase fees) or not sold on any page (the membership). If the tab
also promised the APC in advance, this would be medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Nothing beyond it: the steps set the fees.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution › "Payments". Tick "Enable", choose
   "US Dollar" in "Currency" and "Manual Fee Payment" in "Payment
   Plugins", type "Pay by bank transfer." in "Manual Payment
   Instructions", and press "Save".
3. Press "Payments" in the side menu, then the "Payment Types" tab.
   Read the sentences under "Reader Fees" and "General Fees".
4. Type 50 in "Article Processing Charge", 7 in "Purchase Issue", 5 in
   "Purchase Article" and 20 in "Association Membership", and press
   "Save".
5. Sign out. On the journal's home page, open "About" › "About the
   Journal".
6. Open "About" › "Submissions".
7. Sign in as `amwandenga` (Author, Reader) and open "About" › "About
   the Journal" again.

**Expected:** what the tab says in step 3: About the Journal lists the
reader fees and the Association Membership with their amounts, under a
"Policies" heading.

**Observed:** step 3 reads:

```
Reader Fees
Selected options, along with their descriptions and fees (which can be edited below), will appear in About the Journal under Policies, as well as at points where payment is required.
General Fees
The Association Membership will appear in About the Journal under Policies.
```

"Save" in step 4 shows "Your changes have been saved." and the four
amounts are there after a reload. In steps 5 and 7, About the Journal
holds the heading "About the Journal" and nothing else: no "Policies",
no fee, no amount, no currency. In step 6, Submissions shows the author
guidelines, the "Articles" section's "Section default policy" and the
privacy statement, and no fee or amount either.

## Cause

OJS `templates/payments/paymentTypesForm.tpl` prints
`manager.payment.readerFeesDescription` and
`manager.payment.generalFeesDescription` (lines 28 and 39) under the
"Reader Fees" and "General Fees" headings. Both English texts
(`locale/en/manager.po`) were written for OJS 2, whose About page had a
"Policies" part that listed the fees.

OJS 3's About the Journal (lib/pkp `templates/frontend/pages/about.tpl`)
prints only the journal's own "About" text. No page template of the
journal reads `publicationFee` or `membershipFee`.

In 2017, [6d3fa52e52](https://github.com/pkp/ojs/commit/6d3fa52e5264a2e45e5b51453c1a93d8813a6076)
(`pkp/pkp-lib#1816`, subscriptions for OJS 3.1) brought the form into
OJS 3 with OJS 2's description keys. The same commit added the public
About › Subscriptions page (`templates/frontend/pages/subscriptions.tpl`,
`AboutHandler::subscriptions()`). That page lists each subscription
type's cost. It does not list the purchase fees or the membership. It
shows only while payments are enabled and set up, and the default
"About" menu has no entry for it (`registry/navigationMenus.xml`), so a
manager has to add one under Navigation Menus.

Reach:

- "At points where payment is required" holds: the locked galley links
  print `purchaseArticleFee` (`article_summary.tpl`,
  `article_details.tpl`) and the full issue's link prints
  `purchaseIssueFee` (`issue_toc.tpl`) (checked in the code).
- The "Author Fees" sentence ("Enter fee amounts below in order to
  enable author processing charges.") promises no page, and no page
  shows the APC before it is requested. That gap is outside what the
  tab promises (checked in the code, and on screen on About the
  Journal and Submissions).
- The translations make the same promise. The French tab reads
  "apparaîtront dans « À propos » de la revue, sous « Politiques »"
  (checked on screen, `fr_CA`).
- OMP and OPS have no "Payment Types" tab (checked in the code).

## Proposed fix

Make the two English texts say what is true. Then mark the translations
fuzzy so translators update them, as
[617cd6db51](https://github.com/pkp/ojs/commit/617cd6db514685015e0b09329681e6f439212364)
did in 2020 when it rewrote the same "General Fees" text.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fees-promised-on-about-page-shown-nowhere/fix.diff)
covers 57 locale files: the English change, plus a `#, fuzzy` line on
the two entries in each translated locale.

```diff
 msgid "manager.payment.generalFeesDescription"
-msgstr "The Association Membership will appear in About the Journal under Policies."
+msgstr "The journal's pages do not offer the Association Membership to readers."
 
 msgid "manager.payment.readerFeesDescription"
-msgstr "Selected options, along with their descriptions and fees (which can be edited below), will appear in About the Journal under Policies, as well as at points where payment is required."
+msgstr "Readers without a subscription will be offered these purchases, with their fees, at the points where payment is required."
```

The reader sentence keeps the part that is true (the fee on the locked
links). It drops the About listing and the "descriptions", which OJS 3
does not have. The membership sentence says what the journal's pages
do: no template links to `user/payMembership`, so readers cannot buy
the membership from any page.

617cd6db51 also flagged the English entry fuzzy, which OJS stopped
doing in 2026 (0d3e02943a, "Don't mark English texts fuzzy"). The diff
therefore flags only the translations.

Tried, with an earlier wording of the "General Fees" sentence ("Enter a
fee amount below to set the price of an association membership."). With
the diff applied, step 3 showed the two new sentences, the "Author
Fees" sentence was unchanged, and the French tab still showed its old
text. The French result is expected, because the loader still reads a
fuzzy entry, so each language changes once its translators update it.
The final wording only replaces that one line, and was not walked.

**Alternatives:**

- Point the "Reader Fees" sentence at About › Subscriptions. That would
  be untrue: that page lists no purchase fee.
- List the purchase fees, and the membership if one is ever offered, on
  About › Subscriptions. This is the natural home if pkp wants a list
  of fees. It is a template change that needs a product decision first:
  the page shows only while payments are set up, and it is not in the
  default menu. It would follow the rewording, not replace it.
- List the fees on About the Journal, as OJS 2 did. In OJS 3 that page
  is the journal's own free text, so this would be a new section of the
  page and a product decision.
- Drop the two sentences from the template. That loses the true part:
  readers see the fee where they pay.

**What goes with it:**

- Backport: the English change applies as it stands on 3.5, 3.4 and 3.3
  (3.3's folder is `en_US`). The fuzzy lines need generating again for
  each branch.
- Guard: an e2e check that reads the tab's "Reader Fees" and "General
  Fees" sentences, beside the one that already reads "Author Fees".
- Left out: the unused keys `about.authorFees`, `about.authorFeesMessage`,
  `payment.publication.payPublication` and
  `payment.membership.buyMembership`, OJS 2 leftovers that no screen
  shows.

Small: two English strings plus the fuzzy flags OJS already adds this
way, and no code change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fees-promised-on-about-page-shown-nowhere/walk.js)
  takes the Steps on a freshly loaded default dataset, through the
  screens. For each public page, it records whether the page holds
  "Policies", "fee", the currency or one of the four amounts. It also
  reads the tab in French, to check what the fix leaves alone. Run from
  pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/fees-promised-on-about-page-shown-nowhere/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL, with the
  datasets from pkp/datasets 38ab955 (2026-09-30). The Steps and
  Observed were the same on both lines. No request failed and no page
  script failed.
- Tips: OJS `main` bade233f73, its lib/pkp 2e377d27fc; OJS
  `stable-3_5_0` 92b9a16b48, lib/pkp a9c76aed62; OJS `stable-3_4_0`
  9571d8fde7, lib/pkp df13621c2d; OJS `stable-3_3_0` 9fdb9bcf9a, lib/pkp
  d446601ebe.
- Code reads on `main`:
  - `paymentTypesForm.tpl` and the two English texts.
  - lib/pkp `about.tpl`.
  - `subscriptions.tpl`, `AboutHandler::subscriptions()`, and the
    `NMI_TYPE_SUBSCRIPTIONS` case in `NavigationMenuService`.
  - `registry/navigationMenus.xml`.
  - Every OJS, lib/pkp and default-theme template that reads
    `publicationFee`, `purchaseArticleFee`, `purchaseIssueFee` or
    `membershipFee`.
- Code reads on 3.5, 3.4 and 3.3: the template's two lines, the English
  texts and `about.tpl` are the same as on `main`, and the only frontend
  templates that read a fee are the galley links.
- Fuzzy entries still load. lib/pkp `LocaleFile::loadArray()` builds
  the strings with gettext's `ArrayGenerator`
  (`lib/pkp/lib/vendor/gettext/translator/src/Generator/ArrayGenerator.php`,
  line 65), which skips only empty and obsolete entries. gettext's
  `PoLoader` does nothing with the fuzzy flag. The fix walk agreed: the
  French tab was unchanged.
- Introduced: `git blame` on the template's lines gives 37de9bf480
  (2017-11-08), which moved the template from `templates/subscriptions/`.
  That file was added by 6d3fa52e52 with the same three sentences. OJS
  2's About page listed the fees; ae903bd93b (2013, "Include basic page
  structure from OMP") removed that page and its author fees listing on
  the way to OJS 3.
- Upstream: `pkp/pkp-lib#4701` (2019) reports the membership sentence
  ("nothing appears on the About page and I think this is a holdover
  from OJS 2"). It asks for the membership to be offered, or for its
  information to be removed, and was closed as outdated in 2022.
- Not walked: 3.4 and 3.3, which were read in the code only. Themes
  other than the default theme were not read. MySQL not checked;
  nothing here depends on the database.
