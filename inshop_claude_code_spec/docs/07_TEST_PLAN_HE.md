# תכנית בדיקות וקריטריוני קבלה

מטרת המסמך: לאפשר ל-Claude Code ול-QA לבדוק כל תהליך ידני, חריג, retry ואי-כפילות לפני חיבור AI ומערכת legacy אמיתיים.

---

## 1. שכבות בדיקה

### Unit

- חישובי חוסר וזיכוי.
- תגמול 2% ועיגול.
- חישובי ledger ויתרה.
- state transition guards.
- התאמת פריט לפי סדר עדיפויות.
- נרמול payload של adapters.
- validation של קבצי mock.

### Integration

- transactions של מלאי/ledger.
- idempotency.
- optimistic concurrency.
- partial unique constraints.
- outbox/jobs/retries.
- object storage finalize.
- ExcelLegacyAdapter.

### Contract

- OpenAPI request/response.
- LegacyAdapter fixtures.
- AI normalized JSON.
- notification templates.

### E2E

- mobile supplier.
- mobile trustee.
- mobile inventory count.
- desktop admin/order rules/payments.
- responsive supplier portal.

---

## 2. נתוני בסיס

ספקים:

- `TNUVA` - תנובה בע"מ.
- `STRAUSS` - שטראוס בע"מ.

סניפים:

- `RAMAT_GAN` - סניף רמת גן.
- `TEL_AVIV` - סניף תל אביב.

פריטים:

- `7290012345678` חלב 3% ליטר.
- `7290012345679` יוגורט 3% 150 גרם.
- `7290012345680` גבינה צהובה פרוסה.
- `7290012345681` ביצים M 30 יחידות.
- `7290012345682` חמאה 200 גרם.

נאמן:

- `TR-1001`, סניף רמת גן.

---

# 3. תרחישי ספק

| ID | תרחיש | קלט/פעולה | תוצאה צפויה |
|---|---|---|---|
| SUP-001 | דיווח תקין | חשבונית, תמונת סחורה, סניף תואם, פרטי קשר | אספקה אחת נוצרת, סטטוס trustee_pending, הודעה נשלחת |
| SUP-002 | חסרה חשבונית | ניסיון שליחה ללא invoice media | 422, הודעת שדה, אין שינוי סטטוס |
| SUP-003 | חסרה תמונת סחורה | ניסיון שליחה | חסימה |
| SUP-004 | טלפון לא תקין | ערך קצר/אותיות | שגיאה ליד השדה |
| SUP-005 | דיסוננס סניף | AI רמת גן, בחירה תל אביב | warning חוסם; אין submit רגיל |
| SUP-006 | OCR נכשל | mock failure | ניתן להמשיך ידנית; issue נוצר |
| SUP-007 | חשבונית כפולה | אותו ספק+מספר+סניף | 409/מסך כפילות; אין delivery כפול |
| SUP-008 | submit כפול | אותו idempotency key פעמיים | אותה תשובה ואותו delivery id |
| SUP-009 | idempotency key עם payload אחר | שינוי branch באותו key | 409 ייעודי |
| SUP-010 | אין נאמן פעיל | branch ללא נאמן | האספקה נשמרת, admin alert, מסך ספק מצליח בלי הבטחת הודעה |
| SUP-011 | קובץ לא נתמך | executable/invalid MIME | rejection לפני finalize |
| SUP-012 | session פג | פעולה לאחר expiry | 410, אין mutation |

---

# 4. תרחישי נאמן

| ID | תרחיש | קלט/פעולה | תוצאה צפויה |
|---|---|---|---|
| TRU-001 | פתיחת קישור תקין | token פעיל | מוצגים נאמן ואספקה נכונים |
| TRU-002 | קישור פג | expired token | 410, מסך בקשת קישור חדש |
| TRU-003 | תביעה כפולה | נאמן שני מנסה claim | 409; מוצג שכבר בטיפול |
| TRU-004 | קליטה מלאה | כל המדיה והשורות | admin_review + reward draft |
| TRU-005 | שינוי כמות | invoice 36, received 35 | audit, shortage=1 |
| TRU-006 | כמות 0 | received 0 | מותר, חוסר מלא |
| TRU-007 | כמות שלילית | -1 | validation error |
| TRU-008 | שורה לא מזוהה | match null | אפשר לשמור כחריג; אי אפשר להכניס למלאי באדמין בלי התאמה |
| TRU-009 | חסרה תמונת מזווה לפני | complete | חסימה |
| TRU-010 | חשבוניות שונות | supplier/trustee totals differ | issue warning/error מופיע לאדמין |
| TRU-011 | completion כפול | retry | reward אחד, admin task אחד |
| TRU-012 | reward preview | total 3248.50 | 64.97 |

