# אפיון UX/UI מלא - INSHOP

מסמך זה הוא חוזה המסכים ל-Claude Code. האבטיפוס החי נמצא ב-`prototype/index.html` ומשלים את הטבלאות כאן.

---

## 1. עקרונות עיצוב

### 1.1 שפה וכיוון

- כל הממשק בעברית וב-RTL.
- מזהים טכניים, מספרי חשבוניות, סכומים וקודים מוצגים באופן קריא גם בתוך RTL באמצעות `dir="ltr"` נקודתי.
- שמות שדות ופעולות נשארים עקביים בכל המודולים.

### 1.2 היררכיה ויזואלית

- רקע אפליקציה בהיר מאוד.
- כרטיסים לבנים עם גבול עדין וצל מינימלי.
- צבע ראשי סגול כהה, בדומה לאבטיפוסים המקוריים.
- הצלחה בירוק, שגיאה/חוסר באדום, אזהרה בכתום, מידע בכחול.
- כפתור ראשי אחד מודגש בכל אזור פעולה.
- מידע מחושב ו-AI מופיעים בקופסאות נפרדות ולא נראים כמו שדות שהמשתמש הזין.

### 1.3 Design tokens מומלצים

```css
--color-primary-700: #4327c7;
--color-primary-600: #5133d6;
--color-primary-100: #eeebff;
--color-success-700: #16794d;
--color-success-100: #e8f7ef;
--color-danger-700: #c43232;
--color-danger-100: #fff0f0;
--color-warning-700: #9a5a00;
--color-warning-100: #fff6df;
--color-info-700: #245caa;
--color-info-100: #edf5ff;
--color-text: #171a2b;
--color-muted: #667085;
--color-border: #e4e7ec;
--color-surface: #ffffff;
--color-page: #f7f8fc;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 18px;
--shadow-card: 0 2px 12px rgba(30, 35, 70, .06);
```

הצבעים ניתנים לשינוי מיתוגי, אך המשמעות הסמנטית קבועה.

### 1.4 טיפוגרפיה

- font stack עברי זמין במערכת, לדוגמה `Arial`, `Rubik`, `Heebo`, sans-serif.
- גוף: 16px במובייל, 14-16px בדסקטופ.
- כותרת מסך: 24-32px בדסקטופ, 20-24px במובייל.
- טקסט משני לא קטן מ-13px.
- סכומים מרכזיים: 24-32px עם משקל 700.

### 1.5 Breakpoints

- Mobile: עד 767px.
- Tablet: 768-1199px.
- Desktop: 1200px ומעלה.
- mobile-first למסכי שטח.
- desktop-first למסכי אדמין, אך אין שבירה מתחת ל-1024px.

### 1.6 רכיבים משותפים

- App header עם כותרת, breadcrumb, משתמש וסטטוס sync.
- Desktop sidebar.
- Mobile top bar + menu drawer.
- Stepper לוויזארד.
- Upload card עם camera/gallery, thumbnail, progress ו-retry.
- Status chip עם icon + טקסט.
- Alert/banner לפי חומרה.
- Money summary card.
- Image evidence strip/lightbox.
- Data table עם sticky header בדסקטופ.
- Mobile item card במקום טבלה.
- Sticky action bar בתחתית מובייל.
- Confirm dialog לפעולות בלתי הפיכות.
- Audit drawer להצגת היסטוריה.
- AI insight card עם confidence, ראיות ופעולת “אשר/תקן”.

### 1.7 מצבים שכל מסך חייב לכלול

- loading skeleton.
- empty state.
- validation errors ליד השדה וב-summary בראש המסך.
- offline/connection lost.
- server error עם correlation id ו-retry.
- unauthorized/expired link.
- success state.
- stale data/conflict: “הנתונים עודכנו על ידי משתמש אחר”.

---

# 2. מפת ניווט

## 2.1 מסכים ציבוריים/שטח

