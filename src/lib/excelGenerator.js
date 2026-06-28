import ExcelJS from "exceljs";
import { RESP_LABELS } from "./constants";

/**
 * יוצר קובץ אקסל מקצועי עם תמונות מוטמעות בתוך התאים.
 * רץ לגמרי בדפדפן - בלי שרת.
 * מקבל את נתוני הדוח ישירות (אין תלות בשמירה לפני יצירה).
 */
async function buildExcelBlob(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Spivak Engineering";

  const ws = workbook.addWorksheet("דוח ליקויים", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });

  // === רוחב עמודות (9 עמודות - כולל תמונה לאחר תיקון) ===
  ws.columns = [
    { key: "index",          width: 6  },
    { key: "structure",      width: 28 },
    { key: "room",           width: 20 },
    { key: "section",        width: 10 },
    { key: "image",          width: 35 },
    { key: "image_after",    width: 35 },
    { key: "description",    width: 38 },
    { key: "responsibility", width: 16 },
    { key: "status",         width: 14 },
  ];

  // === סגנונות ===
  const NAVY = "1e3a5f";
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
  const headerFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  const headerAlign = { horizontal: "center", vertical: "middle", wrapText: true };
  const cellBorder = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const cellAlign = { horizontal: "center", vertical: "middle", wrapText: true };

  const TOTAL_COLS = 9;

  // === שורה 1: כותרת הדוח ===
  ws.mergeCells("A1:I1");
  const titleCell = ws.getCell("A1");
  titleCell.value = report.name;
  titleCell.font = { bold: true, size: 18, color: { argb: `FF${NAVY}` } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 45;

  // === שורה 2: תאריך + שם חברה ===
  ws.mergeCells("A2:I2");
  const dateStr = new Date(report.createdAt).toLocaleDateString("he-IL");
  const subCell = ws.getCell("A2");
  subCell.value = `${dateStr}  |  Spivak Engineering`;
  subCell.font = { size: 10, color: { argb: "FF666666" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  // === שורה 3: ריקה ===
  ws.getRow(3).height = 8;

  // === שורה 4: כותרות עמודות ===
  const HEADERS = ["#", "מבנה", "חדר/חלל", "חתך", "תמונת ליקוי", "לאחר תיקון", "פירוט הבעיה", "גורם אחראי", "סטטוס"];
  const headerRow = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = headerAlign;
    cell.border = cellBorder;
  });
  headerRow.height = 28;

  // === שורות נתונים ===
  const items = report.items || [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.structure || "";
    row.getCell(3).value = item.room || "";
    row.getCell(4).value = item.section !== "" ? Number(item.section) : "";
    row.getCell(7).value = item.description || "";
    row.getCell(8).value = RESP_LABELS[item.responsibility] || item.responsibility || "";

    // סטטוס עם צבע רקע
    const statusCell = row.getCell(9);
    statusCell.value = "לביצוע";
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF3CD" },
    };
    statusCell.font = { bold: true, size: 10, color: { argb: "FF856404" } };

    // עיצוב כל התאים בשורה
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = row.getCell(c);
      cell.border = cellBorder;
      cell.alignment = cellAlign;
      if (!cell.font?.bold) cell.font = { size: 10 };
    }

    // === הטמעת תמונת ליקוי (עמודה 5) ===
    const imgData = item.image_marked || item.image_original;
    let rowHeight = 30;

    if (imgData) {
      try {
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const imageId = workbook.addImage({ base64, extension: "png" });
        ws.addImage(imageId, {
          tl: { col: 4, row: rowNum - 1 },
          br: { col: 5, row: rowNum },
          editAs: "oneCell",
        });
        rowHeight = 120;
      } catch {
        row.getCell(5).value = "שגיאה בתמונה";
      }
    } else {
      row.getCell(5).value = "—";
    }

    // === הטמעת תמונה לאחר תיקון (עמודה 6) ===
    const imgAfter = item.image_after_fix;
    if (imgAfter) {
      try {
        const base64After = imgAfter.includes(",") ? imgAfter.split(",")[1] : imgAfter;
        const imageIdAfter = workbook.addImage({ base64: base64After, extension: "png" });
        ws.addImage(imageIdAfter, {
          tl: { col: 5, row: rowNum - 1 },
          br: { col: 6, row: rowNum },
          editAs: "oneCell",
        });
        rowHeight = Math.max(rowHeight, 120);
      } catch {
        row.getCell(6).value = "שגיאה בתמונה";
      }
    } else {
      row.getCell(6).value = "—";
    }

    row.height = rowHeight;
  }

  // AutoFilter על כל הטבלה (כותרת + שורות נתונים) — מיון/סינון לפי כל עמודה
  if (items.length > 0) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + items.length, column: 9 } };
  }

  // === שורת סיכום ===
  const summaryRow = ws.getRow(5 + items.length + 1);
  summaryRow.getCell(1).value = `סה"כ ליקויים: ${items.length}`;
  summaryRow.getCell(1).font = { bold: true, size: 11 };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = report.name.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 50);
  const filename = `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { blob, filename };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateExcel(report) {
  const { blob, filename } = await buildExcelBlob(report);
  downloadBlob(blob, filename);
}