---

# 5. תרחישי אדמין ואישור מלאי

| ID | תרחיש | קלט/פעולה | תוצאה צפויה |
|---|---|---|---|
| ADM-001 | צפייה מלאה | delivery admin_review | כל 6 סוגי ראיות, שורות ו-issues מוצגים |
| ADM-002 | החלפת פריט | unmatched -> item | match_source manual + audit |
| ADM-003 | הוספת פריט | OCR פספס | שורה חדשה, sort order, audit |
| ADM-004 | מחיקת שורה שגויה | delete עם סיבה | soft/history נשמר; אינה נכנסת למלאי |
| ADM-005 | qty inventory שינוי | 35 -> 34 | reason חובה; credit recalculated |
| ADM-006 | אישור עם unmatched | line item null, qty>0 | 422 DELIVERY_LINE_UNMATCHED |
| ADM-007 | אישור תקין | 4 שורות | 4 תנועות או לפי שורות, balance מעודכן, liability ledger נוצר |
| ADM-008 | אישור כפול | same/different key | אין תנועות כפולות |
| ADM-009 | כשל באמצע transaction | simulate DB error | rollback מלא: אין balance/ledger חלקי |
| ADM-010 | AI mismatch ללא override | blocking issue | חסימה |
| ADM-011 | AI mismatch עם permission | override reason | אישור + audit override |
| ADM-012 | reward push legacy נכשל | adapter failure | inventory נשאר מאושר, reward push_failed, retry job |
| ADM-013 | ביטול לפני approval | cancel with reason | links revoked, no inventory movement |
| ADM-014 | ניסיון ביטול אחרי approval | approved delivery | פעולה נדחית; נדרש correction/reversal |

---

# 6. תרחישי מלאי ודלתות legacy

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| INV-001 | delivery receipt +24 | balance גדל 24, movement אחד |
| INV-002 | same receipt idempotency | balance לא משתנה שוב |
| INV-003 | legacy sale -1 | balance יורד 1 |
| INV-004 | duplicate legacy delta | ignored/idempotent |
| INV-005 | delta לפריט לא קיים | integration issue, אין movement |
| INV-006 | rebuild projection | סכום movements שווה balance |
| INV-007 | concurrent updates | locks/serial transaction מונעים lost update |
| INV-008 | reversal | entry נגדי, המקור לא נמחק |

---

# 7. ספירת מלאי

| ID | תרחיש | קלט | תוצאה צפויה |
|---|---|---|---|
| CNT-001 | פתיחת ספירה | branch ללא active count | waiting_for_legacy_close |
| CNT-002 | ספירה שנייה | active count קיים | 409 |
| CNT-003 | legacy מאשר | still_open=0, can_start=true | ready_to_count + snapshot lines |
| CNT-004 | legacy חוסם | can_start=false | אין BeginCounting |
| CNT-005 | refused בלבד | refused=3, still_open=0 | מותר להתחיל |
| CNT-006 | legacy unavailable | timeout | failure/retry; אין שורות פעילות |
| CNT-007 | שמירת שורה | qty 24 | saved=true, timestamp |
| CNT-008 | completion חלקי | 47/48 saved | 422 COUNT_LINES_UNSAVED |
| CNT-009 | completion מלא | 48/48 | adjustments, completed/locked |
| CNT-010 | completion כפול | retry | אין movements כפולים |
| CNT-011 | שינוי שורה שמורה | 24->23 לפני complete | changed_after_save עד שמירה מחדש |
| CNT-012 | edit אחרי locked | רגיל | אסור |
| CNT-013 | correction by admin | סיבה והרשאה | correction count/reversal, audit |

---

# 8. חוקי הזמנה

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| RUL-001 | כלל חדש | supplier+branch+days | saved active/draft לפי פעולה |
| RUL-002 | target negative | validation |
| RUL-003 | packaging 0 | validation |
| RUL-004 | duplicate supplier code | unique violation translated to Hebrew error |
| RUL-005 | multiple aliases | all saved and searchable |
| RUL-006 | one item multiple suppliers | supported |
| RUL-007 | second active rule same pair | old deactivated or 409 by use case |
| RUL-008 | unsaved navigation | confirmation dialog |

---

