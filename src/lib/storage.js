/**
 * שכבת אחסון מבוססת localStorage.
 * כל הדוחות נשמרים כ-JSON תחת מפתח אחד.
 * תמונות נשמרות כ-base64 ישירות בנתונים.
 */

const STORAGE_KEY = "punchlist_reports";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const storage = {
  /** רשימת כל הדוחות (בלי פריטים - רק מטא-דאטה) */
  listReports() {
    const all = readAll();
    return Object.values(all)
      .map(({ items, ...meta }) => ({
        ...meta,
        itemCount: items?.length || 0,
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  /** יצירת דוח חדש */
  createReport(name) {
    const all = readAll();
    const id = crypto.randomUUID();
    all[id] = {
      id,
      name,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "draft",
    };
    writeAll(all);
    return id;
  },

  /** קבלת דוח מלא כולל פריטים */
  getReport(id) {
    const all = readAll();
    return all[id] || null;
  },

  /** שמירת דוח (שם + פריטים) */
  saveReport(id, { name, items }) {
    const all = readAll();
    if (!all[id]) return;
    if (name !== undefined) all[id].name = name;
    if (items !== undefined) all[id].items = items;
    all[id].updatedAt = Date.now();
    writeAll(all);
  },

  /** עדכון סטטוס דוח */
  setStatus(id, status) {
    const all = readAll();
    if (!all[id]) return;
    all[id].status = status;
    all[id].updatedAt = Date.now();
    writeAll(all);
  },

  /** מחיקת דוח */
  deleteReport(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },

  /** ייבוא דוח מקובץ Excel - יוצר דוח חדש עם הנתונים שחולצו */
  importReport(name, items) {
    const all = readAll();
    const id = crypto.randomUUID();
    all[id] = {
      id,
      name,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "draft",
    };
    writeAll(all);
    return id;
  },
};