| מזהה | Route מוצע | מסך |
|---|---|---|
| SUP-01 | `/supplier/report/:token?` | העלאת חשבונית |
| SUP-02 | אותו route, step 2 | בחירת סניף ואימות |
| SUP-03 | step 3 | צילום סחורה |
| SUP-04 | step 4 | פרטי קשר ושליחה |
| SUP-05 | success | דיווח התקבל |
| TRU-01..08 | `/trustee/receive/:token` | ויזארד נאמן |
| CNT-01 | `/inventory-counts/new` | בחירת סניף ובקשת סגירה |
| CNT-02 | `/inventory-counts/:id/gate` | תוצאת legacy gate |
| CNT-03 | `/inventory-counts/:id/count` | ספירת פריטים |
| CNT-04 | `/inventory-counts/:id/summary` | סיכום ונעילה |

## 2.2 אדמין

| מזהה | Route | מסך |
|---|---|---|
| ADM-01 | `/admin/dashboard` | דשבורד תפעולי |
| ADM-02 | `/admin/deliveries` | תור אספקות |
| ADM-03 | `/admin/deliveries/:id` | אישור אספקה |
| ADM-04 | `/admin/credits` | רשימת דרישות זיכוי |
| ADM-05 | `/admin/credits/:id` | אישור מסמך זיכוי |
| RULE-01 | `/admin/order-rules` | חוקי הזמנה |
| PAY-01 | `/admin/payments` | בחירת אספקות ותשלום |
| PAY-02 | `/admin/payments/:id/review` | סקירת אמצעי תשלום |
| INT-01 | `/admin/integration/mock-data` | ניהול נתוני mock |
| AUD-01 | `/admin/audit` | יומן Audit |

## 2.3 פורטל ספק

| מזהה | Route | מסך |
|---|---|---|
| PORT-01 | `/portal` | דשבורד |
| PORT-02 | `/portal/credits` | דרישות זיכוי |
| PORT-03 | `/portal/credits/:id` | פרטי דרישה והעלאה |
| PORT-04 | `/portal/deliveries` | אספקות |
| PORT-05 | `/portal/payments` | תשלומים ויתרה |

---

# 3. ויזארד ספק במובייל

## 3.1 Shell קבוע

- רוחב תוכן מרבי 480px.
- top bar: menu, כותרת “דיווח אספקה”, icon משאית.
- stepper אופקי: 4 נקודות, label “שלב X מתוך 4”.
- אזור תוכן scrollable.
- action bar sticky: כפתור ראשי מלא רוחב וכפתור משני לפי צורך.
- draft נשמר אוטומטית אחרי כל שינוי.

## SUP-01 - העלאת חשבונית

### מבנה

1. כותרת: `צלם את החשבונית`.
2. טקסט עזר: `יש לצלם את החשבונית בצורה ברורה וקריאה`.
3. Upload card גדול, icon מסמך+מצלמה.
4. כפתורים: `צלם חשבונית`, `בחר מהגלריה`.
5. לאחר upload: thumbnail, progress, `צלם מחדש`, `מחק`.
6. AI info card: `המערכת תזהה ספק, סניף, מספר חשבונית, תאריך וסכום`.
7. CTA: `המשך`.

### ולידציה

- ללא קובץ: `יש לצלם או להעלות חשבונית`.
- קובץ גדול: `הקובץ גדול מדי. ניתן להעלות עד {maxSize}`.
- סוג לא נתמך: `ניתן להעלות JPG, PNG, HEIC או PDF בלבד`.
- תמונה מטושטשת: warning לא חוסם עם `צלם מחדש`.

## SUP-02 - בחירת סניף ואימות

### מבנה

- AI result card עם supplier, invoice number, date, total.
- select סניף searchable.
- verification card:
  - success: `הסניף שנבחר תואם לחשבונית`.
  - warning: `זוהה סניף אחר בחשבונית`.
- קישור `בחר סניף אחר`.
- CTA `המשך`.

### דיסוננס

Banner אדום/כתום:

```text
נמצאה אי-התאמה
בחשבונית זוהה “סניף רמת גן”, אך נבחר “סניף תל אביב”.
יש לתקן את הסניף או לשלוח לבדיקה.
```

