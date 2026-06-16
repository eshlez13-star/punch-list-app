import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { RESP_LABELS } from "./constants";

/**
 * יוצר קובץ אקסל מקצועי עם תמונות מוטמעות בתוך התאים.
 * רץ לגמרי בדפדפן - בלי שרת.
 */
export async function generateExcel(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Spivak Engineering";

  const ws = workbook.addWorksheet("דוח ליקויים", {
    views: [{ rightToLeft: true }],
  });

  // === רוחב עמודות ===
  ws.columns = [
    { key: "index", width: 6 },
    { key: "structure", width: 28 },
    { key: "room", width: 20 },
    { key: "section", width: 10 },
    { key: "image", width: 35 },
    { key: "description", width: 38 },
    { key: "responsibility", width: 16 },
    { key: "status", width: 14 },
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

  // === שורה 1: כותרת הדוח ===
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = report.name;
  titleCell.font = { bold: true, size: 18, color: { argb: `FF${NAVY}` } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 45;

  // === שורה 2: תאריך + שם חברה ===
  ws.mergeCells("A2:H2");
  const dateStr = new Date(report.createdAt).toLocaleDateString("he-IL");
  const subCell = ws.getCell("A2");
  subCell.value = `${dateStr}  |  Spivak Engineering`;
  subCell.font = { size: 10, color: { argb: "FF666666" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  // === שורה 3: ריקה ===
  ws.getRow(3).height = 8;

  // === שורה 4: כותרות עמודות ===
  const HEADERS = ["#", "מבנה", "חדר/חלל", "חתך", "תמונה", "פירוט הבעיה", "גורם אחראי", "סטטוס"];
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
    // עמודה 5 (תמונה) - מטופלת למטה
    row.getCell(6).value = item.description || "";
    row.getCell(7).value = RESP_LABELS[item.responsibility] || item.responsibility || "";

    // סטטוס עם צבע רקע
    const statusCell = row.getCell(8);
    statusCell.value = "לביצוע";
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF3CD" },
    };
    statusCell.font = { bold: true, size: 10, color: { argb: "FF856404" } };

    // עיצוב כל התאים בשורה
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.border = cellBorder;
      cell.alignment = cellAlign;
      if (!cell.font?.bold) cell.font = { size: 10 };
    }

    // === הטמעת תמונה ===
    const imgData = item.image_marked || item.image_original;
    if (imgData) {
      try {
        // חילוץ base64 נקי
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;

        const imageId = workbook.addImage({
          base64,
          extension: "png",
        });

        // תמונה בתוך התא (עמודה 5 = אינדקס 4)
        ws.addImage(imageId, {
          tl: { col: 4, row: rowNum - 1 }, // top-left (0-indexed row)
          br: { col: 5, row: rowNum },      // bottom-right
          editAs: "oneCell",
        });

        // גובה שורה להצגת תמונה
        row.height = 120;
      } catch {
        row.getCell(5).value = "שגיאה בתמונה";
        row.height = 30;
      }
    } else {
      row.getCell(5).value = "—";
      row.height = 30;
    }
  }

  // === שורת סיכום ===
  const summaryRow = ws.getRow(5 + items.length + 1);
  summaryRow.getCell(1).value = `סה"כ ליקויים: ${items.length}`;
  summaryRow.getCell(1).font = { bold: true, size: 11 };

  // === הורדת הקובץ ===
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = report.name.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 50);
  saveAs(blob, `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
