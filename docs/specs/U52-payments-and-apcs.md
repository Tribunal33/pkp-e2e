---
name: payments-and-apcs
status: verified
---

# Payments & APCs {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal can charge money. The fee most journals charge is the
**article processing charge** (APC), which an author pays once their
article is accepted: the settings call it "Article Processing Charge",
every other screen "Publication Fee". A journal can also charge readers
for one article, one issue or a membership. A Journal Manager switches
payments on under Settings › Distribution › "Payments", with a currency
and a **payment method**: "Manual Fee Payment", where the payer reads the
journal's instructions, pays outside the app and presses a button that
tells the journal, or "Paypal Fee Payment", for paying through PayPal
(Rule 9). The fees are set on the "Payments" page's "Payment Types" tab. On
an accept decision the editor requests the APC; each author of the
submission is emailed and given a task that leads to the method's
payment page; an editor then records the fee as paid or waived from the
workflow's "Payments" menu; the article cannot be published until that
record exists; and the "Payments" page's "Payments" tab lists every
payment the journal has recorded. This spec owns the payment settings,
the fees, the method's pages and emails and the fee's record. What a
reader fee opens is [Subscriptions](U51-subscriptions.md)'s; the accept
decision's "Request Payment" page is [Editorial decision
recording](U34-editorial-decision-recording.md)'s. <sup>a</sup>