פעולות:

- `תקן בחירה`.
- `שלח לבדיקה` רק אם business rule מאפשר דיווח חריג; לא מסמן כאושר.

## SUP-03 - צילום סחורה

- upload multi-image.
- thumbnail grid 3 בעמודה/שורה לפי רוחב.
- סדר תמונות עם drag בדסקטופ או arrows במובייל.
- דוגמאות צילום טובות מוצגות כ-collapsible help, לא תמונות כבדות כברירת מחדל.
- counter `3 מתוך 10 תמונות`.
- CTA `המשך`.

## SUP-04 - פרטי ספק ושליחה

### אזורים

- success card: `החשבונית והסחורה נקלטו`.
- form:
  - שם מלא.
  - מספר טלפון.
  - הערה אופציונלית.
- info card: `לאחר השליחה, הנאמן בסניף יקבל הודעה וקישור לקליטה`.
- primary: `שלח ושלח לנאמן`.
- secondary: `חזור לשלב הקודם`.

### מסך הצלחה SUP-05

- icon success.
- `הדיווח נשלח בהצלחה`.
- מספר אספקה.
- ספק, סניף, תאריך.
- `ניתן לסגור את החלון`.
- אין כפתור ששולח שוב.

---

# 4. ויזארד נאמן במובייל

## 4.1 Shell

- 8 שלבים עם stepper מקוצר: מספר + progress bar; אין צורך להציג שמונה labels בו-זמנית.
- כותרת קבועה `קליטת אספקה`.
- שם הנאמן ותמונה באזור compact.
- שמירת draft אחרי כל שורה/תמונה.

## TRU-01 - סריקת חשבונית

זהה ל-upload supplier, עם label `סרוק את החשבונית שנמצאת עם הסחורה`.

## TRU-02 - אימות סניף

- נתוני חשבונית.
- סניף אספקה preselected.
- success/warning.
- אם לנאמן סניף יחיד, השדה read-only.

## TRU-03 - צילום הסחורה שהגיעה

- multi-upload.
- אין שימוש חוזר אוטומטי בתמונות הספק; נאמן חייב לצלם ראיה משלו.

## TRU-04 - זיהוי פריטים

### כרטיס שורה

- thumbnail פריט.
- `1/7`.
- שם פריט.
- קוד INSHOP.
- קוד ספק.
- confidence chip.
- three-column quantity row:
  - לפי חשבונית.
  - הגיעה בפועל.
  - הפרש.
- checkbox/CTA `אשר שורה`.
- אם לא זוהה: placeholder + `בחר פריט` searchable.

### התנהגות

- מעבר בין שורות עם swipe אופקי או `הבא`.
- ניתן להציג רשימה מלאה בשלב הבא.

## TRU-05 - אישור כמויות

- רשימה אנכית של כל השורות.
- +/- ושדה מספרי.
- הפרש אדום אם חסר, ירוק אם יתר, אפור אם 0.
- summary תחתון:
  - שורות מאושרות.
  - שורות חסרות.
  - סך חוסר משוער.
- primary `שמור והמשך`.

## TRU-06 - מזווה לפני

- upload יחיד חובה.
- label ברור `צלם את המזווה/המקרר לפני המילוי`.

## TRU-07 - מזווה אחרי

- upload יחיד חובה.
- `צלם לאחר שסידרת את הסחורה`.

## TRU-08 - סיכום ותגמול

### Summary card

- supplier, branch, invoice, date, total.
- count of lines and shortages.
- reward card עם icon מתנה:
  - `התגמול שלך`.
  - סכום.
  - `2% מסכום החשבונית, בכפוף לאישור`.

### פעולות

- `צפה בפרטים`.
- `סיום`.

### Success

- `קליטת האספקה הושלמה`.
- `האדמין יבדוק את הקליטה והתגמול יעודכן לאחר אישור`.

---

# 5. ספירת מלאי במובייל

