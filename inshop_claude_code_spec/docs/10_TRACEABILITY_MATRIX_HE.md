# מטריצת עקיבות בין מסמך המקור לחבילת הפיתוח

| סעיף במקור | פונקציונליות | מסמך בחבילה |
|---|---|---|
| 1 | מטרת מערכת, יעדים, גבולות | `01_PRODUCT_SPEC_HE.md` סעיפים 1-3 |
| 2 | משתמשים, פלטפורמות והרשאות | Product 4; UI 2; Technical 13 |
| 3 | ארכיטקטורה ואינטגרציה | Product 18; Technical 1,6; API; Schema |
| 4 | ויזארד ספק | Product 7; UI 3; API public supplier; Tests SUP |
| 5 | ויזארד נאמן | Product 8; UI 4; API trustee; Tests TRU |
| 6 | ספירת מלאי | Product 11; UI 5; State machine 5; Tests CNT |
| 7 | חוקי הזמנה | Product 12; UI 9; API order rules; Schema order tables |
| 8 | אדמין אישור קליטה וזיכוי | Product 9,13; UI 7,8,11; Tests ADM/CR |
| 9 | תשלומים לספקים | Product 14; UI 10; State machine 8; Tests PAY |
| 10 | פורטל ספק | Product 15; UI 12; API portal; Tests PORT |
| 11 | שכבת AI | Product 17; Technical 7; State machine 6; Tests AI |
| 12 | מודל נתונים וסטטוסים | Schema; State machines |
| 13 | LegacyAdapter/API | Technical 6; API; Tests LEG |
| 14 | Excel/CSV mock | Product 19; Technical 6.2; mock-data; Tests LEG |
| 15 | סדר פיתוח ו-Claude | `CLAUDE.md`; Implementation plan |
| 16 | החלטות וקריטריוני קבלה | Decisions; Test plan; Product 24 |

## הרחבות שנוספו מעבר למקור כדי למנוע ניחוש בפיתוח

- הפרדת סטטוס אספקה מסטטוס זיכוי ותשלום.
- inventory movement ledger ו-supplier financial ledger בלתי-מחיקים.
- idempotency לכל פעולה קריטית.
- transactional outbox ו-retry jobs.
- מודל הרשאות מפורט.
- חוזה העלאות ואחסון פרטי.
- API reference ו-PostgreSQL schema.
- מצבי שגיאה, concurrency ו-reversal.
- מסכי תור אדמין, דשבורד וסביבת mock.
- תכנית בדיקות מלאה ואבטחת tenant בפורטל ספק.
