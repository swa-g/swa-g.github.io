# Testimonials: how it works and how to switch it on

**Flow:** a visitor fills the form on the site -> a basic sentiment check runs -> a clearly positive, safe testimonial is
**auto-verified** and appears straight away; anything else is saved as **Unverified** and waits for you.
Either way the visitor is told what happened. While any row is Unverified, the site shows a small
"* Some testimonials are pending verification" note under the slider. No email is involved.

A public website cannot write into a file on your own computer, so the "Excel file" lives in Google Sheets. It opens in
Excel at any time: in the sheet use **File > Download > Microsoft Excel (.xlsx)**.

## One-time setup (about 5 minutes)

1. Go to <https://sheets.google.com> and create a blank spreadsheet. Name it e.g. "Website testimonials".
2. **Extensions > Apps Script**. Delete the sample code and paste in everything from `Code.gs` (this folder). Click **Save**.
3. In the toolbar choose the function **setup** and click **Run**. Approve the permissions when asked (it only touches this sheet).
   A "Testimonials" tab appears with headings, a Status dropdown and row colours.
4. **Deploy > New deployment > type: Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Put that URL in `assets/testimonials-config.js` as `endpoint` (or just give it to Claude), then push the site.

## Updating an existing setup to this version (adds the sentiment check)

1. Open your sheet, **Extensions > Apps Script**, replace the code with the new `Code.gs`, **Save**.
2. Run **setup** again (it adds the Sentiment, Score and ID columns; your rows are kept).
3. **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**. The URL stays the same.

## What the sentiment check does

- It counts positive and negative words, understands simple negation ("not helpful", "never rude") and intensifiers ("very helpful").
- **Auto-verified** only when the text is clearly positive (net score of 2 or more, no negative words) AND nothing suspicious is found.
- **Held as Unverified**: negative, mixed or neutral text, and anything flagged: links or email addresses, phone numbers, HTML,
  strong language, mostly capital letters, repeated characters, or very repetitive text.
- It is a simple word-list check, not an AI, so it can misjudge sarcasm or unusual wording. Check the **Sentiment**, **Score** and
  **Notes** columns now and then, and change Status to **Rejected** for anything you do not want shown. The site picks the change
  up on the next page load.
- Because positive text is published automatically, anyone could post a nice message under someone else's name. If that ever
  happens, set that row to Rejected. If you would rather approve everything by hand, set `AUTO_VERIFY_MIN_SCORE` in `Code.gs` to `999`.

## Day to day

- Auto-verified rows arrive in green, held rows in yellow (Status **Unverified**, reason in Notes).
- To approve a held row, change Status to **Verified**. To hide any row, change it to **Rejected** (grey).
- Nothing to publish or push; the site reads the sheet live.
- Columns: Timestamp, Name, Relationship, Institution / role, Testimonial, Status, Notes (private), Sentiment, Score, ID.
  Notes, Sentiment, Score and ID are never sent to the website.

## What visitors are told

- Published straight away: "your testimonial has been verified and published".
- Held: "submitted and is pending verification". On later visits (same browser) a note says whether it is still pending,
  is now live, or was not accepted. This uses a private random id stored in their browser; the server returns only the Status.

## What the public can and cannot see

- The public endpoint returns only Verified rows (name, relationship, institution, testimonial, year).
- Unverified text is never returned, only the count (that is what drives the asterisk).
- Spam brakes: hidden honeypot field, length limits, at most 30 submissions per hour.
- Text starting with `= + - @` is stored as plain text so it cannot run as a spreadsheet formula.