## CNT-01 - פתיחה

### Header card

- תמונת סופר.
- שם.
- תפקיד.
- סניף.

### Pre-flight card

- הסבר: `לפני התחלת ספירה המערכת תבקש מהמערכת הישנה לסגור או לנסות לסגור חשבוניות פתוחות`.
- שורות סטטוס:
  - חיבור למערכת הישנה.
  - חשבוניות פתוחות.
  - בקשה אחרונה.
- CTA: `בדוק סטטוס שוב` / `בקש אישור`.

## CNT-02 - gate

### success

- icon גדול.
- `אישור סגירת חשבוניות התקבל`.
- KPI:
  - סה"כ פתוחות.
  - נסגרו.
  - מסורבות.
  - נותרו פתוחות.
- CTA `המשך לספירת מלאי`.

### blocked

- warning banner.
- מספר פתוחות שנותרו.
- retry.
- אין CTA לספירה.

## CNT-03 - רשימת פריטים

### Top summary

- `כמות לספור`.
- `סה"כ פריטים`.
- progress `36/48 נשמרו`.
- search.
- filter `טרם נשמר`.

### Item card

- image.
- name, item code, description.
- target/default hint.
- minus / quantity / plus.
- status `לא נשמר` או `נשמר` עם timestamp.
- save gesture area עם text `החלק ימינה לשמירת הפריט`.
- חלופה נגישה: כפתור `שמור פריט`.

### Bottom

- progress.
- primary `סיום ספירה` disabled עד 100%.
- בלחיצה כשה-disabled: הודעה עם מספר הפריטים שלא נשמרו.

## CNT-04 - סיכום

- totals: counted items, differences, positive/negative adjustment.
- list of largest differences.
- confirm dialog:
  - `סיום הספירה יעדכן את המלאי וינעל את הספירה`.
  - checkbox `בדקתי את הנתונים`.
- success receipt.

---

# 6. Desktop shell לאדמין

## 6.1 Sidebar

מימין:

- דשבורד.
- ספירת מלאי.
- קבלת סחורה.
- הזמנות/חוקי הזמנה.
- פריטים.
- ספקים.
- זיכויים.
- תשלומים.
- דוחות.
- הגדרות.
- אינטגרציה.

הפריט הפעיל מקבל רקע סגול וטקסט לבן.

## 6.2 Header

- title + icon.
- breadcrumbs.
- user card משמאל.
- sync indicator.
- notification bell.

## 6.3 Content width

- עד 1440px.
- padding 24-32px.
- grid 12 columns.

---

# 7. ADM-02 - תור אספקות

## Toolbar

- date range.
- supplier.
- branch.
- status multi-select.
- severity.
- search invoice/delivery.
- `נקה סינון`.

## KPI cards

- ממתינות לנאמן.
- ממתינות לאדמין.
- עם חוסר.
- OCR נכשל.
- זמן המתנה ממוצע.

## Table

עמודות:

- מזהה.
- תאריך.
- ספק.
- סניף.
- חשבונית.
- סכום.
- נאמן.
- חוסר.
- AI severity.
- status.
- זמן המתנה.
- פעולה `פתח`.

Row click פותח ADM-03.

---

# 8. ADM-03 - אישור קליטת סחורה

מסך זה מחקה את ההיררכיה הוויזואלית באבטיפוס המקור: פילטרים עליונים, summary, גלריית שש ראיות, טבלת reconciliation ופאנל זיכוי בצד.

## 8.1 Header filters

- date read-only.
- branch select/verified.
- supplier select/verified.
- `רענן ניתוח AI`.
- AI status card.

## 8.2 Financial summary strip

- סה"כ לפי ספק.
- סה"כ לפי נאמן.
- הפרש.
- invoice comparison result.

## 8.3 Evidence gallery

6 cards ברצף בדסקטופ; 2 columns בטאבלט:

1. goods by supplier.
2. supplier invoice.
3. trustee invoice.
4. goods by trustee.
5. pantry before.
6. pantry after.