OMP does not install fees: a press has no "Payments" page, so no "Payment
Types" and no list of payments; its accept decisions have no "Request
Payment" page and its workflow no "Payments" menu. A press does show
Settings › Distribution › "Payments" with the same form and the same two
methods, which serve its direct sale of publication formats
([Monograph landing page](U69-monograph-landing-page.md) {OMP}); the tab itself behaves
as Fields and Rules 1 and 2 say, and arrives with "Manual Fee Payment"
already chosen [OMP1](#omp1).
OPS does not install payments at all: a preprint server's Settings ›
Distribution has no "Payments" tab, and nothing on a server asks for a
fee. <sup>b</sup> <sup>td1</sup>

## Actors & permissions

**Manager-level roles** here are the Journal Manager, the Editor and the
Production Editor; the Site Administrator holds a manager role in every
journal of the test installs and counts with them. The **Subscription
Manager** is the journal role of that name ([Subscriptions](U51-subscriptions.md)).
An **assigned** role is one listed on the submission's Participants panel.
The fee's **payer** is the person a payment page is for: an Author of the
submission for the APC, the reader for a reader fee. <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Set up payments** (Settings › Distribution › "Payments"; Rules 1–3) | • Whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)), on a journal and on a press <sup>c</sup> |
| **Set the fees and read the list of payments** (the "Payments" page's "Payment Types" and "Payments" tabs; Rules 4–7, 17) | • Manager-level roles and the Subscription Manager, as for the page's other tabs; everyone else is refused the page ([Subscriptions](U51-subscriptions.md), its Actors row 1) <sup>c</sup> <sup>td2</sup> |
| **Request the APC** (Rule 8) | • The deciding editor who records "Accept Submission" or "Accept and Skip Review" while the APC is in force (Rule 5), on the decision's "Request Payment" page ([Editorial decision recording](U34-editorial-decision-recording.md), its Rule 16) <sup>i</sup> |
| **Record the APC as paid, waived or unpaid** (the workflow's "Payments" menu; Rules 13–15) | • Every role the workflow opens in its editorial view while the APC is in force: manager-level roles on any submission; the assigned Section Editor and Guest Editor; the assigned assistant roles (Copyeditor, Layout Editor, Proofreader and the rest) too ⚠ [A6](#a6) ([Workflow screen & stage access](U24-workflow-screen-and-stage-access.md), its Rule 6)<br>• Author: never offered the menu <sup>c</sup> <sup>g</sup> <sup>td12</sup> |
| **Open a payment page and send the notification of payment** (Rules 9–12) | • The payer, signed in: for the APC, each assigned Author of the submission (their task and their email carry the link); for a reader fee, the reader who asked to buy ([Subscriptions](U51-subscriptions.md), its Rules 12, 28–31)<br>• A signed-out visitor is sent to the Login page first (Rule 9) <sup>c</sup> <sup>h</sup> <sup>td6</sup> |
| **Buy a membership** ("Association Membership", Rule 7a) | • Nobody through the screens: no page, button or link offers it ⚠ [A7](#a7)<br>• A signed-in user who types the journal's address followed by "user/payMembership" while payments are set up gets the method's payment page for it; signed out, or while payments are not set up, the address fails [A9](#a9) <sup>m</sup> <sup>td13</sup> |
| **Receive the payment emails** (Side effects) | • "Payment Request Notification": each assigned Author of the accepted submission<br>• "Manual Payment Notification": the journal's principal contact <sup>k</sup> |

## Fields & validation

<a id="payments-tab"></a>
**The "Payments" tab** (Settings › Distribution › "Payments"), top to
bottom, then "Save". A group headed "Setup" holds the first three fields;
each method then has a group of its own, headed with the method's name.
Every field under "Enable" shows only while "Enable" is ticked, and both
methods' groups show whichever method is chosen. <sup>d</sup> <sup>td1</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Enable" | No | One box; on a journal "Payments will be enabled for this journal. Note that users will be required to log in to make payments.", on a press "Payments will be enabled for this press. Note that users will be required to log in to make payments."; unticked on a new journal and a new press (Rules 1, 2) |
| "Currency" | No [A5](#a5) | A list of currencies by name with no empty choice; a new journal arrives with none chosen (Rule 2), and once one is saved it can be changed but not removed |
| "Payment Plugins" | No | "Manual Fee Payment" or "Paypal Fee Payment"; a new journal arrives with none chosen, a new press with "Manual Fee Payment" [OMP1](#omp1) (Rule 2) |
| "Manual Fee Payment" group: "Manual Payment Instructions" | No | A plain text box; the manual method counts as set up only while it holds text (Rule 2), and the text is shown on its payment page (Rule 9) |
| "Paypal Fee Payment" group: "Test Mode" (one box, "Enable"), "Account Name", "Client ID", "Secret" | No | Plain text boxes, "Secret" masked; the PayPal method counts as set up only while "Account Name" holds text (Rule 2) |

<a id="payment-types-tab"></a>
**The "Payment Types" tab** (the "Payments" page, which the side menu's
"Payments" opens; its tab bar is [Subscriptions](U51-subscriptions.md)'s),
top to bottom, then "Save" and the line "Required fields are marked with an
asterisk: *" ⚠ [A4](#a4). Each box takes an amount in the journal's
currency. <sup>e</sup> <sup>td3</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Author Fees": "Article Processing Charge" | No | Under "Enter fee amounts below in order to enable author processing charges." (Rules 4, 5) |
| "Reader Fees": "Purchase Issue", "Purchase Article" | No | Under "Selected options, along with their descriptions and fees (which can be edited below), will appear in About the Journal under Policies, as well as at points where payment is required." [A1](#a1) (Rule 6) |
| "Only Restrict Access to PDF version of issues and articles" | No | A box (Rule 6) |
| "General Fees": "Association Membership" | No | Under "The Association Membership will appear in About the Journal under Policies." [A1](#a1) (Rule 7a) |

Every fee box takes a number of 0 or more, decimals allowed (Rule 4).

<a id="payments-list"></a>
**The "Payments" tab** of the "Payments" page: a list with the columns
"User", "Payment Type", "Amount" and "Timestamp" (Rule 17), and under it
a line counting the rows, such as "1 - 2 of 2 items". An empty list
reads "No Items" and "0 - 0 of 0 items". Its rows open nothing.
<sup>f</sup> <sup>td15</sup>

<a id="payments-menu"></a>
**The workflow's "Payments" menu** (a button in the workflow header, left
of the other header buttons, while the APC is in force): pressed, it opens
a small panel holding one choice, "Publication Fee", with the options
"Waived", "Paid" and "Unpaid", and "Save" (Rules 13, 14). <sup>g</sup>

<a id="manual-page"></a>
**The manual method's payment page** on a journal, headed "Manual Fee
Payment", top to bottom (Rule 9). A press's payment page, which puts
the instructions first and "Send notification of payment" as a plain
link, is described in [Monograph landing
page](U69-monograph-landing-page.md) (its Fields, "The payment page").
<sup>h</sup> <sup>td6</sup> <sup>td16</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Title" | — | What is paid for: "Publication Fee" for the APC; "Subscription Fee ({type name})", "Purchase Article Fee" or "Purchase Issue Fee" for a reader fee; "Individual Membership Fee" at the typed membership address (Rule 7a) |
| "Fee" | — | The amount with two decimals and the currency code in brackets, such as "50.00 (USD)" |
| The instructions | — | The "Manual Payment Instructions" text, its line breaks kept |
| "Send notification of payment" | — | A button (Rule 10) |

## Rules & state

### Setting up payments

1. **Saving the tab.** "Save" on Settings › Distribution › "Payments"
   stores every field of the tab, the hidden ones included, and shows
   "Saved". Unticking "Enable" hides the other fields and keeps what they
   hold; ticking it again shows them filled in. On a journal the side
   menu gains "Institutions" and "Payments" on the same page as soon as
   "Enable" is saved ticked ([Navigation
   menus & site chrome](U08-navigation-menus-and-site-chrome.md), its
   Settings bullet 6). Saved unticked, "Payments" leaves the side menu
   at once, but "Institutions" stays there until the page is reloaded
   ⚠ [A12](#a12); after a reload neither shows. On a press nothing else
   on screen changes. A change left unsaved is dropped as on every
   Settings page
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   its Rule 5). <sup>d</sup> <sup>td1</sup>

<a id="payments-set-up"></a>
2. **Payments set up.** A journal's payments are **set up** while
   "Enable" is saved ticked and the chosen method is itself set up:
   "Manual Fee Payment" while "Manual Payment Instructions" holds text,
   "Paypal Fee Payment" while "Account Name" holds text. No method chosen
   is not set up. "Currency" plays no part: a journal set up with no
   currency asks for its fees with no currency after the amount
   ⚠ [A5](#a5). With "Enable" ticked but the method not set up, every
   rule of this spec and of [Subscriptions](U51-subscriptions.md) behaves
   as with payments off, apart from the payment link of an earlier
   request (Rule 9); only the side menu's "Institutions" and "Payments"
   follow "Enable" alone (Rule 1). <sup>d</sup> <sup>td2</sup>
3. **The chosen method serves every payment.** Every payment page the
   journal shows is the method chosen when the page is opened, so a
   method changed after a fee was requested changes the page the payer
   gets for it. <sup>h</sup> <sup>l</sup>

### The fees

4. **Saving "Payment Types".** "Save" stores every box of the tab and
   shows "Your changes have been saved.". The tab opens and saves
   whatever the payment settings. <sup>e</sup> <sup>td3</sup>
   - A box holding anything but a number of 0 or more ("abc", "-5",
     "10,50") is refused: "Errors occurred processing this form" and "All
     costs must be positive numeric values (decimal points are allowed)"
     show at the top of the form, and under the refused box the message
     takes the place of the box's name (after "abc" in "Article
     Processing Charge", that name is gone; the other boxes keep theirs).
     Nothing is stored, not even the other boxes' changes, although every
     box keeps showing what was typed until the page is reloaded, which
     also brings the name back.
   - An amount of 0 is stored as no fee: after a reload the box shows
     empty (right after "Save" it still shows "0").
   - An amount is read back as a number: "12.50" as "12.5", "1e3" as
     "1000".

4a. **Leaving "Payment Types" unsaved.** With a box changed and not
    saved, pressing another tab of the "Payments" page asks "The data on
    this form has changed. Do you wish to continue without saving?".
    "Cancel" stays on the tab with the typed value; "OK" opens the other
    tab and drops the change. Leaving the page raises the browser's own
    question about leaving, and the change is dropped. Settings ›
    Distribution › "Payments" asks nothing (Rule 1). <sup>td3</sup>

5. **The APC in force.** The APC is **in force** while payments are set
   up (Rule 2) and "Article Processing Charge" holds an amount above 0.
   While it is in force: <sup>a</sup> <sup>td2</sup>
   - "Accept Submission" and "Accept and Skip Review" open on the
     "Request Payment" page ([Editorial decision
     recording](U34-editorial-decision-recording.md), its Rule 16);
   - the workflow header offers the "Payments" menu (Rule 13);
   - publishing waits for the fee's record (Rule 15).

   Removing the amount, or payments ceasing to be set up, takes all three
   away at once, whatever was requested or recorded before.
6. **Reader fees.** "Purchase Article", "Purchase Issue", "Only Restrict
   Access to PDF version of issues and articles" and "Association
   Membership" decide what a reader without a subscription is offered at
   a locked galley, as [Subscriptions](U51-subscriptions.md) says (its
   Rules 10–12 and Settings bullets 5–7); the payment page that offer
   leads to is Rule 9 here. <sup>e</sup>
7. **Fees shown in advance.** No page shows the APC or the membership
   before it is asked for, and neither About the Journal nor any other
   page lists a fee, whatever the tab's sentences say ⚠ [A1](#a1). The
   one amount shown in advance is the "Purchase Article" fee, printed on
   each locked galley link wherever the link appears (the home page's
   current issue, the issue page, the article page), such as "Requires
   Subscription or Fee PDF (USD 5)". <sup>e</sup> <sup>td4</sup>

7a. **The membership.** No page, button or link offers the
    "Association Membership" [A7](#a7). Typed by a signed-in user while
    payments are set up, the journal's address followed by
    "user/payMembership" opens the method's payment page for an
    "Individual Membership Fee" of the set amount, such as "20.00 (USD)".
    With "Manual Fee Payment", its "Send notification of payment" emails
    the principal contact a "Manual Payment Notification" for "Individual
    Membership Fee", but the page that follows has no "Continue", and
    nothing records a membership.
    Signed out, or with payments not set up, the address fails
    ⚠ [A9](#a9). <sup>m</sup> <sup>td13</sup>

### Requesting the APC

8. **The request.** Recording an accept decision with "Request
   publication fee ({amount} {currency})" chosen on its "Request Payment"
   page (or "Waive", which requests the fee all the same: [Editorial
   decision recording](U34-editorial-decision-recording.md#ojs1)) asks for
   the APC at the fee and currency of that moment: <sup>i</sup> <sup>td5</sup>
   - each assigned Author gets the "Payment Request Notification" email
     (Side effects);
   - each assigned Author's Tasks panel gains "The publication fee is due
     for payment.", with the article's title under it ([Notifications
     center & email preferences](U05-notifications-center-and-email-preferences.md),
     its Rule 2); pressing it opens the payment page (Rule 9).

   Nothing on the editorial side shows the request: the "Payments" menu
   still reads "Unpaid" (Rule 13).

### Paying

9. **The payment page.** The task's link, the email's link and the
   reader's purchase buttons all open the chosen method's page for that
   payment. It needs a signed-in user: a signed-out visitor gets the
   Login page and, on a journal, once signed in there, the payment page.
   <sup>h</sup> <sup>td6</sup>
   - On a press, a visitor who presses the "Purchase" link of a book
     file for sale and signs in on the Login page it leads to does not
     reach the payment page: a Reader lands on the press's home page, a
     Press Manager on the Dashboard's "Assigned to me". The buyer finds
     the book and presses the link again, which now opens the payment
     page at once
     ([Monograph landing page](U69-monograph-landing-page.md#a18), its
     A18). <sup>td16</sup>
   - With "Manual Fee Payment" a journal's page is the one Fields
     describes.
   - With "Paypal Fee Payment" the page sends the payer on to PayPal to
     pay there. <sup>n</sup>
   - On the test installs, which reach no PayPal account, a PayPal
     payment page reads only "A transaction error occurred. Please
     contact the journal manager for details.", whether "Test Mode" is
     ticked or not ⚠ [A10](#a10). <sup>l</sup> <sup>td9</sup>
   - An address naming no payment request shows the page "Payment" with
     "A payment has been requested, but the request has expired. Contact
     the Journal Manager for details.". <sup>td7</sup>
   - Once the chosen method is no longer set up (its instructions
     emptied), the link of an earlier request fails with a blank error
     page ⚠ [A3](#a3). With "Enable" unticked but the method still set
     up, the link still opens the manual page, and "Send notification of
     payment" still emails the principal contact. <sup>td8</sup>
10. **"Send notification of payment".** Pressing it sends the "Manual
    Payment Notification" email (Side effects) and shows the page
    "Payment Notification" with "Payment notification sent" and
    "Continue". Pressing the button again sends the email again.
    <sup>h</sup> <sup>td6</sup> "Continue" leads back to where the payment
    began: for the APC, My Submissions with the submission's workflow
    open; for a subscription bought, the journal's current issue; for one
    renewed, "My Subscriptions"; for an article or an issue, its page. <sup>td14</sup>
11. **The notification records nothing.** The manual method never marks a
    payment as made: after "Send notification of payment" the APC still
    reads "Unpaid" in the "Payments" menu until someone records it (Rule
    14), and a reader fee is handled as [Subscriptions](U51-subscriptions.md)
    says (its Rule 30). <sup>h</sup> <sup>td10</sup>
12. **A completed online payment.** A payment completed through PayPal is
    recorded by itself: it joins the list of payments (Rule 17), and for
    the APC it counts as paid (Rule 15). <sup>l</sup> <sup>n</sup>

### Recording the APC

13. **The "Payments" menu.** While the APC is in force the workflow
    header offers "Payments" on every submission of the journal, at every
    stage, to the roles of Actors row 4. Its "Publication Fee" choice
    arrives on the fee's record: "Paid" when a payment is recorded,
    "Waived" when a waiver is, "Unpaid" otherwise, whether or not the fee
    was ever requested. An option chosen without "Save" still shows as
    chosen when the menu is closed and opened again, though nothing is
    recorded; leaving the workflow drops it with no warning, and the menu
    then arrives on the record again. <sup>g</sup> <sup>td10</sup>
14. **Saving the record.** "Save" in the menu shows "Saved" and: <sup>g</sup>
    <sup>td10</sup>
    - "Paid" records a payment of the APC's amount and currency at that
      moment, made by the submitting Author;
    - "Waived" records a waiver: an amount of 0, no currency, made by the
      person who saved;
    - "Unpaid" removes whichever record there is.

    Saving the option already recorded changes nothing; switching
    between "Paid" and "Waived" replaces one record with the other. The
    record shows in the list of payments (Rule 17). Nobody is emailed and
    the Activity Log gains no line.
15. **Publishing waits for the record.** While the APC is in force, an
    article whose fee reads "Unpaid" cannot be published or scheduled:
    the publish window lists "Publication Fee not paid. To schedule item
    for publication notify author to pay fee or waive fee." ([Publish,
    schedule & versions](U49-publish-schedule-and-versions.md), its Rule
    7). This holds for every unpublished version, fee requested or not.
    "Paid" or "Waived" clears it; saving "Unpaid" brings it back, a
    published article's new version included. <sup>j</sup> <sup>td11</sup>
16. **The Author's task stays.** Recording the fee as "Paid" or
    "Waived" leaves "The publication fee is due for payment." in each
    Author's Tasks panel, still leading to a payment page for a fee
    already settled ⚠ [A2](#a2). <sup>i</sup> <sup>td10</sup>

### The list of payments

17. **What the list holds.** The "Payments" tab lists every payment the
    journal has recorded, newest first, one row each: <sup>f</sup>
    <sup>td15</sup>
    - "User": the payer, that is the submitting Author for an APC
      recorded "Paid", the person who saved for a waiver;
    - "Payment Type": "Publication Fee" for the APC;
    - "Amount": the amount and the currency code ("50 USD"), a waiver "0";
    - "Timestamp": the date and time it was recorded.

    Once the Author named on a "Paid" record has had their account merged
    into another, the list no longer loads ⚠ [A11](#a11). <sup>td15</sup>

    A payment completed online (Rule 12) lists with the account the
    request was made for as "User" (the reader for a reader fee, the
    requesting editor for the APC), and with "Payment Type" "Publication
    Fee", "Subscription Fee ({type name})", "Purchase Article Fee",
    "Purchase Issue Fee" or "Individual Membership Fee". <sup>n</sup>

    With the manual method the list holds only what the "Payments" menu
    records (Rule 14): the manual method records nothing (Rule 11).

## Side effects

- **"Payment Request Notification"** (Rule 8). Each assigned Author of
  the accepted submission gets it from the journal's principal contact,
  subject "Payment Request Notification": "Dear {name}, Congratulations on
  the acceptance of your submission, {title}, to {journal}. Now that your
  submission has been accepted, we would like to request payment of the
  publication fee. This fee covers the production costs of bringing your
  submission to publication. To make the payment, please visit {link}."
  then "If you have any questions, please see our Submission Guidelines"
  ("Submission Guidelines" links to the journal's page of that name),
  then "— This is an automated message from {journal}.", where the
  journal's name links to its home page. {link} opens the payment page
  (Rule 9). Its text is the "Payment Request" email of Settings ›
  Workflow › Emails › "Manage Emails" ([Emails
  management](U56-emails-management.md), its Rule 6). <sup>k</sup>
  <sup>td5</sup>
- **The Author's task** "The publication fee is due for payment." (Rules
  8, 16). The Author can delete it from the Tasks panel ([Notifications
  center & email preferences](U05-notifications-center-and-email-preferences.md),
  its Rule 3); it does not come back, and the email's link still opens
  the payment page. <sup>td5</sup>
- **"Manual Payment Notification"** (Rule 10). The journal's principal
  contact gets it from the payer's own name and address, subject "Manual
  Payment Notification": "A manual payment needs to be processed for the
  journal {journal} and the user "{username}". The item being paid for is
  "{item}". The cost is {amount} ({currency}). This email was generated by
  Open Journal Systems' Manual Payment plugin.". <sup>k</sup> <sup>td6</sup>
  The "Manage Emails" list has no row for it, so its text cannot be
  changed ([Emails management](U56-emails-management.md#a7)). It goes to
  the principal contact for a subscription too, not to the subscription
  contact ⚠ [A8](#a8). <sup>td14</sup>
- **The fee's record** (Rule 14) and the list of payments (Rule 17).
  Nothing else sends email or notifies anyone: saving either settings
  tab, recording the fee and opening a payment page are silent.
  <sup>k</sup>

## Settings that modify behavior

1. **"Enable"** — Settings › Distribution › "Payments". Default:
   unticked (payments off). Ticked, with a method set up: payments are set
   up (Rule 2). Ticked alone: the side menu's "Institutions" and
   "Payments" (Rule 1) and nothing else.
2. **"Currency"** — the same tab. Default: none. Chosen: the currency of
   every fee requested and every payment recorded as "Paid" (Rules 8, 9,
   14); a waiver has none and lists as "0". None: fees read with no
   currency [A5](#a5).
3. **"Payment Plugins"** — the same tab. Default: none on a journal,
   "Manual Fee Payment" on a press [OMP1](#omp1). "Manual Fee Payment" or
   "Paypal Fee Payment": the payment page of Rule 9 (Rule 3).
4. **"Manual Payment Instructions"** — the same tab. Default: empty (the
   manual method not set up, Rule 2). Filled: the manual method is set up,
   and the text is shown on its payment page (Rule 9).
5. **"Account Name", "Client ID", "Secret", "Test Mode"** — the same tab.
   Default: empty and unticked (PayPal not set up). "Account Name" filled:
   PayPal is set up (Rule 2). On the test installs the other three change
   nothing: every PayPal payment page there shows the error of Rule 9,
   "Test Mode" ticked or not. <sup>l</sup>
6. **"Article Processing Charge"** — the "Payments" page › "Payment
   Types". Default: empty. Above 0, with payments set up: the APC is in
   force (Rule 5).
7. **"Purchase Issue", "Purchase Article", "Only Restrict Access to PDF
   version of issues and articles"** — the same tab. Default: empty and
   unticked. Their effect is [Subscriptions](U51-subscriptions.md)'s
   (its Settings bullets 5 and 6); the page they lead to is Rule 9.
8. **"Association Membership"** — the same tab. Default: empty. Set: what
   [Subscriptions](U51-subscriptions.md) says (its Settings bullet 7);
   nothing on screen sells it [A7](#a7).
9. **The "Payment Request" email's template** — Settings › Workflow ›
   Emails › "Manage Emails" ([Emails management](U56-emails-management.md)).
   Default: the text Side effects quotes. Edited: the email of Rule 8
   carries the edited text.
10. **The principal contact** — Settings › Journal › "Contact"
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md)).
    The sender of "Payment Request Notification" and the recipient of
    "Manual Payment Notification" (Side effects).

## Cross-feature interactions

- *[Subscriptions](U51-subscriptions.md)*: the "Payments" page, its tab
  bar and who opens it; what "Purchase Article", "Purchase Issue", "Only
  Restrict Access to PDF…" and "Association Membership" open; the
  subscription purchase and renewal buttons that lead to the payment page
  of Rule 9; its register's A6 (an article bought with the manual method
  never opening).
- *[Editorial decision recording](U34-editorial-decision-recording.md)*:
  the "Request Payment" page of the accept decisions (its Rule 16) and its
  OJS1 ("Waive" requesting the fee).
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  where the "Payments" button sits in the header and who sees it (its
  Rule 6); this spec owns what the menu holds and does.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  the publish window that lists the unpaid fee (its Rule 7).
- *[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)*:
  the side menu's "Payments" and "Institutions" (its Rule 30 and Settings
  bullet 6).
- *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*:
  the Tasks panel the Author's task lands in, and its "Delete" (its Rule
  3).
- *[Users management](U53-users-management.md)*: "Merge user" (its Rules
  16–17), after which a merged payer's fee records break [A11](#a11).
- *[Emails management](U56-emails-management.md)*: the "Payment Request"
  row, and its A7 (the manual method's email missing from the list).
- *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*:
  who opens the Settings pages, and the principal contact.
- *[My Submissions](U22-my-submissions.md)*: where "Continue" leads after
  an APC notification (Rule 10).

## Canonical scenarios

Scenarios 1 to 6 run on scratch journals and a scratch press with
throwaway accounts; scenario 7 runs on the seeded preprint server with a
ready account. <sup>s0</sup>

1. **Payments switched on, set up and switched off**

   Given: Journal Manager, on a scratch journal whose payments are off,
   with an "Article Processing Charge" of 50 on "Payment Types" and the
   submission "Tidal Patterns" at the Submission stage.

   - **Payments off**: open "Tidal Patterns" from the Dashboard: the
     workflow header offers no "Payments" (Rule 5).
   - **The tab**: open Settings › Distribution › "Payments": the tab
     shows only "Enable", with its one box, unticked, reading "Payments
     will be enabled for this journal. Note that users will be required
     to log in to make payments." (Fields, the "Payments" tab).
   - **"Enable" ticked**: tick the box: the group "Setup" now holds
     "Enable", "Currency" with no currency chosen and "Payment Plugins"
     with no method chosen, followed by the group "Manual Fee Payment"
     with "Manual Payment Instructions" and the group "Paypal Fee
     Payment" with "Test Mode", "Account Name", "Client ID" and "Secret"
     (Fields, the "Payments" tab).
   - **"Enable" alone**: press "Save": "Saved" shows, and the side menu
     gains "Institutions" and "Payments" on the same page (Rule 1). Open
     "Tidal Patterns": the header still offers no "Payments", since no
     method is set up (Rules 2, 5).
   - **Set up with "Manual Fee Payment"**: back on the tab, choose the US
     dollar in "Currency" and "Manual Fee Payment" in "Payment Plugins",
     type Pay by bank transfer. in "Manual Payment Instructions" and
     press "Save": "Saved". Reload the page: "Enable" is ticked, and the
     US dollar, "Manual Fee Payment" and "Pay by bank transfer." are
     still there (Rule 1). Open "Tidal Patterns": the
     header offers "Payments", left of its other buttons (Rule 5;
     Fields, the workflow's "Payments" menu).
   - **"Enable" unticked**: on the tab, untick "Enable": every field but
     "Enable" hides. Press "Save": "Saved", and the side menu loses
     "Payments" while "Institutions" stays ⚠ [A12](#a12). Tick "Enable"
     again without saving: the currency, "Manual Fee Payment" and "Pay
     by bank transfer." show again as they were. Reload the page:
     "Enable" reads unticked, since the tick was not saved, and the side
     menu shows neither "Institutions" nor "Payments" (Rule 1).
   - **Control**: open "Tidal Patterns": with "Enable" saved unticked the
     header offers no "Payments" again (Rules 2, 5). <sup>s0</sup>

2. **Setting the fees on "Payment Types"**

   Given: Journal Manager, on a scratch journal whose payments are set
   up with "Manual Fee Payment" in US dollars and no fee set, with the
   submission "Tidal Patterns" at the Submission stage.

   - **The tab**: press "Payments" in the side menu, then the tab
     "Payment Types": under "Author Fees", "Enter fee amounts below in
     order to enable author processing charges." and the box "Article
     Processing Charge"; under "Reader Fees", the boxes "Purchase Issue"
     and "Purchase Article"; the box "Only Restrict Access to PDF
     version of issues and articles"; under "General Fees", the box
     "Association Membership". Every box is empty and the tick box
     unticked. Under "Save" the line reads "Required fields are marked
     with an asterisk: *", though no box is marked ⚠ [A4](#a4) (Fields,
     the "Payment Types" tab; Settings bullets 6 to 8).
   - **A fee refused**: type abc in "Article Processing Charge" and 5 in
     "Purchase Article", and press "Save": "Errors occurred processing
     this form" and "All costs must be positive numeric values (decimal
     points are allowed)" show at the top of the form, and the message
     shows again under the first box, in place of its name "Article
     Processing Charge"; the boxes still read "abc" and "5". Reload the page:
     both boxes are empty, since nothing was stored, and the first box is
     named "Article Processing Charge" again (Rule 4).
   - **Other refusals**: type -5 in "Article Processing Charge" and press
     "Save"; then replace -5 with 10,50 and press "Save": each is refused
     with the same messages (Rule 4).
   - **Leaving unsaved, "Cancel"**: reload the page, type 33 in "Article
     Processing Charge" and press the tab "Payments": the question "The
     data on this form has changed. Do you wish to continue without
     saving?" appears. Press "Cancel": "Payment Types" stays, the box
     reading "33" (Rule 4a).
   - **Leaving unsaved, "OK"**: press the tab "Payments" again, then
     "OK": the "Payments" tab opens on the columns "User", "Payment
     Type", "Amount" and "Timestamp", with "No Items" and "0 - 0 of 0
     items" (Fields, the list of payments). Press "Payment Types": the
     box is empty again (Rule 4a).
   - **Leaving the page**: type 33 again and reload the page: the browser
     asks whether to leave; leave, and the box is empty (Rule 4a).
   - **Saved**: type 1e3 in "Article Processing Charge" and press "Save":
     "Your changes have been saved."; after a reload the box reads
     "1000". Type 12.50 and press "Save": after a reload it reads "12.5"
     (Rule 4).
   - **The fee in force**: open "Tidal Patterns" from the Dashboard: the
     workflow header offers "Payments" (Rule 5; Settings bullet 6).
   - **Control**: on "Payment Types", type 0 in "Article Processing
     Charge" and press "Save": right after "Save" the box still reads
     "0", and after a reload it is empty. "Tidal Patterns"'s header
     offers no "Payments" (Rules 4, 5). <sup>s0</sup>

3. **The APC requested and paid with the manual method**

   Given: a Section Editor assigned to "Tidal Patterns" at the Submission
   stage, its submitting Author and a second Author assigned to it, and
   a Reader with no subscription, on a scratch journal that requires
   subscriptions and has payments set up with "Manual Fee Payment" in US
   dollars, the instructions "Pay by bank transfer." and "Account 123."
   on two lines, and an "Article Processing Charge" of 50, with the
   individual subscription type "Online Year" (12 months, 40 USD) and
   the published, current issue "Vol. 1 No. 1 (2026)".

   - **"Request Payment"**: the Section Editor opens "Tidal Patterns" and
     presses "Accept and Skip Review": the decision opens on its
     "Request Payment" page, offering "Request publication fee (50 USD)"
     and "Waive" (Rules 5, 8). Keep "Request publication fee (50 USD)"
     chosen and record the decision on its last page ([Editorial
     decision recording](U34-editorial-decision-recording.md), its Rule
     16).
   - **The editorial side**: press the header's "Payments": "Publication
     Fee" reads "Unpaid" (Rules 8, 13).
   - **The Authors' emails**: the mail catcher holds for the submitting
     Author and for the second Author each a "Payment Request
     Notification" from the journal's principal contact, opening "Dear"
     and their name, then "Congratulations on the acceptance of your
     submission, Tidal Patterns, to" and the journal's name; "To make the
     payment, please visit" is followed by a link, then "If you have any
     questions, please see our Submission Guidelines" and "— This is an
     automated message from" and the journal's name (Side effects).
   - **Signed out**: the submitting Author, signed out, opens the email's
     link: the Login page opens. Sign in there as the Author: the
     payment page opens (Rule 9).
   - **The manual page**: it is headed "Manual Fee Payment" and reads
     "Title" "Publication Fee", "Fee" "50.00 (USD)", then "Pay by bank
     transfer." and "Account 123." on two lines, then "Send notification
     of payment" (Fields, the manual method's payment page).
   - **"Send notification of payment"**: the Author presses it: the page
     "Payment Notification" shows "Payment notification sent" and
     "Continue" (Rule 10). The mail catcher holds for the principal
     contact a "Manual Payment Notification" from the Author's own name
     and address, reading "A manual payment needs to be processed for the
     journal" and the journal's name, "and the user" and the Author's
     username, then "The item being paid for is "Publication Fee"."
     (Side effects).
   - **The Author's workflow**: press "Continue": My Submissions opens
     with "Tidal Patterns"'s workflow open (Rule 10), and its header
     offers no "Payments" (Actors row 4).
   - **The second Author's task**: the second Author signs in: the Tasks
     panel reads "The publication fee is due for payment.", with "Tidal
     Patterns" under it (Rule 8). Pressing it opens the same "Manual Fee
     Payment" page (Rule 9). Press "Send notification of payment": the
     principal contact receives a second "Manual Payment Notification",
     naming the second Author's username (Rule 10).
   - **A Reader's subscription**: the Reader opens the journal's address
     followed by "user/subscriptions", presses "Purchase New
     Subscription", chooses "Online Year" and presses "Save"
     ([Subscriptions](U51-subscriptions.md), its Rule 28): the "Manual
     Fee Payment" page reads "Title" "Subscription Fee (Online Year)" and
     "Fee" "40.00 (USD)" (Fields, the manual method's payment page).
     Press "Send notification of payment", then "Continue": the journal's
     current issue, "Vol. 1 No. 1 (2026)", opens (Rule 10). The principal
     contact receives a third "Manual Payment Notification", from the
     Reader (Side effects).
   - **Control**: the Section Editor presses the header's "Payments"
     again: "Publication Fee" still reads "Unpaid"; the notifications
     recorded nothing (Rule 11). <sup>s0</sup>

4. **The APC recorded as paid, waived and unpaid, and publishing**

   Given: Journal Manager, and a Section Editor assigned to "Tidal
   Patterns" in the Production stage, whose "Publication Fee" reads
   "Unpaid", on a scratch journal whose payments are set up with "Manual
   Fee Payment" in US dollars and an "Article Processing Charge" of 50.
   The Section Editor records the fee; the Journal Manager opens the
   publish window, which the Section Editor is not offered ([Publish,
   schedule & versions](U49-publish-schedule-and-versions.md), its Rule
   2).

   - **The menu**: the Section Editor opens "Tidal Patterns" and presses
     "Payments", the first button of the workflow header: a small panel
     opens holding "Publication Fee" with "Waived", "Paid" and "Unpaid",
     "Unpaid" chosen, and "Save" (Fields, the workflow's "Payments"
     menu; Rule 13).
   - **Publishing refused**: the Journal Manager opens "Tidal Patterns"
     and presses "Schedule For Publication", which opens the page
     "Publication: Title & Abstract"; there press "Schedule For
     Publication" again, and "Confirm" on "Review Publishing Details" when
     that panel opens: the window lists "Publication Fee not paid. To
     schedule item for publication notify author to pay fee or waive
     fee." (Rule 15; [Publish, schedule &
     versions](U49-publish-schedule-and-versions.md), its Rules 3 and 7).
     Close the window.
   - **"Paid"**: the Section Editor, in "Payments", chooses "Paid" and
     presses "Save": "Saved" shows (Rule 14). Reload the page and press
     "Payments": "Paid" is chosen (Rule 13). The Journal Manager's
     "Schedule For Publication" window no longer lists "Publication Fee
     not paid…" (Rule 15); close the window.
   - **The list of payments**: the Journal Manager presses "Payments" in
     the side menu, then the tab "Payments": one row, "User" the
     submitting Author's name, "Payment Type" "Publication Fee",
     "Amount" "50 USD", "Timestamp" today's date and time (Rules 14, 17;
     Fields, the list of payments).
   - **"Paid" saved again**: the Section Editor presses "Payments", then
     "Save" with "Paid" still chosen. The Journal Manager reloads the
     list: it still holds the one row, with the same "Timestamp" (Rule
     14).
   - **"Waived"**: the Section Editor chooses "Waived" and presses
     "Save": "Saved". The Journal Manager reloads the list: one row,
     "User" the Section Editor's name, "Payment Type" "Publication Fee",
     "Amount" "0" (Rules 14, 17). The Journal Manager's "Schedule For
     Publication" window lists no "Publication Fee not paid…" (Rule 15);
     close the window.
   - **"Unpaid"**: the Section Editor chooses "Unpaid" and presses
     "Save": "Saved". The Journal Manager reloads the list: "No Items"
     (Rule 14). The Journal Manager's "Schedule For Publication" window
     lists "Publication Fee not paid. To schedule item for publication
     notify author to pay fee or waive fee." again (Rule 15).
   - **Control**: the mail catcher holds nothing for the submitting
     Author, the Section Editor, the Journal Manager or the principal
     contact: recording the fee sent no email (Rule 14; Side effects).
     <sup>s0</sup>

5. **"Paypal Fee Payment" chosen after the APC was requested**

   Given: Journal Manager and the submitting Author of "Tidal Patterns",
   on a scratch journal whose payments are set up with "Manual Fee
   Payment" in US dollars and an "Article Processing Charge" of 50, the
   APC of "Tidal Patterns" requested there already, so that the Author's
   Tasks panel holds "The publication fee is due for payment.".

   - **PayPal with no "Account Name"**: the Journal Manager opens
     Settings › Distribution › "Payments", chooses "Paypal Fee Payment"
     in "Payment Plugins" and presses "Save": "Saved". Open "Tidal
     Patterns" from the Dashboard: the workflow header offers no
     "Payments", since PayPal is not set up (Rules 2, 5).
   - **"Account Name"**: back on the tab, type test in "Account Name" and
     press "Save": "Saved". "Tidal Patterns"'s header offers "Payments"
     again (Rules 2, 5; Settings bullet 5).
   - **The Author's page**: the Author presses the task in the Tasks
     panel: the page opened reads only "A transaction error occurred.
     Please contact the journal manager for details." ⚠ [A10](#a10)
     (Rules 3, 9).
   - **"Test Mode"**: the Journal Manager ticks "Enable" under "Test
     Mode" and presses "Save": "Saved". The Author presses the task
     again: the same error (Settings bullet 5).
   - **Control**: the Journal Manager chooses "Manual Fee Payment" in
     "Payment Plugins" and presses "Save". The Author presses the task
     again: the "Manual Fee Payment" page opens with "Title"
     "Publication Fee" and "Fee" "50.00 (USD)" (Rule 3). <sup>s0</sup>

6. **The press's "Payments" tab, and no fees on a press** {OMP}

   Given: Press Manager, on a scratch press, with the monograph "Tidal
   Patterns" on an external review round.

   - **The tab**: open Settings › Distribution › "Payments": the tab
     shows only "Enable", with its one box, unticked, reading "Payments
     will be enabled for this press. Note that users will be required to
     log in to make payments." (Fields, the "Payments" tab).
   - **"Enable" ticked**: tick the box: "Currency" shows with no currency
     chosen and "Payment Plugins" with "Manual Fee Payment" already
     chosen [OMP1](#omp1), then the two method groups, "Manual Fee
     Payment" with "Manual Payment Instructions" and "Paypal Fee Payment"
     with "Test Mode", "Account Name", "Client ID" and "Secret", in either
     order (Fields, the "Payments" tab).
   - **Saved**: choose the US dollar in "Currency", type Pay by bank
     transfer. in "Manual Payment Instructions" and press "Save":
     "Saved", and the side menu gains neither "Payments" nor
     "Institutions" (Rule 1). Reload the page: "Enable" is ticked, and
     the US dollar, "Manual Fee Payment" and "Pay by bank transfer." are
     still there (Rule 1).
   - **No fees**: open "Tidal Patterns": the workflow header offers no
     "Payments", and "Accept Submission" opens with no "Request Payment"
     page among its pages (Purpose, the absence paragraph).
   - **Control**: on a journal the same save adds "Institutions" and
     "Payments" to the side menu and, with a fee, "Payments" to the
     workflow header (scenario 1; Rules 1, 5). <sup>s0</sup>

7. **No payments on a preprint server** {OPS}

   Given: Preprint Server Manager, on the seeded preprint server.

   - **Settings › Distribution**: its tabs include no "Payments" (Purpose,
     the absence paragraph).
   - **Control**: on a journal Settings › Distribution offers "Payments"
     (scenario 1; Fields, the "Payments" tab). <sup>s0</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A10 (issue report
    `docs/issues/U52-A10-paypal-error-page-no-heading.md`):
    the PayPal error page of scenario 5 carrying the heading "Paypal Fee Payment" and that name in its breadcrumb and browser tab
  - the guard for A2 (issue report
    `docs/issues/U52-A2-fee-task-stays-after-fee-recorded.md`):
    after "Paid" and after "Waived" are saved in the "Payments" menu, the Author's Tasks panel holding no "The publication fee is due for payment." task
  - the guard for A12 (issue report
    `docs/issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md`):
    after "Enable" is saved unticked, the side menu dropping "Institutions" together with "Payments" on the same page (the journal's institutional statistics off)
- **Rarely met**:
  - "Purchase Issue" set: the reader's "Purchase Issue Fee" payment page
    (Settings bullet 7; Fields, the manual method's payment page)
- **Nothing new to test**:
  - a payment address naming no payment request, and its page "Payment"
    (Rule 9)
  - the Author deleting the fee task from the Tasks panel, after which the
    email's link still opens the payment page (Side effects, "The Author's
    task")
  - an option chosen in the "Payments" menu without "Save", kept when the
    menu is reopened and dropped on leaving (Rule 13)
  - the "Payment Request" template edited, and the request's email
    carrying the edit (Settings bullet 9)
  - the Editor, the Production Editor and the Site Administrator on
    Settings › Distribution › "Payments", offered what the Journal
    Manager of scenario 1 is (Actors row 1)
  - the Subscription Manager on "Payment Types" and "Payments", offered
    what the Journal Manager of scenarios 2 and 4 is (Actors row 2)
  - another principal contact, who sends and receives the emails
    scenario 3 reads (Settings bullet 10)
- **Register carries it**:
  - A1 (the fees promised on About the Journal and shown nowhere; Rule 7)
  - A2 (the Author's task left after the fee is recorded; Rule 16)
  - A3 (a payment link after the instructions are emptied, or after
    "Enable" is unticked; Rule 9)
  - A4 (the required-fields line on "Payment Types"; Fields; scenario 2
    passes it)
  - A5 (payments set up with no currency, and "Currency" offering no way
    back once saved; Rule 2; Fields)
  - A6 (an assigned assistant role recording the APC; Actors row 4)
  - A7 (a signed-in user at the typed membership address, and
    "Association Membership" set; Actors row 6; Rule 7a; Settings bullet
    8)
  - A8 (a subscription payment reported to the principal contact; Side
    effects)
  - A9 (the membership address signed out or with payments not set up;
    Actors row 6; Rule 7a)
  - A10 (the PayPal error page with no heading; Rule 9; scenario 5 passes
    it)
  - A11 (a payer's account merged after the APC is recorded "Paid"; Rule
    17)
  - A12 (the side menu's "Institutions" right after "Enable" is saved
    unticked; Rule 1; scenario 1 passes it)
- **No seed**:
  - a payment completed through PayPal, its hand-over to PayPal and its
    row in the list of payments (Rules 9, 12, 17; no test install reaches
    a PayPal account)
- **Owned by another feature**:
  - the roles refused the "Payments" page (Actors row 2;
    *[Subscriptions](U51-subscriptions.md)*, scenario 4)
  - "Purchase Article" and "Only Restrict Access to PDF version of issues
    and articles" set, and the "Purchase Article" price on locked galley
    links (Rule 7; Settings bullet 7; *[Subscriptions](U51-subscriptions.md)*,
    scenario 14)
  - a press's payment page, and the Login page a priced file's link
    leads to (Fields, the manual method's payment page; Rule 9;
    *[Monograph landing page](U69-monograph-landing-page.md)*, scenario 4)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | "Payment Types" says the fees appear in About the Journal; no page shows them | 🐞 | minor | — |
| [A2](#a2) | Authors are still told to pay the publication fee after the editor records it as "Paid" or "Waived" | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | A payment link fails with a blank error page once the instructions are emptied, and still takes notifications once "Enable" is off | 🐞 | user-visible · crash: server | — |
| [A4](#a4) | "Payment Types" explains required fields, but none is required | 🐞 | minor | — |
| [A9](#a9) | The membership address gives a blank error page signed out or with payments not set up | 🐞 | minor · crash: server | — |
| [A10](#a10) | The PayPal error page has no heading, and the browser tab shows only the journal's name | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | Merging a payer's account breaks the list of payments, the submission's "Payments" menu and its publishing | 🐞 | user-visible · crash: server | — |
| [A12](#a12) | After a journal switches payments off, the side menu keeps "Institutions" until the page is reloaded | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | Payments save and ask for fees with no currency, and a saved currency cannot be removed | ❓ | minor | — |
| [A6](#a6) | An assigned assistant role can record the APC as paid or waived | ❓ | user-visible | — |
| [A7](#a7) | No page offers the "Association Membership" the tab prices | ❓ | user-visible | — |
| [A8](#a8) | A subscription payment is reported to the principal contact, not the subscription contact | ❓ | minor | — |
| [OMP1](#omp1) | A press arrives with "Manual Fee Payment" chosen, a journal with none {OMP} | ✅ | invisible | — |

### All apps

<a id="a1"></a>
**A1 — Fees promised on About the Journal, shown nowhere** · 🐞 · minor.
The "Payment Types" tab says the reader fees "will appear in About the
Journal under Policies, as well as at points where payment is required"
and that "The Association Membership will appear in About the Journal
under Policies.". No page of the journal lists any fee: an author learns
of the APC only when it is requested after acceptance, and a reader
sees an article's price only on the locked link.
Basis: probe, 2026-09-27. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Authors are still told to pay the publication fee after the editor records it as "Paid" or "Waived"** · 🐞 · medium.
After an editor records the APC as "Paid" or "Waived", each Author's
Tasks panel still reads "The publication fee is due for payment.", and
pressing it still opens a payment page for the fee. The Author is told
to pay a fee that is settled, and can send the journal another "Manual
Payment Notification" for it. The editor's record is right: the
"Payments" menu and the journal's list of payments show the fee as paid
or waived. It happens whenever an editor records a requested fee in the
workflow's "Payments" menu, whatever the journal's payment method. A
journal on "Manual Fee Payment" records every fee there. On "Paypal Fee
Payment", a fee the Author pays through the task settles that request,
and its task goes; only a fee the editor waives, or records as paid
outside PayPal, leaves the task.
Basis: probe, 2026-10-01. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A payment link after payments stop** · 🐞 · user-visible · crash: server.
When a journal empties "Manual Payment Instructions" after requesting a
fee, the Author's task and email link fail on the server and show a
blank page, instead of a page saying that no payment is taken. When it
unticks "Enable" instead, they still open the payment page, and "Send
notification of payment" still sends the journal notifications for
payments it no longer takes.
Basis: probe, 2026-09-27. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A required-fields line with no required field** · 🐞 · minor.
Under "Save" the "Payment Types" tab reads "Required fields are marked
with an asterisk: *", yet no box carries an asterisk and every box may be
left empty.
Basis: probe, 2026-09-27. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Payments without a currency** · ❓ · minor.
Settings › Distribution › "Payments" saves "Enable" and a method with
"Currency" left unchosen, which is how a new journal arrives. The fees
are then asked for with no currency: the "Request Payment" page offers
"Request publication fee (50 )" and the manual page's "Fee" reads "50.00"
alone. A journal that arrives with no currency keeps none until one is
chosen; after that the list offers no way back.
Question: should "Currency" be required while "Enable" is ticked?
Lean: yes; a fee without a currency is not a price.
Basis: probe, 2026-09-27. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Assistants record the APC** · ❓ · user-visible.
The workflow's "Payments" menu is offered to every editorial role the
workflow opens, so an assigned Copyeditor, Layout Editor or Proofreader
can save "Paid" or "Waived" for the APC and so release the article for
publishing (Rule 15), as a Journal Manager can.
Question: should recording the fee be kept to manager-level roles and the
assigned deciding editors?
Lean: yes; recording money received is an editorial or management call,
not a production task.
Basis: probe, 2026-09-27. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A membership fee no page offers** · ❓ · user-visible.
"Association Membership" on "Payment Types" sets a membership fee, and a
paid-up membership opens restricted galleys ([Subscriptions](U51-subscriptions.md),
its Settings bullet 7), but no page, button or link offers a reader to
buy or renew a membership (only the typed address of Rule 7a opens a
payment page for one), and no screen records one. Beyond that address,
the fee changes only the wording and offers of [Subscriptions](U51-subscriptions.md)' Rule 12.
Question: should the journal offer a membership purchase again, or
should the field go?
Lean: remove the field; nothing on the screens can make a member.
Basis: probe, 2026-09-27. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Subscription payments go to the principal contact** · ❓ · minor.
A reader's "Send notification of payment" for a subscription emails the
journal's principal contact, although the journal names a subscription
contact on "Subscription Policies" for exactly these enquiries.
Question: should subscription payments be reported to the subscription
contact when one is set?
Lean: yes; the subscription contact is the person who then activates the
subscription.
Basis: probe, 2026-09-27. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The membership address fails signed out or with payments off** · 🐞 · minor · crash: server.
A signed-out visitor who types the journal's address followed by
"user/payMembership" gets a blank page, where the server failed,
instead of the Login page. A signed-in user gets the same blank page on
a journal whose payments are not set up, instead of a page saying that
no payment is taken.
Basis: probe, 2026-09-27. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The PayPal error page has no heading, and the browser tab shows only the journal's name** · 🐞 · low.
On a journal or press that takes payments through "Paypal Fee Payment",
a payment starts with the journal's own call to PayPal, made before the
payer leaves the site. When that call fails, the payer gets a page that
reads only "A transaction error occurred. Please contact the journal
manager for details." (on a press, "… the press manager …"). The page's
heading is empty, its breadcrumb ends "Home /" with nothing after it,
and the browser tab shows only the journal's or press's name. The call
fails while the "Client ID" or "Secret" on Settings › Distribution ›
"Payments" is wrong, and when PayPal cannot be reached. The same page is
shown when the payer comes back from PayPal and the payment cannot be
confirmed: PayPal does not report it approved, its amount or currency
differs from the one requested, or the payment request no longer exists.
Basis: probe, 2026-10-01. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Merging a payer's account breaks the fee records** · 🐞 · user-visible · crash: server.
After an article's APC is recorded "Paid" and that Author's account is
merged into another ([Users management](U53-users-management.md), its
Rule 17), the server fails wherever the record is read. The "Payments"
page's "Payments" tab shows "Loading" and never finishes, for every
payment of the journal. The
submission's workflow opens an "Error" window and its "Payments" menu
opens empty. "Schedule For Publication" › "Confirm" answers "An
unexpected error has occurred. Please reload the page and try again.",
so the article cannot be published, and nothing on screen repairs it.
Basis: probe, 2026-09-27. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — After a journal switches payments off, the side menu keeps "Institutions" until the page is reloaded** · 🐞 · low.
When a journal manager saves Settings › Distribution › "Payments" with
"Enable" unticked, the side menu drops "Payments" at once but keeps
"Institutions", although ticking "Enable" had added the two together.
"Institutions" goes only when the page is next loaded. Nothing is lost:
the setting is saved, and the stray entry still opens the Institutions
page. Reloading the page, or opening any other, shows the right menu. It
happens while the journal's institutional statistics are off, the
default. With them on, "Institutions" belongs in the menu for the
statistics anyway, so it rightly stays. Only a journal's side menu
follows "Enable": a press has the "Payments" tab too, but its side menu
never gains either entry.
Basis: test run; probe, 2026-10-01. <sup>f-a12</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press arrives with the manual method chosen** · ✅ · invisible.
On a new press "Payment Plugins" already reads "Manual Fee Payment"; on a
new journal it reads nothing until a method is chosen. Payments stay off
on both until "Enable" is saved.
Basis: probe, 2026-09-27. <sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts' tips (ojs `3162c105bf`, omp
`72a01a026`, ops `e9f6f4f550`, lib/pkp `1ad4a14bb2`, ui-library
`03d1cee2`). The body was live-probed on 2026-09-26 and 2026-09-27 on
OJS, on scratch journals with throwaway accounts and read-only on
`publicknowledge`, with OMP and OPS driven for the absence paragraph and
the exclusivity controls (notes td1–td15, each naming the rules it
settled, and the f-a notes); what cannot be seen on the test installs is
named in note n. The suites' test runs of 2026-09-27 corrected Rules 1
and 4 and scenarios 1, 2, 4 and 6 (notes d, td1, td3, s0, f-a12). A
re-probe of 2026-09-29 on OMP and OJS scoped Rule 9's sign-in and the
manual page's layout to a journal (note td16).

<a id="fn-a"></a>
**a** — OJS `classes/payment/ojs/OJSPaymentManager.php` (extends lib/pkp `classes/payment/PaymentManager.php`): `isConfigured()` is `PaymentManager::isConfigured()` (a chosen plugin exists and its own `isConfigured($context)` holds) and `paymentsEnabled`; `publicationEnabled()` adds `publicationFee > 0`, `purchaseArticleEnabled()`, `purchaseIssueEnabled()` and `membershipEnabled()` their own fee `> 0`, `onlyPdfEnabled()` `restrictOnlyPdf`. The APC's three consumers: OJS `classes/decision/types/Accept.php` and `SkipExternalReview.php` `getSteps()` prepend `RequestPayment::getPaymentForm()` when `publicationEnabled()`; `pages/dashboard/DashboardHandler.php` sets `pageInitConfig.publicationSettings.submissionPaymentsEnabled` from `publicationEnabled()`, which `workflowConfigEditorialOJS.js::getHeaderItems()` reads; `classes/publication/Repository.php::validatePublish()` (note j). Live-probed 2026-09-02 (the workflow-screen spec's probe; Rule 5): the header's "Payments" absent with payments enabled, a fee of 50 and no instructions, present once the instructions were saved, absent again at a fee of 0. Live-probed 2026-09-20 (seed facts; Rule 5): with no instructions "Accept Submission" had no "Request Payment" page. Live-probed 2026-09-27 (Rule 5; note td2): the three consumers came and went together at every end of the rule.

<a id="fn-b"></a>
**b** — lib/pkp `templates/management/distribution.tpl` carries the tab `payments` (`manager.paymentMethod` "Payments") mounting `PKPPaymentSettingsForm`; OMP has no override of it, so a press shows the tab; OPS `templates/management/distribution.tpl` overrides it with the tabs license, dois, indexing, access and statistics only; OPS ships no `plugins/paymethod` and no `api/v1/_payments`. OMP has no `pages/payments`, its `classes/decision/types/` use no `RequestPayment`, and `workflowConfigEditorialOMP.js::getHeaderItems()` adds no `WorkflowPaymentDropdown`. OMP `schemas/context.json` gives `paymentPluginName` the default `ManualPayment`; OJS `schemas/context.json` gives none. OMP's `pages/payment`, `OMPPaymentManager` and the publication-format sale (with the `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD` notice its `PublicationFormatMetadataForm` raises) belong to *Publication formats & proof terms* and *Monograph landing page*. Live-probed 2026-09-25 (the Subscriptions spec's probe; the absence paragraph): the press's Distribution tabs read "License, DOIs, Search Indexing, Payments, Statistics", its "Payments" tab showed "Enable", and saving it added no "Payments" to the side menu; the server's tabs read "License, DOIs, Search Indexing, Access, Statistics"; `{context}/payments` answered "404 Not Found" on both. Live-probed 2026-09-27 (the absence paragraph; note td1): the same on a scratch press and a scratch server; on the press, with payments saved on, `payment/pay/999999` also answered "404 Not Found", its workflow header had no "Payments", and "Accept Submission" opened on "Accept Submission: Notify Authors".

<a id="fn-c"></a>
**c** — Role gates. lib/pkp `api/v1/_payments/PKPBackendPaymentsSettingsController.php` (mounted by OJS and OMP `api/v1/_payments/index.php`): `has.user`, `has.context`, `roleAuthorizer([ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER])`; the tab itself is on `ManagementHandler::distribution()`. OJS `pages/payments/PaymentsHandler.php` assigns `paymentTypes`, `savePaymentTypes` and `payments` to `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUBSCRIPTION_MANAGER` behind `PKPSiteAccessPolicy`; `controllers/grid/subscriptions/PaymentsGridHandler.php` the same roles behind `ContextAccessPolicy`. The menu: OJS `api/v1/submissions/SubmissionController.php::getSubmissionPaymentForm()` (`GET submissions/{id}/publications/{pid}/_components/submissionPayment`, roles `ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_ASSISTANT`, in `requiresSubmissionAccess`) and `api/v1/_submissions/BackendSubmissionsController.php::payment()` (`PUT _submissions/{id}/payment`, the same four roles with `SubmissionAccessPolicy`). The payment page: `pages/payment/PaymentHandler.php::pay()` sends a signed-out visitor to `Validation::redirectLogin()`. Live-probed 2026-09-02 (the workflow-screen spec's probe; Actors row 4): an assigned Copyeditor's header read "Payments", "Library"; the Author's header never showed "Payments". Live-probed 2026-09-27 (Actors rows 1–5; notes td2, td6, td12): the tab opened for the Journal Manager, Editor, Production Editor and a Site Administrator not otherwise enrolled, on a journal and on a press; the Subscription Manager, Section Editor, Guest Editor, Copyeditor, Layout Editor, Funding Coordinator, Author, Reviewer and Reader (OMP: Series Editor, Copyeditor, Author, Reader) got the access-denied page at its address, a signed-out visitor the Login page.

<a id="fn-d"></a>
**d** — lib/pkp `classes/components/forms/context/PKPPaymentSettingsForm.php`: group `setup` (`navigation.setup` "Setup"); `paymentsEnabled` `FieldOptions` (label `common.enable` "Enable", option `manager.payment.options.enablePayments`, OMP's own text "…for this press…"); `currency` `FieldSelect` (`manager.paymentMethod.currency` "Currency", `Locale::getCurrencies()` by local name, `showWhen` `paymentsEnabled`); `paymentPluginName` `FieldSelect` (`plugins.categories.paymethod` "Payment Plugins", the display names of `PluginRegistry::loadCategory('paymethod', true)`, `showWhen` `paymentsEnabled`). Each method adds its group on `Form::config::before`: `plugins/paymethod/manual/ManualPaymentPlugin.php::addSettings()` group `manualPayment` ("Manual Fee Payment", `showWhen` `paymentsEnabled`) with `manualInstructions` `FieldTextarea` (`plugins.paymethod.manual.settings` "Manual Payment Instructions"); `plugins/paymethod/paypal/PaypalPaymentPlugin.php::addSettings()` group `paypalpayment` ("Paypal Fee Payment", `showWhen` `paymentsEnabled`) with `testMode` (`plugins.paymethod.paypal.settings.testMode` "Test Mode", option "Enable"), `accountName` "Account Name", `clientId` "Client ID", `secret` "Secret" (`inputType` password). Saving: ui-library `components/Form/Form.vue::submitValues()` posts every field, hidden ones included; `PKPBackendPaymentsSettingsController::edit()` reads `paymentsEnabled` as `=== 'true'`, validates `currency` (the `currency` rule, which an empty value skips), calls the hook `API::payments::settings::edit` where each `PaymethodPlugin::saveSettings()` stores its own fields (the manual method `manualInstructions` every time, PayPal the four it receives), then `contextService->edit()`; `FormPage.vue` shows `form.saved` "Saved". The side menu: `SettingsPage.vue` on the `form-success` of `FORM_PAYMENT_SETTINGS`, when `paymentsNavLink` is set (OJS `pages/management/SettingsHandler.php::distribution()` sets it, OMP does not), adds `institutions` and `payments` when `paymentsEnabled` is on and removes only `payments` when it is off (note f-a12); the page's server-built menu drops both on the next load. Set up: `ManualPaymentPlugin::isConfigured()` non-empty `manualInstructions`, `PaypalPaymentPlugin::isConfigured()` non-empty `accountName`; no set-up check reads `currency`. Live-probed 2026-09-20 (seed facts; Rules 1, 2): the tab saved "Enable", "Currency" and "Payment Plugins" with the chosen method's boxes on the same tab, and the side menu gained the "Payments" page after the save. Live-probed 2026-09-27 (Fields, the "Payments" tab; Rules 1, 2; notes td1, td2): the side menu's "Institutions" and "Payments" came on the same page right after a ticked "Save"; after an unticked one "Payments" went at once and "Institutions" only at the next page load (note f-a12).

<a id="fn-e"></a>
**e** — OJS `classes/subscription/form/PaymentTypesForm.php`: `publicationFee`, `purchaseArticleFee`, `purchaseIssueFee`, `membershipFee` (float), `restrictOnlyPdf` (bool), plus `purchaseArticleFeeEnabled`/`purchaseIssueFeeEnabled` that no field posts; each fee checked by `FormValidatorCustom` 'optional' `is_numeric($fee) && $fee >= 0` with `manager.payment.form.numeric`; `execute()` stores all through `JournalDAO::updateObject()`. `templates/payments/paymentTypesForm.tpl`: sections `manager.payment.authorFees` "Author Fees" (+ `.authorFeesDescription`), `manager.payment.readerFees` "Reader Fees" (+ `.readerFeesDescription`), `manager.payment.generalFees` "General Fees" (+ `.generalFeesDescription`); labels `manager.payment.options.publicationFee` "Article Processing Charge", `.purchaseIssueFee` "Purchase Issue", `.purchaseArticleFee` "Purchase Article", `.onlypdf`, `.membershipFee` "Association Membership"; each fee `{if $fee==0}` shown empty; `fbvFormButtons` `common.save`, then `common.requiredField`. `PaymentsHandler::savePaymentTypes()`: valid → `createTrivialNotification()` (`common.changesSaved` "Your changes have been saved."), else the form again with its error. No frontend template reads `publicationFee` or `membershipFee`; `purchaseArticleFee`/`purchaseIssueFee` are read by the galley links only (the Subscriptions spec's note l); the locale keys `about.authorFees`, `payment.membership.buyMembership` and `payment.publication.payPublication` are used nowhere. Live-probed 2026-09-27 (Rules 4, 4a, 6, 7; notes td3, td4). Rule 6, on a scratch journal requiring subscriptions, a Reader with none: with "Purchase Article" 5 both galley links read "Requires Subscription or Fee PDF (USD 5)" and "… HTML (USD 5)" and opened "Manual Fee Payment" with "Purchase Article Fee" and "5.00 (USD)" (signed out, the Login page); with only "Purchase Issue" 7 and no "Full Issue" galley the links read "Requires Subscription PDF" and led to the "Subscriptions" page; with "Only Restrict Access to PDF…" ticked the HTML galley opened.

<a id="fn-f"></a>
**f** — OJS `controllers/grid/subscriptions/PaymentsGridHandler.php`: columns `common.user` "User", `manager.payment.paymentType` "Payment Type", `manager.payment.amount` "Amount", `manager.payment.timestamp` "Timestamp"; `PagingFeature`; the default `GridRow` (no row actions); `loadData()` `OJSCompletedPaymentDAO::getByContextId()` `ORDER BY timestamp DESC`. `PaymentsGridCellProvider.php`: the user's full name or `common.user.nonexistent` "[Nonexistent user]"; `OJSPaymentManager::getPaymentName()` (`payment.type.publication` "Publication Fee", `.subscription` "Subscription Fee" + " ({type})", `.purchaseArticle`, `.purchaseIssue`, `.membership` "Individual Membership Fee"; older data's donation, submission and fast-track names); `getAmount() . ' ' . getCurrencyCode()` (a float, so "50 USD", a waiver "0 "); the stored timestamp. Its `viewPayment()` is an empty stub no row links to (docs/tracking/UNASSIGNED.md). Live-probed 2026-09-27 (Fields, the list; Rule 17; note td15).

<a id="fn-g"></a>
**g** — ui-library `src/pages/workflow/components/header/WorkflowPaymentDropdown.vue` (`Dropdown` labelled `common.payments` "Payments", holding the form fetched from `…/_components/submissionPayment`), pushed first by `workflowConfigEditorialOJS.js::getHeaderItems()` when `publicationSettings.submissionPaymentsEnabled`, on every stage; the author configs never add it. OJS `classes/components/forms/publication/SubmissionPaymentsForm.php`: `publicationFeeStatus` `FieldRadioInput` (`payment.type.publication` "Publication Fee"; `payment.waived` "Waived", `payment.paid` "Paid", `payment.unpaid` "Unpaid"), value "paid" when a completed `PAYMENT_TYPE_PUBLICATION` with an amount exists for the submission, "waived" when its amount is 0, else "unpaid"; PUT to `_submissions/{id}/payment`. `BackendSubmissionsController::payment()`: 404 unless `publicationEnabled()`; "waived" does nothing over a waiver, else deletes a paid record and creates and fulfils a queued payment of 0 and currency '' for the saving user (method name `ManualPayment`); "paid" does nothing over a paid record, else deletes a waiver and creates and fulfils one of `publicationFee` and `currency` for the submission's first Author stage assignment (method name `Waiver`); "unpaid" deletes the record; answers `[]`. `OJSPaymentManager::fulfillQueuedPayment()` writes `completed_payments` and deletes that queued payment. No `SubmissionLog` call, no mail, no notification. Live-probed 2026-09-27 (Fields, the menu; Rules 13, 14; note td10): "Save" answered 200 and showed "Saved", the panel staying open; the button sits first in the header row, before "Preview", "Activity Log" and "Library".

<a id="fn-h"></a>
**h** — OJS `pages/payment/PaymentHandler.php`: `pay()` (sign-in first; `QueuedPaymentDAO::getById()`; none → `frontend/pages/message.tpl` with `common.payment` "Payment" and `payment.notFound`; else `PaymentManager::getPaymentForm()->display()`, the form built by the method chosen at that moment); `plugin()` loads the named paymethod plugin, sends to the index unless it `isConfigured()`, then `handle()`. `ManualPaymentPlugin::getPaymentForm()` → `plugins/paymethod/manual/templates/paymentForm.tpl` (`plugins.paymethod.manual` "Manual Fee Payment"; `.purchase.title` "Title"; `.purchase.fee` "Fee" `{if $itemAmount}` with `%.2f` and " (CODE)" `{if $itemCurrencyCode}`; `manualInstructions|strip_unsafe_html|nl2br`; `.sendNotificationOfPayment` to `payment/plugin/ManualPayment/notify/{id}`). `handle('notify')`: sends `ManualPaymentNotify` (note k) and shows `message.tpl` with `plugins.paymethod.manual.paymentNotification` "Payment Notification", `.notificationSent` "Payment notification sent", and `common.continue` "Continue" to `QueuedPayment::getRequestUrl()`, which `OJSPaymentManager::createQueuedPayment()` set: the APC `dashboard/mySubmissions?workflowSubmissionId={id}` (the wizard while the submission is incomplete); a subscription bought `issue/current`; renewed `user/subscriptions`; an article `article/view/{id}`; an issue `issue/view/{id}`. It records nothing (`fulfillQueuedPayment()` is not called). Live-probed 2026-09-27 (Fields, the manual page; Rules 3, 9–11; notes td6, td7, td9).

<a id="fn-i"></a>
**i** — OJS `classes/decision/types/traits/RequestPayment.php`: `getPaymentForm()` is the step `editor.article.payment.requestPayment` "Request Payment" with `classes/components/forms/decision/RequestPaymentDecisionForm.php` (`common.payment` "Payment": `payment.requestPublicationFee` "Request publication fee ({$feeAmount})", `feeAmount` = `publicationFee . ' ' . currency`; `payment.waive` "Waive"); `requestPayment()` queues a `PAYMENT_TYPE_PUBLICATION` payment of `publicationFee`/`currency` under the editor's own user id, then for each `getAssignedAuthorIds()` a `NOTIFICATION_TYPE_PAYMENT_REQUIRED` task (`NOTIFICATION_LEVEL_TASK`, assoc `ASSOC_TYPE_QUEUED_PAYMENT`) and a `PaymentRequest` email (note k); `Accept::runAdditionalActions()` and `SkipExternalReview::runAdditionalActions()` call it for the `payment` action whatever `requestPayment` holds. The task: lib/pkp `PKPNotificationManager` `payment.type.publication.required` "The publication fee is due for payment.", URL `payment/pay/{queuedPaymentId}`; the line under it `NotificationsGridCellProvider::_getTitle()`, the submission's current title. A queued payment and its task are deleted only by `QueuedPaymentDAO::deleteById()`, which `fulfillQueuedPayment()` of that same payment calls (an online payment); requests carry no expiry date, so `deleteExpired()` never takes them. Live-probed 2026-09-20 (the decision-recording spec's probe; Rule 8): after "Accept and Skip Review" with the fee, the Author's Tasks panel read "The publication fee is due for payment." and the mailbox held "Payment Request Notification" from the principal contact, with "Waive" chosen too. Live-probed 2026-09-27 (Rule 8; note td5).

<a id="fn-j"></a>
**j** — OJS `classes/publication/Repository.php::validatePublish()`: `publicationFeeStatus` `editor.article.payment.publicationFeeNotPaid` while `publicationEnabled()` and no completed `PAYMENT_TYPE_PUBLICATION` exists for the submission, checked on every publish of every version, whether or not a request was made. Live-probed 2026-08-29 (the publish spec's probe): with payments enabled, a fee of 100 and "Manual Fee Payment" but no instructions the requirement did not arm. Live-probed 2026-09-27 (Rule 15; note td11).

<a id="fn-k"></a>
**k** — OJS `classes/mail/mailables/PaymentRequest.php` (key `PAYMENT_REQUEST_NOTIFICATION`, name `mailable.paymentRequest.name` "Payment Request"; variables `queuedPaymentUrl` → `payment/pay/{id}`, `submissionGuidelinesUrl` → `about/submissions`; footer `emails.paymentRequestNotification.footer`), `locale/en/emails.po` `emails.paymentRequestNotification.subject|body`; sent by `RequestPayment::requestPayment()` `from(contactEmail, contactName)` to each assigned Author. `plugins/paymethod/manual/mailables/ManualPaymentNotify.php` (`MANUAL_PAYMENT_NOTIFICATION`, installed from the plugin's `emailTemplates.xml`; `emails.manualPaymentNotification.subject|body` in the plugin's `locale/en/emails.po`; `senderUsername`, and `paymentName`, `paymentAmount`, `paymentCurrencyCode` from lib/pkp `classes/mail/variables/QueuedPaymentEmailVariable.php`), sent by `ManualPaymentPlugin::handle('notify')` with `sender($user)` and `to(contactEmail, contactName)` in the primary language. OMP's body reads "…for the press {$contextName} and the user {$senderName} (username "{$senderUsername}")… Open Monograph Press Manual Payment plugin.". `PKPBackendPaymentsSettingsController::edit()`, `PaymentsHandler::savePaymentTypes()` (its toast aside), `BackendSubmissionsController::payment()` and `PaymentHandler::pay()` send no mail and create no notification. Live-probed 2026-09-25 (the Subscriptions spec's check; Side effects, A8): a reader's "Send notification of payment" for a subscription delivered "Manual Payment Notification" from the reader's own address to the principal contact. Live-probed 2026-09-27 (Side effects; notes td5, td6, td14): the manual notification prints the amount as "The cost is 50 (USD)." where the page shows "50.00 (USD)"; saving either settings tab, recording the fee and opening a payment page moved no mailbox count, while a control notification sent afterwards arrived.

<a id="fn-l"></a>
**l** — `plugins/paymethod/paypal/PaypalPaymentForm.php::display()`: in sandbox mode `common.sandbox`; otherwise an Omnipay `PayPal_Rest` purchase with `clientId`, `secret` and `testMode` (PayPal's sandbox when set), redirecting to PayPal, and any failure shows `plugins.paymethod.paypal.error` "A transaction error occurred. Please contact the journal manager for details."; PayPal returns to `payment/plugin/PaypalPayment/return?queuedPaymentId=…`, where `PaypalPaymentPlugin::handle()` confirms the amount and calls `fulfillQueuedPayment()` (records the payment, deletes the request and its task, activates or renews a subscription) and sends to the request URL. The test installs run `sandbox = Off` (`config.test.inc.php`) with no PayPal account. Live-probed 2026-09-27 (Rules 3, 9; Settings bullet 5; note td9): with "Account Name" "test" and "Client ID" and "Secret" empty or "x", the page answered 200 with no redirect and showed the error, "Test Mode" ticked or not; the server logged "PayPal transaction exception: Authentication failed due to invalid authentication credentials or a missing Authorization header.".

<a id="fn-m"></a>
**m** — OJS `pages/user/UserHandler.php::payMembership()` queues `PAYMENT_TYPE_MEMBERSHIP` for `membershipFee` and shows the method's page, with no check that payments are set up; no template links to it; `OJSPaymentManager::createQueuedPayment()` treats the type as deprecated (`error_log`, `assert(false)`, no request URL); `fulfillQueuedPayment()` would move the user's `dateEndMembership` a year on, which `ArticleHandler`/`IssueHandler` read. Nothing on the screens shows or edits `dateEndMembership`. With payments not set up `getPaymentForm()` returns `false` after the request is queued (note f-a9). Live-probed 2026-09-27 (Actors row 6; Rule 7a; note td13).

<a id="fn-n"></a>
**n** — No payment completes on the test installs: they reach no PayPal account (note l), the return address PayPal calls is not a request any screen sends, and the manual method completes nothing (Rule 11). So the hand-over to PayPal (Rule 9), a completed online payment (Rule 12) and its row in the list (Rule 17: the account the request was made for as "User", and the reader-fee and membership payment types) cannot be seen there; they are read from the code. `PaypalPaymentPlugin::handle()` calls `OJSPaymentManager::fulfillQueuedPayment()`, which writes the completed payment with the queued payment's user, type and amount (note l); the request's user is the reader for a reader fee and the requesting editor for the APC (note i); `getPaymentName()` names the types (note f). Live-probed 2026-09-27: every PayPal payment page showed the error of Rule 9, and after the manual method's notifications the list read "No Items". Settled by one payment completed with a PayPal sandbox account ("Test Mode" ticked).

<a id="fn-s0"></a>
**s0** — Scenario seeding. Scenarios 1 to 5 each run on a scratch journal from `POST scenarios/context` with throwaway `users[]` (password: the username twice): `manager` (the Journal Manager) in scenarios 1, 2, 4 and 5; `sectionEditor` in scenarios 3 and 4; `author` (the submitting Author) in every one; in scenario 3 also a second `author` account and a `reader`. The payment settings are the `payments` key: scenario 1 `{enabled: false, publicationFee: 50}`; scenario 2 `{currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by bank transfer.'}`; scenarios 4 and 5 the same plus `publicationFee: 50`; scenario 3 the same with `manualInstructions: 'Pay by bank transfer.\nAccount 123.'` and `publicationFee: 50`, together with `publishingMode: 'subscription'`, `subscriptionTypes: [{name: 'Online Year', cost: 40, currency: 'USD', duration: 12}]` and `issues: [{volume: 1, number: 1, year: 2026, published: true}]`. "Tidal Patterns" comes from `POST scenarios/submission` with `title: 'Tidal Patterns'` and the throwaway `author` as `submitter`: at the Submission stage in scenarios 1, 2, 3 and 5 (scenario 3 with `participants: [{username: <sectionEditor>, role: 'sectionEditor'}, {username: <second author>, role: 'author'}]`); in scenario 4 with the Section Editor in `participants[]` and `decisions: ['skipExternalReview', 'sendToProduction']` (the menu reads "Unpaid" whether or not that seeded decision requests the fee, Rule 13). Scenario 4's publish windows are the Journal Manager's: in the OJS suite's test run of 2026-09-27 the stage view's "Schedule For Publication" took the assigned Section Editor to "Publication: Title & Abstract", which read "Status: Unscheduled" with no publish button beside it, its header offering "Payments", "Preview", "Activity Log" and "Library". Scenario 5's request is made on screen before its steps: the Journal Manager's "Accept and Skip Review" on "Tidal Patterns" with "Request publication fee (50 USD)" chosen, as in scenario 3's first bullet. Scenario 6 runs on a scratch OMP press from `POST scenarios/context` with the throwaway `manager` (the Press Manager) and `author`, and "Tidal Patterns" from `POST scenarios/submission` with `decisions: ['sendExternalReview']`; the `payments` key is OJS only, so the press's tab is saved on screen, and its control is scenario 1. Scenario 7 runs on OPS `publicknowledge` as `manager.maya` (the Preprint Server Manager), password as `docs/process/users.md` gives it; its control is scenario 1. A scratch journal's principal contact is "Site Admin" <admin@mail.test> (seed-facts). Choosing "the US dollar" in "Currency" is the list's USD entry. The mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), scoped by recipient address. Live-probed 2026-09-27: `publicknowledge` (OJS) keeps "Enable" unticked, and the `payments` key on a press answers 400 `Unsupported spec key "payments"`.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (the absence paragraph; Fields, the "Payments" tab; Rule 1; OMP1), as the Journal Manager of a scratch journal, the Press Manager of a scratch press and the Preprint Server Manager of `publicknowledge` and of a scratch server. With "Enable" unticked only "Enable" shows. Ticked, the group "Setup" holds "Enable", "Currency" (181 currencies by name, the first "UAE Dirham", none chosen, no empty choice) and "Payment Plugins" (none chosen on the journal, "Manual Fee Payment" on the press), then the groups "Manual Fee Payment" and "Paypal Fee Payment" with "Test Mode", both shown with either method chosen and with none. On the journal the two method groups came "Manual Fee Payment" first before any save and "Paypal Fee Payment" first after one; the OMP suite's test run of 2026-09-27 read "Paypal Fee Payment" first, in the groups and in "Payment Plugins", on four new presses never saved (each read twice), while the OJS suite read "Manual Fee Payment" first on a new journal seeded with its payment settings, so the order does not follow the context's own save and the body gives none. "Save" showed "Saved"; instructions changed while "Enable" was unticked were stored and showed again when it was ticked. On the journal "Institutions" and "Payments" joined the side menu on the same page after a ticked save; after an unticked one both were gone once the page was loaded again (the same page kept "Institutions", note f-a12); the press's side menu gained neither. An unsaved change survived switching to "License" and back, and was dropped with no question on leaving by the side menu or reloading, on both apps. The press's "Enable" box reads "…enabled for this press…". The server's Distribution tabs read "License, DOIs, Search Indexing, Access, Statistics"; its `/payments` and `payment/pay/1` answered "404 Not Found", its side menu had no "Payments" or "Institutions", and its workflow header read "Preview", "Activity Log", "Library".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rules 2, 5; Actors row 2), on scratch journals with "Article Processing Charge" 50, a Submission-stage, a review-stage and a Production submission, as the assigned Section Editor and the Journal Manager. The header's "Payments", the "Request Payment" page of "Accept and Skip Review" and "Accept Submission", and the publish window's "Publication Fee not paid…" all showed with "Manual Fee Payment" and instructions, and with "Paypal Fee Payment" and "Account Name" "test". None showed with the instructions empty, with "Account Name" empty, with the fee emptied, or with "Enable" saved unticked (the first page then read "…: Notify Authors"), whether the fee had been requested, never requested or recorded "Waived"; all came back with the fee. With "Currency" never chosen the option read "Request publication fee (50 )", with USD "(50 USD)". The "Subscription Policies" note "Note: To enable these options, the Journal Manager must enable the online payments module…" showed exactly while payments were not set up. The Subscription Manager opened "Payment Types" and "Payments", and "Save" showed "Your changes have been saved."; at the page's address the Section Editor, Guest Editor, Copyeditor, Layout Editor, Funding Coordinator, Author, Reviewer and Reader got the access-denied page and a signed-out visitor the Login page; on `publicknowledge`, `admin`, `manager.maya` and `editor.diana` opened it and `sectioneditor.ana`, `copyeditor.carla`, `author.alex`, `reviewer.julia` and `reader.rosa` were refused; OMP and OPS answered "404 Not Found".

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Fields, the "Payment Types" tab; Rules 4, 4a; A4) on scratch journals, as the Journal Manager: the headings, sentences and boxes as Fields gives them, and under "Save" "Required fields are marked with an asterisk: *" with no box marked or required. "abc", "-5" and "10,50" in "Article Processing Charge", "abc" in "Purchase Issue" and in "Association Membership", and "-1" in "Association Membership" were refused with "Errors occurred processing this form" at the top and "All costs must be positive numeric values (decimal points are allowed)" at the top and under the box; every box kept the typed value until a reload, after which each held its earlier value, and a refused save that also changed "Purchase Article" (5 to 6) and unticked "Only Restrict Access…" stored neither. "12.50" reloaded as "12.5", "1e3" as "1000"; "0" still read "0" right after "Save" and empty after a reload. All five boxes saved at once; the empty tab saved; the tab opened and saved on a journal whose payments were never enabled and on one with "Enable" off. With "33" typed and not saved, pressing the "Payments" tab asked "The data on this form has changed. Do you wish to continue without saving?": "Cancel" kept the tab with "33", "OK" opened the other tab and "Payment Types" then held the stored value; leaving the page raised the browser's leave question and dropped the change. The OJS suite's test run of 2026-09-27 (Rule 4; scenario 2): the form a refused save returns labels the refused box with the message itself, in place of "Article Processing Charge", while "Purchase Issue", "Purchase Article" and "Association Membership" keep their labels; the fresh form after a reload names the box "Article Processing Charge" again.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rule 7; A1), on a scratch journal requiring subscriptions with "Article Processing Charge" 50, "Purchase Article" 5 and "Association Membership" 20, as a visitor, a Reader and an Author: the home page, About the Journal, Submissions, Subscriptions, Contact, Privacy Statement, the current issue, Archives and the article; the Reader's "My Subscriptions", the seven Profile tabs and the Dashboard; every step of the Author's submission wizard through "Submission complete". The only amounts were the locked galley links' "(USD 5)" on the home page's current issue, the issue page and the article page, and the "Subscriptions" page's subscription type cost "10.00 (USD)". About the Journal lists no fee and has no "Policies" section. With "Purchase Article" emptied the links read "Requires Subscription PDF" with no amount. OMP and OPS `publicknowledge`: "About the Press", "About the Server" and "Submissions" show no fee.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rules 8, 13; Side effects, "Payment Request Notification" and the Author's task) on scratch journals: the assigned Section Editor's "Accept and Skip Review" opened on "Accept and Skip Review: Request Payment" with "Request publication fee (50 USD)" chosen and "Waive", and "Accept Submission" on "Accept Submission: Request Payment". Recorded with either option, the submitting Author and a co-author assigned as a participant each received "Payment Request Notification" from the principal contact and gained the task "The publication fee is due for payment." with the title under it, which opened `payment/pay/{id}`; the Section Editor, Guest Editor, Journal Manager, Copyeditor and principal contact received nothing. After the fee was changed to 75 and the currency to EUR, new requests read "(75 USD)" and "(75 EUR)", while the earlier request's page kept "50.00 (USD)". The email's body is verbatim through "…please visit {link}.", then "If you have any questions, please see our Submission Guidelines" linking `about/submissions`, then "— This is an automated message from {journal}." with the journal's name linking home. The menu still read "Unpaid", the Section Editor's Tasks panel was empty, and the Activity Log listed the decision and its email with no line for the request. The Author ticked the task and pressed "Delete": it went at once and did not come back, and the email's link still opened "Manual Fee Payment".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Actors row 5; Fields, the manual page; Rules 9, 10; Side effects, "Manual Payment Notification"): signed out, the email's link led to the Login page, and signing in there landed on the payment page; the submitting Author and a co-author both opened it. The page read "Manual Fee Payment", "Title" "Publication Fee", "Fee" "50.00 (USD)", the instructions with their line break, and "Send notification of payment" (a link styled as a button); a Reader's purchases showed "Subscription Fee ({type name})" "10.00 (USD)", "Purchase Article Fee" "5.00 (USD)" and "Purchase Issue Fee" "7.00 (USD)". Pressing the button showed "Payment Notification", "Payment notification sent" and "Continue", and the principal contact received "Manual Payment Notification" from the Author's own name and address, verbatim; a second press, from the task again, sent a second one. "Continue" led to My Submissions with the submission's workflow open.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 9): the Author and the Journal Manager at `payment/pay/999999`, and at `payment/pay` with no number, got the page "Payment" with "A payment has been requested, but the request has expired. Contact the Journal Manager for details."; a signed-out visitor got the Login page. OMP and OPS answered "404 Not Found".

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 9; A3), on scratch journals after a request: with "Enable" saved unticked the header's "Payments" was gone, yet the Author's task and email link still opened "Manual Fee Payment", and "Send notification of payment" still reached the principal contact (0 to 1). With "Enable" ticked and "Manual Payment Instructions" emptied, the link gave a blank page (note f-a3). Once a method is chosen, "Payment Plugins" offers only "Paypal Fee Payment" and "Manual Fee Payment", with no empty choice, on a journal and on a press.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rules 3, 9; A10): after a request under "Manual Fee Payment", the journal switched to "Paypal Fee Payment" with "Account Name" "test" and "Client ID" and "Secret" empty or "x": the Author's task opened a page reading only "A transaction error occurred. Please contact the journal manager for details.", with "Test Mode" ticked or not; switched back to "Manual Fee Payment" with instructions, the same task opened the manual page again.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 (Rules 11, 13, 14, 16; A2) on scratch journals: after the request and after two notifications the menu read "Unpaid" and the list "No Items". The menu arrived on "Unpaid" on every submission never requested, and on the record after reopening and after a reload; it was offered at the Submission, Review, Copyediting and Production stages and on a published article. "Paid" recorded the submitting Author (not the co-author) at the fee and currency of that moment ("75 USD", then "75 EUR"); "Waived" recorded the person who saved, "0"; "Unpaid" removed the row. Saving "Paid" again kept one row with the same timestamp; "Paid" to "Waived" replaced it. No email reached the Author, co-author, Section Editor, Journal Manager or principal contact, and the Activity Log kept its 18 rows. After "Paid" and after "Waived" the Author's task still opened the manual page with "50.00 (USD)", and a further notification reached the principal contact. "Paid" chosen without "Save" still showed after the menu was closed and opened again; leaving the workflow raised no question, and the menu then read "Unpaid".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Rule 15): on a Production submission never requested and on one requested with "Waive", both "Unpaid", "Schedule For Publication" › "Confirm" listed "The following requirements must be met before this can be published. Publication Fee not paid. To schedule item for publication notify author to pay fee or waive fee."; after "Waived" it read "All publication requirements have been met…" and the article scheduled; after "Paid" another published. With "Unpaid" then saved on the published article, its new version was refused with the same line.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Actors row 4; A6): the header's "Payments", with "Publication Fee", "Waived", "Paid", "Unpaid" and "Save", was offered to the Journal Manager, Editor, Production Editor, Site Administrator, the assigned Section Editor and Guest Editor, and the assigned Copyeditor, Layout Editor, Proofreader and Funding Coordinator; the Author's and co-author's views had none, and the editorial address refused them. The assigned Copyeditor saved "Paid" ("Saved", "Paid" after a reload, the list's row "Publication Fee 50 USD"); the assigned Layout Editor saved "Waived" (the row "Publication Fee 0" in the Layout Editor's name), and a waived article then scheduled.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Actors row 6; Rule 7a; A7, A9), on scratch journals with payments set up and "Association Membership" 20, in two runs: as a signed-in Reader, the home page, About the Journal, the "Subscriptions" page, "My Subscriptions" and every Profile tab offered no membership. The journal's address followed by "user/payMembership" opened "Manual Fee Payment" with "Title" "Individual Membership Fee" and "Fee" "20.00 (USD)"; "Send notification of payment" showed "Payment notification sent" with "Home" as the only link, the principal contact received a "Manual Payment Notification" for "Individual Membership Fee" ("The cost is 20 (USD)."), the list of payments stayed "No Items" and the locked galleys stayed locked. Signed out, and signed in on a journal with payments off, the address gave a blank page (note f-a9). OMP and OPS `publicknowledge` answered "404 Not Found" at the address.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-27 (Rule 10; Side effects; Settings bullet 9; A8): on a journal whose "Subscription Policies" name a subscription contact, a Reader's "Send notification of payment" for a subscription bought, one renewed, an article and an issue each reached the principal contact, and the subscription contact received nothing. "Continue" led to the current issue after a purchase, "My Subscriptions" after a renewal, and the article's and the issue's pages. Manage Emails lists "Payment Request" and no row for the manual payment notification; "Edit Payment Request" took an added sentence, and the next request's email carried it. Live-probed 2026-09-25 (seen while checking Subscriptions): the purchase's email went from the reader's own address to the principal contact.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-27 (Fields, the list; Rule 17; A11): the columns "User", "Payment Type", "Amount", "Timestamp"; a fresh journal's list read "No Items" and "0 - 0 of 0 items", two records "1 - 2 of 2 items" (no longer list was reached); newest first, a waiver saved at 00:24:27 above a payment saved at 00:24:19, "Timestamp" reading "2026-09-27 00:24:19"; only the journal's own records; the Subscription Manager read the same rows. "Paid" saved by a Section Editor showed the submitting Author's name, "Waived" the saver's; "50 USD", a waiver "0", with no currency "50". Pressing a row sent nothing and opened nothing; there are no row controls and no search. After the Author on a "Paid" record was merged into another account, the list stayed on "Loading" (note f-a11).

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-29, two runs on each app (Fields, the manual page; Rule 9): on a scratch press selling in US dollars with "Manual Fee Payment", a book's link read "25 Purchase PDF (25 USD)"; pressed signed out it led to the Login page, whose text carried no reason. Signing in there as the press's Reader landed on the press's home page, as its Press Manager on the Dashboard ("Assigned to me (0)"), neither on the payment page; the Reader, back on the book's page, pressed the link and got "Manual Fee Payment" at once. That page, under "Home / Manual Fee Payment", read the instructions first, then "Title" and "Fee", then "Send notification of payment" as a plain link. Mechanism: OMP `CatalogBookHandler::download()` sends a visitor to Login with `source` the file's `catalog/view/…` address built by `$request->url()`, an absolute URL; lib/pkp `LoginHandler::signIn()`/`_redirectAfterLogin()` follows only a `source` starting with "/" and otherwise redirects home (`index` for a Reader, `dashboard/editorial` for a manager role). The OJS controls held: a subscription journal's "Requires Subscription or Fee PDF (USD 5)" and "Requires Subscription or Fee Full Issue (USD 7)", pressed signed out, led to Login with "Subscription or article purchase required to access item. …" (a relative `source`), and signing in there as a Reader opened "Manual Fee Payment" with "Purchase Article Fee" "5.00 (USD)" and "Purchase Issue Fee" "7.00 (USD)", laid out as Fields says.

<a id="fn-f-a1"></a>
**f-a1** — `paymentTypesForm.tpl` prints `manager.payment.readerFeesDescription` and `manager.payment.generalFeesDescription`; no page reads the fees (note e). The About listing of fees belonged to OJS 2 (its locale keys remain, unused). Live-probed 2026-09-27 (note td4): no page lists a fee, and the only amounts are the locked galley links'.

<a id="fn-f-a2"></a>
**f-a2** — The menu's save fulfils a queued payment it creates itself, so the requested one and its task stay (note i). Live-probed 2026-09-27 (note td10): after "Paid" and after "Waived" the task opened the manual page with the request's "50.00 (USD)", and its notification reached the principal contact.
Issue report: [pkp-e2e#353](https://github.com/jardakotesovec/pkp-e2e/issues/353) ([docs/issues/U52-A2-fee-task-stays-after-fee-recorded.md](../issues/U52-A2-fee-task-stays-after-fee-recorded.md)).

<a id="fn-f-a3"></a>
**f-a3** — `PaymentManager::getPaymentForm()` returns `false` when the chosen plugin is not configured, and `PaymentHandler::pay()` calls `display()` on the result. `ManualPaymentPlugin::isConfigured()` reads only `manualInstructions` (note d); neither `pay()` nor `plugin()` reads `paymentsEnabled`, so with "Enable" off the page and its notification still work. Live-probed 2026-09-27 (note td8): with the instructions emptied, `GET {journal}/payment/pay/{id}` answered 500 with an empty page, logged "Uncaught Error: Call to a member function display() on false in pages/payment/PaymentHandler.php:77".

<a id="fn-f-a4"></a>
**f-a4** — `paymentTypesForm.tpl` ends with `common.requiredField` though no element carries `required`. Live-probed 2026-09-27 (note td3): the line's asterisk is the only one in the form, and the empty tab saves.

<a id="fn-f-a5"></a>
**f-a5** — `PKPBackendPaymentsSettingsController::edit()` validates `currency` only when sent and the rule skips an empty value; no set-up check reads it; `RequestPaymentDecisionForm` builds `publicationFee . ' ' . currency`; `paymentForm.tpl` drops the code `{if $itemCurrencyCode}`. A new journal has no `currency` row, and the `FieldSelect` offers no empty option. Live-probed 2026-09-27 (notes td1, td2): "Request publication fee (50 )", the manual page's "Fee 50.00" and the list's "50" on a journal set up with no currency; the list's first choice "UAE Dirham" and no blank one.

<a id="fn-f-a6"></a>
**f-a6** — The menu is given to every editorial view and its save admits `ROLE_ID_ASSISTANT` with submission access (notes c, g). Live-probed 2026-09-27 (note td12): an assigned Copyeditor saved "Paid" and an assigned Layout Editor "Waived", and the waived article scheduled.

<a id="fn-f-a7"></a>
**f-a7** — Note m; `payment.membership.buyMembership` "Buy Individual Membership" and `.renewMembership` are used nowhere. Live-probed 2026-09-27 (note td13).

<a id="fn-f-a8"></a>
**f-a8** — `ManualPaymentPlugin::handle('notify')` sends to `contactEmail` for every payment type; `subscriptionEmail` is read only by `SubscriptionAction` and the subscription forms. Live-probed 2026-09-25 (seen while checking Subscriptions): the principal contact received it. Live-probed 2026-09-27 (note td14): the same for a renewal, an article and an issue.

<a id="fn-f-a9"></a>
**f-a9** — `UserHandler::payMembership()` (note m) reads `$user->getId()` with no sign-in check, and with payments not set up queues the membership payment and then calls `display()` on the `false` that `getPaymentForm()` returns. Live-probed 2026-09-27 (note td13), two runs: `GET {journal}/user/payMembership` answered 500 with an empty page for a signed-out visitor on a scratch journal and on `publicknowledge` (logged "Uncaught Error: Call to a member function getId() on null in pages/user/UserHandler.php:434"), and for a signed-in Reader on a journal with payments off (logged "Call to a member function display() on false in pages/user/UserHandler.php:438", after the queued payment was written).

<a id="fn-f-a10"></a>
**f-a10** — `PaypalPaymentForm::display()` shows `plugins.paymethod.paypal.error` through `frontend/pages/message.tpl` with no `pageTitle` (note l). Live-probed 2026-09-27 (note td9): the page's `h1` empty, the breadcrumb "Home /", the browser title "| {journal}".
Issue report: [pkp-e2e#352](https://github.com/jardakotesovec/pkp-e2e/issues/352) ([docs/issues/U52-A10-paypal-error-page-no-heading.md](../issues/U52-A10-paypal-error-page-no-heading.md)).

<a id="fn-f-a11"></a>
**f-a11** — `completed_payments.user_id` references `users` with `onDelete('set null')` (OJS `OJSMigration`), and neither lib/pkp nor OJS `Repository::mergeUsers()` moves completed payments, so the merge leaves the record with no user; `OJSCompletedPaymentDAO::_fromRow()` then passes `null` to `Payment::setUserId(int)`. Every read of the journal's completed payments fails: the list's `PaymentsGridHandler::loadData()`, the menu's `SubmissionPaymentsForm` and `Repository::validatePublish()` (notes f, g, j). The grid's "[Nonexistent user]" is never reached. Live-probed 2026-09-27 (note td15), two journals, five runs: server 500 on `GET {journal}/$$$call$$$/grid/subscriptions/payments-grid/fetch-grid` and on `GET {journal}/$$$call$$$/modals/publish/publish/publish?submissionId={id}&publicationId={id}` (logged "Uncaught TypeError: PKP\payment\Payment::setUserId(): Argument #1 ($userId) must be of type int, null given, called in classes/payment/ojs/OJSCompletedPaymentDAO.php"), and on `GET {journal}/api/v1/submissions/{id}/publications/{id}/_components/submissionPayment`; another submission's waiver still read "Waived".

<a id="fn-f-a12"></a>
**f-a12** — ui-library `src/components/Container/SettingsPage.vue`: on the `form-success` of `FORM_PAYMENT_SETTINGS` with `paymentsEnabled` off it deletes only `menu.payments`; `menu.institutions`, which the same handler adds with `payments` when `paymentsEnabled` is on, is removed only by the `FORM_CONTEXT_STATISTICS` branch (note d). The server builds the menu afresh on every page load, so a reload drops the entry. OJS suite's test run of 2026-09-27 (Rule 1; scenario 1): after "Save" with "Enable" unticked the side menu held "Institutions" and no "Payments" for the whole 10-second wait on the suite's scratch journal, and the same after each of two unticked saves on another scratch journal driven by hand; after a reload it held neither; a ticked save added both on the same page.
Issue report: [pkp-e2e#354](https://github.com/jardakotesovec/pkp-e2e/issues/354) ([docs/issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md](../issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `schemas/context.json` `paymentPluginName` default `ManualPayment`, applied when a press is created; OJS gives no default (note b). Live-probed 2026-09-27 (note td1): the press arrived with "Manual Fee Payment" chosen and "Enable" unticked, the journal with none chosen.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Settings › Distribution › "Payments" tab and its "Save" (journal and press) | `{context}/management/settings/distribution`, tab "Payments"; saves `PUT {context}/api/v1/_payments` | AFFM-094 · API-005 |
| "Manual Fee Payment": its settings box, payment page and "Send notification of payment" | the tab's group; `{journal}/payment/pay/{id}`; `payment/plugin/ManualPayment/notify/{id}` | PLUG-041 · AFFR-104 · ROUTE-045 |
| "Paypal Fee Payment": its settings boxes and the redirect to PayPal | the tab's group; `payment/plugin/PaypalPayment/return` | PLUG-042 · ROUTE-045 |
| "Payments" page tab bar (cited; the Subscriptions spec's) | side menu › "Payments" (`{journal}/payments`) | AFFM-172 · ROUTE-046 |
| "Payment Types" tab | `payments/paymentTypes`, `payments/savePaymentTypes` | AFFM-181 · ROUTE-046 |
| "Payments" tab (the list of payments) | `payments/payments` | GRID-083 · ROUTE-046 |
| A row's "Details" (no screen offers it) | `PaymentsGridHandler::viewPayment` | AFFM-182 |
| Workflow header "Payments" menu and its "Save" | the workflow header; `GET …/publications/{pid}/_components/submissionPayment` (cited; the publish spec's endpoint), `PUT {journal}/api/v1/_submissions/{id}/payment` | AFFW-231 · AFFW-232 · API-057 · API-051 |
| Membership purchase (no screen offers it) | `{journal}/user/payMembership` | ROUTE-052 |
| "Payment Request Notification" email | an accept decision with the fee requested | MAIL-062 |
| "Manual Payment Notification" email | "Send notification of payment" | MAIL-075 |
| Task "The publication fee is due for payment." | the Author's Tasks panel | NOTIF-047 |
| The "configure payment method" notice (raised on a journal by nothing; on a press by the direct sale, *Publication formats & proof terms*) | — | NOTIF-036 |

Handed to other specs: the "Payments" page's tab bar and the subscription
tabs (AFFM-172, ROUTE-046's other operations) and ROUTE-052's purchase
and renewal operations are [Subscriptions](U51-subscriptions.md)'s;
API-057's issue component is [Publish, schedule &
versions](U49-publish-schedule-and-versions.md)'s; the "Request Payment"
page is [Editorial decision recording](U34-editorial-decision-recording.md)'s.

## Reference — code anchors

- lib/pkp: `classes/payment/PaymentManager.php` · `QueuedPayment.php` · `QueuedPaymentDAO.php` · `CompletedPayment.php` · `Payment.php` · `classes/plugins/PaymethodPlugin.php` · `classes/components/forms/context/PKPPaymentSettingsForm.php` · `api/v1/_payments/PKPBackendPaymentsSettingsController.php` · `templates/management/distribution.tpl` · `classes/mail/variables/QueuedPaymentEmailVariable.php` · `classes/notification/PKPNotificationManager.php` (`NOTIFICATION_TYPE_PAYMENT_REQUIRED`, `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD`) · `controllers/grid/notifications/NotificationsGridCellProvider.php::_getTitle()` · `pages/management/ManagementHandler.php::distribution()`
- OJS classes: `classes/payment/ojs/OJSPaymentManager.php` · `OJSCompletedPaymentDAO.php` · `classes/subscription/form/PaymentTypesForm.php` · `classes/components/forms/publication/SubmissionPaymentsForm.php` · `classes/components/forms/decision/RequestPaymentDecisionForm.php` · `classes/decision/types/traits/RequestPayment.php` · `classes/decision/types/Accept.php` · `SkipExternalReview.php` · `classes/publication/Repository.php::validatePublish()` · `classes/mail/mailables/PaymentRequest.php`
- OJS pages, API, grids: `pages/payment/PaymentHandler.php` · `pages/payments/PaymentsHandler.php` · `pages/user/UserHandler.php::payMembership()` · `pages/management/SettingsHandler.php::distribution()` · `pages/dashboard/DashboardHandler.php` · `api/v1/_submissions/BackendSubmissionsController.php::payment()` · `api/v1/submissions/SubmissionController.php::getSubmissionPaymentForm()` · `controllers/grid/subscriptions/PaymentsGridHandler.php` · `PaymentsGridCellProvider.php`
- OJS templates and plugins: `templates/payments/paymentTypesForm.tpl` · `templates/payments/index.tpl` · `plugins/paymethod/manual/ManualPaymentPlugin.php` · `templates/paymentForm.tpl` · `mailables/ManualPaymentNotify.php` · `emailTemplates.xml` · `plugins/paymethod/paypal/PaypalPaymentPlugin.php` · `PaypalPaymentForm.php`
- ui-library: `src/pages/workflow/components/header/WorkflowPaymentDropdown.vue` · `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js::getHeaderItems()` · `src/components/Container/SettingsPage.vue` · `src/components/Form/Form.vue`
- OMP: `plugins/paymethod/manual/` · `plugins/paymethod/paypal/` · `schemas/context.json` (`paymentPluginName`) · `api/v1/_payments/index.php`
- OPS: `templates/management/distribution.tpl`
- Locale: OJS `locale/en/manager.po` `manager.payment.*`, `manager.paymentTypes`; `locale/en/locale.po` `payment.*`, `common.payment(s)`; `locale/en/emails.po` `emails.paymentRequestNotification.*`; lib/pkp `manager.paymentMethod*`, `plugins.categories.paymethod`; `plugins/paymethod/manual/locale/en/{locale,emails}.po`; `plugins/paymethod/paypal/locale/en/locale.po`
