/**
 * @OnlyCurrentDoc
 * (The line above limits this script's permission to the one spreadsheet it is attached to.)
 *
 * Testimonials backend for swarnendughosh.com
 *
 * A tiny Google Apps Script web app that lives inside a Google Sheet.
 *
 *   POST (visitor submits)  -> a basic sentiment check runs:
 *                                clearly positive and safe  -> Status "Verified"   (appears on the site straight away)
 *                                anything else              -> Status "Unverified" (waits for you)
 *   GET ?action=list        -> ONLY the "Verified" rows, plus how many rows are still "Unverified"
 *   GET ?action=status&id=  -> the Status of one submission (so the sender can be told if theirs is pending)
 *
 * You can override any decision: change the Status cell to Verified / Unverified / Rejected. The site picks it up on the next load.
 * Setup steps are in README.md.
 */

var SHEET_NAME = "Testimonials";
var HEADERS = ["Timestamp", "Name", "Relationship", "Institution / role", "Testimonial", "Status", "Notes (private)", "Sentiment", "Score", "ID", "Photo"];
var COL = { TS: 0, NAME: 1, REL: 2, ORG: 3, MSG: 4, STATUS: 5, NOTES: 6, SENT: 7, SCORE: 8, ID: 9, PHOTO: 10 };
var MAX_PHOTO_CHARS = 30000;              // a small square JPEG (about 112 px) as a data URL; a sheet cell holds up to 50,000 characters
var MAX_PER_HOUR = 30;                    // simple spam brake for the whole site
var AUTO_VERIFY_MIN_SCORE = 2;            // net positive points needed for automatic verification

/* ------------------------------------------------------------------ one-time setup */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight("bold").setBackground("#1F3864").setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  var dropdown = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Unverified", "Verified", "Rejected"], true).setAllowInvalid(false).build();
  sh.getRange(2, COL.STATUS + 1, 2000, 1).setDataValidation(dropdown);
  var area = sh.getRange(2, 1, 2000, HEADERS.length);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Verified"').setBackground("#E2EFDA").setRanges([area]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Unverified"').setBackground("#FFF2CC").setRanges([area]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$F2="Rejected"').setBackground("#EDEDED").setRanges([area]).build()
  ]);
  [160, 160, 170, 200, 520, 100, 260, 110, 70, 150, 90].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, COL.MSG + 1, 2000, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange(2, COL.PHOTO + 1, 2000, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);   // keep the long photo text from stretching rows
  Logger.log("Sheet ready. Now deploy as a web app (see README).");
}