כל card כולל label, thumbnail, zoom, count אם multi-image.

## 8.4 AI comparison banner

- state: match / warning / failed.
- short explanation.
- `הצג פירוט` drawer.

## 8.5 Reconciliation table

- sticky first columns ב-RTL.
- editable inventory qty.
- edit/delete icons.
- add item + search.
- per-row audit icon.
- totals footer.

Inline validation examples:

- `יש לבחור פריט INSHOP`.
- `הכמות חייבת להיות מספר שלם ולא שלילי`.
- `הכמות שונתה. יש להזין סיבה`.

## 8.6 Credit side panel

- `דרישת זיכוי מהספק`.
- amount card.
- status.
- `צור דרישת זיכוי`.
- `שמור ושלח לספק`.
- info: `לאחר השליחה הספק יקבל קישור להעלאת מסמך`.

## 8.7 Bottom action bar

- secondary `ביטול`.
- primary `שמור ועדכן מלאי`.
- success message: `הקליטה אושרה והמלאי עודכן`.

Confirm dialog מפרט:

- מספר שורות.
- סך יחידות.
- סכום חשבונית.
- סכום חוסר.
- תגמול נאמן.

---

# 9. RULE-01 - חוקי הזמנה

## 9.1 Top configuration card

4 אזורים:

1. branch + supplier.
2. delivery days + average lead time.
3. minimum order.
4. save status.

## 9.2 Main grid

- table occupies 8-9 columns.
- right panel for WhatsApp destinations.

### Table toolbar

- `הוסף פריט`.
- `ייבא קודי ספק` optional.
- category filter.
- search.
- unsaved-only filter.

### Row

- item image/name/code.
- target inventory stepper/input.
- packaging input.
- supplier item name.
- primary supplier code.
- aliases chip button.
- active status.
- row save state.
- overflow menu.

### WhatsApp panels

- הזמנות.
- דרישות זיכוי.
- number, label, primary/backup, active.
- add/edit/delete.

## 9.3 Save behavior

- unsaved changes badge.
- `שמור את כל השינויים` sticky bottom/right.
- navigation away triggers unsaved confirmation.

---

# 10. PAY-01 - תשלומים

המסך מחולק ל-3 שלבים אופקיים בדסקטופ:

1. בחירת אספקות.
2. זיכויים ואמצעי תשלום.
3. אישור ופרסום.

## 10.1 Filters and KPIs

- date range.
- supplier.
- current balance.
- pending credits.
- selected payable.

## 10.2 Delivery table

עמודות:

- select.
- delivery date/day.
- invoice thumbnail.
- invoice amount.
- required credit.
- approved credit.
- remaining payable.
- payment status.

## 10.3 Payment summary panel

- total invoices.
- total approved credits.
- prior balance.
- expected payment.
- selected document amount.
- resulting balance.

## 10.4 Upload payment document

Tabs:

- camera.
- upload file.
- manual entry.

AI result card:

- type.
- reference.
- date.
- amount.
- confidence.
- checkmarks/warnings.

## 10.5 Actions

- `שמירה כטיוטה`.
- `המשך לאישור תשלום`.
- final confirm `פרסם תשלום`.

Blocking error:

```text
לא ניתן לפרסם את התשלום
הסכום שאושר אינו תואם לסכום הצפוי. יש לתקן את הנתונים או לאשר חריג בהרשאה מתאימה.
```

---

# 11. ADM-04/05 - זיכויים

## List

- open/overdue/uploaded/pending approval/closed tabs.
- amount requested/approved/remaining.
- due date.
- supplier.
- last contact.

## Detail

- request summary.
- evidence.
- line table.
- document versions.
- AI-recognized credit document fields.
- actions:
  - approve full.
  - approve partial.
  - reject with reason.
  - request replacement.
  - close.

---

# 12. פורטל ספק

העיצוב שומר על אותו design system אך עם branding של הספק/INSHOP ו-navigation מצומצם.

## PORT-01 - דשבורד

### Desktop

