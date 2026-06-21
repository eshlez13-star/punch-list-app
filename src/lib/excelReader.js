import ExcelJS from "exceljs";
import { createEmptyItem } from "./constants";

/**
 * מיפוי הפוך: תווית עברית → ערך פנימי של גורם אחראי
 */
const RESP_BY_LABEL = {
  "מנהל פרויקט": "project_manager",
  "קבלן ראשי":   "contractor",
  "קבלן משנה":   "sub_contractor",
};

/**
 * ממיר ערך תא לטקסט נקי (מטפל ב-RichText ואובייקטי ExcelJS).
 */
function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  // RichText
  if (v?.richText) return v.richText.map((r) => r.text).join("").trim();
  // SharedFormula / formula result
  if (v?.result !== undefined) return String(v.result).trim();
  return String(v).trim();
}

/**
 * קורא קובץ Excel שנוצר על ידי האפליקציה וממיר אותו לנתוני דוח.
 * תומך בפורמט 8 עמודות (ישן) ו-9 עמודות (עם עמודת "לאחר תיקון").
 *
 * @param {File} file - קובץ Excel (.xlsx) שנבחר על ידי המשתמש
 * @returns {{ name: string, items: object[] }}
 */
export async function readExcel(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("לא נמצא גיליון בקובץ");

  // === שם הדוח (שורה 1, תא A1 - merged) ===
  const rawTitle = cellText(ws.getCell("A1"));
  const reportName = rawTitle || "דוח מיובא";

  // === זיהוי פורמט: 8 עמודות (ישן) או 9 עמודות (חדש עם "לאחר תיקון") ===
  // בפורמט החדש: עמודה 6 = "לאחר תיקון", description בעמודה 7
  // בפורמט הישן: עמודה 6 = "פירוט הבעיה", description בעמודה 6
  const col6Header = cellText(ws.getRow(4).getCell(6));
  const isNewFormat = col6Header.includes("תיקון") || col6Header.includes("after");

  const COL = isNewFormat
    ? { structure: 2, room: 3, section: 4, description: 7, responsibility: 8 }
    : { structure: 2, room: 3, section: 4, description: 6, responsibility: 7 };

  // === קריאת שורות נתונים (משורה 5 ואילך) ===
  const items = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return; // דלג על כותרות

    const indexCell = cellText(row.getCell(1));

    // עצור בשורת סיכום ("סה"כ...") או שורה ריקה
    if (!indexCell || isNaN(Number(indexCell))) return;

    const structure   = cellText(row.getCell(COL.structure));
    const room        = cellText(row.getCell(COL.room));
    const sectionRaw  = cellText(row.getCell(COL.section));
    const description = cellText(row.getCell(COL.description));
    const respLabel   = cellText(row.getCell(COL.responsibility));

    // חתך: המר למספר אם אפשר
    const section = sectionRaw !== "" && !isNaN(parseFloat(sectionRaw))
      ? sectionRaw
      : "";

    // גורם אחראי: מיפוי מתווית לערך פנימי
    const responsibility = RESP_BY_LABEL[respLabel] || "";

    items.push({
      ...createEmptyItem(),
      structure,
      room,
      section,
      description,
      responsibility,
    });
  });

  if (items.length === 0) {
    throw new Error("לא נמצאו פריטים בקובץ. ודא שהקובץ נוצר על ידי האפליקציה.");
  }

  return { name: reportName, items };
}