/* ------------------------------------------------------------------ helpers */
function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error("Run setup() first.");
  return sh;
}
/** Older sheets have no "Photo" column header yet: add it the first time it is needed. */
function ensureHeaders_(sh) {
  if (!String(sh.getRange(1, COL.PHOTO + 1).getValue()).trim()) {
    sh.getRange(1, COL.PHOTO + 1).setValue("Photo").setFontWeight("bold").setBackground("#1F3864").setFontColor("#FFFFFF");
    sh.setColumnWidth(COL.PHOTO + 1, 90);
    sh.getRange(2, COL.PHOTO + 1, 2000, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
}
/** Accept only a small base64 JPEG data URL; anything else is dropped. */
function photo_(value) {
  var s = String(value == null ? "" : value).trim();
  return (s.length <= MAX_PHOTO_CHARS && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(s)) ? s : "";
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
/** Trim, cap length, and neutralise spreadsheet formulas (a value starting with = + - @ would be run as a formula). */
function clean_(value, max) {
  var s = String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/* ------------------------------------------------------------------ basic sentiment checker (word lists, no external service) */
var POSITIVE = ("excellent great good amazing wonderful fantastic inspiring inspirational helpful supportive brilliant kind patient " +
  "knowledgeable clear insightful thoughtful dedicated generous caring friendly encouraging motivating motivational outstanding " +
  "exceptional superb impressive admire admirable approachable passionate enthusiastic professional reliable respectful humble gifted " +
  "talented valuable beneficial enjoyable engaging lovely best love loved recommend recommended grateful thankful appreciate " +
  "appreciated rewarding effective efficient creative innovative organised organized inspire inspired guidance mentor mentored " +
  "mentorship fortunate privilege pleasure delight delighted perfect awesome smart clever wise understanding committed trustworthy " +
  "sincere cooperative collaborative happy glad").split(" ");
var NEGATIVE = ("bad poor terrible awful horrible rude unhelpful disappointing disappointed disappointment arrogant waste worst boring " +
  "confusing useless unprofessional lazy hate hated dislike unfair disrespectful dismissive careless negligent incompetent unreliable " +
  "unresponsive ignored ignorant mediocre pathetic annoying frustrating frustrated unpleasant toxic harsh misleading dishonest " +
  "unethical rubbish garbage nonsense stupid dumb liar fake scam fraud avoid regret regretted overrated").split(" ");
var NEGATORS = ("not no never hardly barely cannot cant dont doesnt didnt isnt wasnt arent werent wont wouldnt couldnt shouldnt " +
  "havent hasnt hadnt neither nor").split(" ");
var INTENSIFIERS = "very really extremely incredibly truly highly absolutely deeply genuinely so".split(" ");
// Patterns (not whole words) so "fucking", "shitty", "bitchy" etc. are caught too
var PROFANITY_PATTERNS = [/fuck/, /shit/, /bitch/, /asshole/, /bastard/, /\bcrap(py|s)?\b/, /\bdick(head)?\b/, /slut/, /cunt/, /\bpiss(ed|ing)?\b/, /\bwtf\b/, /\bstfu\b/];

function setOf_(arr) { var o = {}; arr.forEach(function (w) { o[w] = true; }); return o; }
var POS_SET = setOf_(POSITIVE), NEG_SET = setOf_(NEGATIVE), NOT_SET = setOf_(NEGATORS), INT_SET = setOf_(INTENSIFIERS);

/** Returns { label, score, pos, neg, flags[], verify }. verify is true only for clearly positive, safe text. */
function analyze_(text, extraFields) {
  var raw = String(text || "");
  var tokens = raw.toLowerCase().replace(/['’]/g, "").split(/[^a-z]+/).filter(Boolean);
  var pos = 0, neg = 0, score = 0;
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i], polarity = POS_SET[t] ? 1 : NEG_SET[t] ? -1 : 0;
    if (!polarity) continue;
    var weight = (i > 0 && INT_SET[tokens[i - 1]]) ? 2 : 1;
    var negated = false;
    for (var k = Math.max(0, i - 3); k < i; k++) if (NOT_SET[tokens[k]]) negated = true;   // "not helpful", "never rude"
    if (negated) polarity = -polarity;
    if (polarity > 0) { pos += weight; score += weight; } else { neg += weight; score -= weight; }
  }
  var flags = [];
  var all = raw + " " + (extraFields || []).join(" ");
  if (/https?:|www\.|\b[a-z0-9-]+\.(com|net|org|in|io|co|ru|xyz|info|biz|me|ly)\b|@[a-z0-9.-]+\.[a-z]{2,}/i.test(all)) flags.push("contains a link or email address");
  if (/\+?\d[\d\s().-]{7,}\d/.test(all)) flags.push("contains a phone number");
  if (/<[^>]+>/.test(all)) flags.push("contains HTML");
  var lowerAll = all.toLowerCase();
  if (PROFANITY_PATTERNS.some(function (re) { return re.test(lowerAll); })) flags.push("contains strong language");
  var letters = raw.replace(/[^A-Za-z]/g, "");
  if (letters.length > 30 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) flags.push("mostly capital letters");
  if (/(.)\1{5,}/.test(raw)) flags.push("repeated characters");
  if (tokens.length >= 8 && Object.keys(setOf_(tokens)).length / tokens.length < 0.4) flags.push("repetitive text");

  var label = flags.length ? "Flagged" : (score >= AUTO_VERIFY_MIN_SCORE && neg === 0) ? "Positive" : (score <= -1 || neg > pos) ? "Negative" : "Neutral/mixed";
  return { label: label, score: score, pos: pos, neg: neg, flags: flags, verify: label === "Positive" };
}

/* ------------------------------------------------------------------ web app endpoints */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.website) return json_({ ok: true, status: "Unverified" });             // honeypot: bots fill this; pretend it worked
    var name = clean_(data.name, 80), org = clean_(data.org, 100), msg = clean_(data.message, 1000);
    var rel = clean_(data.relationship, 80), photo = photo_(data.photo);
    if (!name || msg.length < 20) return json_({ ok: false, error: "Please give your name and a testimonial of at least 20 characters." });
    if (data.consent !== true) return json_({ ok: false, error: "Please confirm you are happy for this to be shown." });

    var verdict = analyze_(msg, [name, org, rel]);
    var autoOk = verdict.verify && !photo;            // a photo is never shown without you looking at it first
    var status = autoOk ? "Verified" : "Unverified";
    var note = autoOk ? "Auto-verified: positive (score " + verdict.score + ")"
      : "Held for review: " + (photo && verdict.verify ? "includes a photo (text was positive, score " + verdict.score + ")" : (verdict.flags.length ? verdict.flags.join("; ") : verdict.label.toLowerCase() + " (score " + verdict.score + ")") + (photo ? "; includes a photo" : ""));
    var id = Utilities.getUuid().replace(/-/g, "").slice(0, 16);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var cache = CacheService.getScriptCache();
      var key = "n_" + Math.floor(Date.now() / 3600000);
      var used = Number(cache.get(key) || 0);
      if (used >= MAX_PER_HOUR) return json_({ ok: false, error: "Too many submissions right now. Please try again later." });
      cache.put(key, String(used + 1), 3700);
      var sh = sheet_(); ensureHeaders_(sh);
      sh.appendRow([new Date(), name, rel, org, msg, status, note, verdict.label, verdict.score, id, photo]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, status: status, id: id });
  } catch (err) {
    return json_({ ok: false, error: "Could not save your testimonial." });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "list";
  var rows = sheet_().getDataRange().getValues().slice(1);

  if (action === "status") {                       // the sender asks about their own submission, by its private id
    var id = String((e.parameter && e.parameter.id) || "");
    for (var i = 0; id && i < rows.length; i++) {
      if (String(rows[i][COL.ID]) === id) return json_({ status: String(rows[i][COL.STATUS]).trim() || "Unverified" });
    }
    return json_({ status: "unknown" });
  }

  var verified = [], pending = 0;                  // public list: only Verified rows leave the sheet; Unverified ones are just counted
  rows.forEach(function (r) {
    var status = String(r[COL.STATUS]).trim().toLowerCase();
    if (status === "verified") {
      verified.push({
        name: String(r[COL.NAME]), role: String(r[COL.REL]), org: String(r[COL.ORG]), quote: String(r[COL.MSG]),
        year: (r[COL.TS] instanceof Date) ? r[COL.TS].getFullYear() : "",
        photo: photo_(r[COL.PHOTO])
      });
    } else if (status === "unverified") {
      pending++;
    }
  });
  return json_({ verified: verified, pending: pending });
}