- sidebar: בית, דרישות זיכוי, אספקות, תשלומים, דוחות, הגדרות/פרופיל.
- KPI cards:
  - יתרה נוכחית.
  - סך תשלומים בתקופה.
  - זיכויים שאושרו.
  - זיכויים ממתינים.
- two-column content:
  - open credit requests.
  - request detail preview.
  - recent deliveries.
  - recent payments.

### Mobile

- top bar + hamburger.
- cards one per row.
- request detail as full page.
- bottom sticky upload CTA.

## PORT-03 - דרישת זיכוי

- status banner `ממתין לזיכוי`.
- request number and dates.
- supplier invoice and trustee goods side by side / stacked.
- shortage table/cards.
- total.
- upload zone.
- primary `שלח זיכוי לאישור`.
- accepted file types and max size.

Success:

- `המסמך הועלה ונשלח לבדיקה`.
- request status `ממתין לאישור אדמין`.

## PORT-04 - אספקות

- date filter.
- status chips.
- invoice and payment documents.
- explicit `חסר זיכוי` CTA.

## PORT-05 - תשלומים

- current balance.
- chronological ledger-like list.
- payment document preview.
- allocations collapsed by default.

---

# 13. INT-01 - ניהול Mock

## Layout

- warning banner: `סביבת בדיקות בלבד`.
- tabs by dataset.
- upload zone.
- schema requirements table.
- 20-row preview.
- validation summary.
- import button disabled until valid.
- import history.
- scenario launcher cards.
- destructive `Reset Demo Data` in danger zone.

## Reset flow

1. click reset.
2. type environment name.
3. confirm.
4. async job + progress.
5. completion report.

---

# 14. Microcopy מחייבת

| מצב | טקסט |
|---|---|
| שמירה | `השינויים נשמרו` |
| שמירה חלקית | `חלק מהשורות לא נשמרו. יש לבדוק את השורות המסומנות` |
| offline | `אין כרגע חיבור. הנתונים נשמרו במכשיר ויישלחו לאחר חידוש הקשר` רק אם קיימת תמיכה אמיתית ב-offline |
| retry | `הפעולה לא הושלמה. לא בוצע שינוי חלקי` |
| expired link | `הקישור אינו בתוקף. יש לבקש קישור חדש` |
| duplicate submit | `הדיווח כבר התקבל` |
| AI pending | `המסמך בעיבוד. ניתן להמשיך ולבדוק את התוצאה בהמשך` |
| AI failed | `לא הצלחנו לקרוא את המסמך. ניתן להזין את הנתונים ידנית` |
| inventory approval | `האישור יעדכן את המלאי ולא ניתן יהיה לערוך את הקליטה ללא פעולת תיקון מתועדת` |
| payment posting | `פרסום התשלום ייצור תנועה כספית קבועה. תיקון יתבצע באמצעות ביטול/היפוך` |

---

# 15. נגישות והתנהגות מקלדת

- כל input עם label אמיתי, לא placeholder בלבד.
- focus visible.
- modal לוכד focus ומחזיר אותו למפעיל.
- lightbox ניתן לסגירה ב-Escape.
- טבלאות עם header semantics.
- swipe אינו הדרך היחידה לשמור; קיים כפתור נגיש.
- status chips כוללים טקסט/icon, לא צבע בלבד.
- `aria-live` לעדכוני upload, save ו-AI.

---

# 16. אירועי אנליטיקה מוצעים

- `supplier_report_started`
- `supplier_invoice_uploaded`
- `supplier_branch_mismatch_shown`
- `supplier_report_submitted`
- `trustee_receiving_started`
- `trustee_line_quantity_changed`
- `trustee_receiving_completed`
- `delivery_admin_opened`
- `delivery_inventory_approved`
- `credit_request_sent`
- `credit_document_uploaded`
- `credit_document_approved`
- `inventory_count_gate_requested`
- `inventory_count_completed`
- `payment_posted`
- `ai_suggestion_overridden`

אין לשלוח PII או תוכן מסמכים למערכת analytics.