# 9. זיכויים

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| CR-001 | יצירה מחוסר | lines and amount correct |
| CR-002 | amount > shortage without override | validation |
| CR-003 | send | signed portal link + notification log |
| CR-004 | upload supplier document | credit_uploaded -> waiting_admin_approval |
| CR-005 | approve full | negative ledger entry, remaining 0, approved/closed |
| CR-006 | approve partial | partially_approved, remaining correct |
| CR-007 | approve beyond remaining | 422 |
| CR-008 | reject document | version retained, supplier notified |
| CR-009 | upload replacement | new version, old remains |
| CR-010 | duplicate approval retry | one ledger entry |
| CR-011 | pending credit in payment | not deducted from expected payment |

---

# 10. תשלומים ו-ledger

| ID | תרחיש | קלט | תוצאה צפויה |
|---|---|---|---|
| PAY-001 | 3 אספקות + זיכוי 152 | liabilities - approved credit | expected net correct |
| PAY-002 | payment exact | confirmed=expected | posted, balance settles |
| PAY-003 | partial payment | amount lower | open balance remains, deliveries partially paid |
| PAY-004 | overpayment | amount higher | negative supplier balance/credit |
| PAY-005 | AI amount mismatch | recognized != expected | block until correction/override |
| PAY-006 | no permission override | mismatch | 403/422 |
| PAY-007 | one payment multiple deliveries | allocations sum correct |
| PAY-008 | posted retry | one ledger payment entry |
| PAY-009 | DB failure during posting | no partial ledger/allocation |
| PAY-010 | reverse posted | opposite entry; original retained |
| PAY-011 | duplicate external reference | policy error |
| PAY-012 | pending credit later approved | balance updates after approval, not before |

---

# 11. פורטל ספק ואבטחה

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| PORT-001 | supplier A dashboard | רק נתוני A |
| PORT-002 | URL של supplier B | 404/403 ללא דליפת מידע |
| PORT-003 | upload credit | only request belonging to supplier |
| PORT-004 | expired magic link | challenge/new link |
| PORT-005 | mobile 390px | no horizontal overflow; CTA visible |
| PORT-006 | payment document access | signed temporary URL only |
| PORT-007 | current balance | equals ledger sum |

---

# 12. AI

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| AI-001 | high confidence branch | prefill + “זוהה” |
| AI-002 | medium confidence | review required |
| AI-003 | low confidence | unmatched |
| AI-004 | provider failure | manual flow remains available |
| AI-005 | new analysis after new document | old marked superseded |
| AI-006 | override | original result retained + actor/reason |
| AI-007 | attempt autonomous update | architectural test ensures no direct inventory/payment mutation |

---

# 13. LegacyAdapter

| ID | תרחיש | תוצאה צפויה |
|---|---|---|
| LEG-001 | Excel suppliers import | normalized suppliers |
| LEG-002 | missing required column | import blocked with row/column report |
| LEG-003 | malformed boolean/date | validation report |
| LEG-004 | close invoices result | mapped correctly |
| LEG-005 | write timeout | retry job with same logical key |
| LEG-006 | write returns success twice | business action remains once |
| LEG-007 | UI attempts direct Excel | static architecture test fails build |
| LEG-008 | swap to fake/real adapter | use cases unchanged |

---

# 14. Media

- upload intent cannot target unauthorized entity.
- MIME mismatch rejected.
- oversized file rejected.
- interrupted upload can retry.
- original private; preview signed.
- deleted/replaced document remains in audit/version history where required.
- no executable served inline.

---

# 15. Performance and accessibility

## Performance smoke

- list 10,000 deliveries with server pagination.
- delivery detail with 30 images uses thumbnails/lazy loading.
- count with 1,000 items remains usable and virtualized if needed.
- job queue recovers after worker restart.

## Accessibility

- complete supplier/trustee flow using keyboard where applicable.
- screen reader labels on fields and upload actions.
- swipe has button alternative.
- errors announced.
- contrast checks.
- 200% zoom desktop without clipped controls.

---

# 16. Release acceptance gate

Release candidate is accepted only when:

1. All P0 scenarios above pass.
2. No open critical security issue.
3. No inventory or ledger inconsistency in reconciliation test.
4. All side-effecting endpoints pass idempotency tests.
5. Supplier and trustee flows pass on at least two common mobile viewport sizes.
6. Admin screens pass at 1280px and 1440px.
7. Supplier portal passes cross-tenant tests.
8. Backup/restore and projection rebuild are rehearsed.
9. Legacy mock contract tests pass.
10. AI disabled mode supports every manual workflow.
