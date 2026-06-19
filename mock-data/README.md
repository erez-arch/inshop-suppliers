# Mock data

קבצי CSV אלה מדמים את datasets של המערכת הישנה. הם אינם נקראים מה-UI; רק `ExcelLegacyAdapter` או import service רשאים לקרוא אותם.

תרחישים:

- `RAMAT_GAN` מאפשר התחלת ספירה למרות 3 חשבוניות מסורבות.
- `TEL_AVIV` חוסם ספירה בגלל חשבונית אחת שנותרה פתוחה.
- `inventory_deltas.csv` כולל שורה עם `should_update_inventory=false` שאסור לעדכן למלאי.
- `INV-12547` מתאים לדוגמאות האספקה/תגמול במסמך.
