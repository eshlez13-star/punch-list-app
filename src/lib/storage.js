/**
 * שכבת אחסון מבוססת IndexedDB (idb-keyval).
 * כל הדוחות נשמרים כאובייקט אחד תחת המפתח "punchlist_reports".
 * תמונות נשמרות כ-base64 ישירות בנתונים.
 */

import { get, set } from "idb-keyval";

const STORAGE_KEY = "punchlist_reports";

async function readAll() {
  try {
    const data = await get(STORAGE_KEY);
    return data || {};
  } catch {
    return {};
  }
}

async function writeAll(data) {
  try {
    await set(STORAGE_KEY, data);
  } catch {
    alert("שגיאת שמירה — הנתונים לא נשמרו. צלם מסך ופנה לתמיכה.");
    throw new Error("IndexedDB write failed");
  }
}

// מיגרציה חד-פעמית: אם IndexedDB ריק ויש נתונים ישנים ב-localStorage — מעתיק אותם.
// localStorage הישן לא נמחק (נשאר כגיבוי).
async function migrate() {
  try {
    const existing = await get(STORAGE_KEY);
    if (!existing) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        await set(STORAGE_KEY, JSON.parse(raw));
      }
    }
  } catch {
    // כשל במיגרציה — נתוני localStorage נשארים כגיבוי
  }
}

migrate();

export const storage = {
  /** רשימת כל הדוחות (בלי פריטים - רק מטא-דאטה) */
  async listReports() {
    const all = await readAll();
    return Object.values(all)
      .map(({ items, ...meta }) => ({
        ...meta,
        itemCount: items?.length || 0,
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  /** יצירת דוח חדש */
  async createReport(name) {
    const all = await readAll();
    const id = crypto.randomUUID();
    all[id] = {
      id,
      name,
      items: [],
      attendees: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "draft",
    };
    await writeAll(all);
    return id;
  },

  /** קבלת דוח מלא כולל פריטים */
  async getReport(id) {
    const all = await readAll();
    return all[id] || null;
  },

  /** שמירת דוח (שם + פריטים + משתתפים) */
  async saveReport(id, { name, items, attendees }) {
    const all = await readAll();
    if (!all[id]) return;
    if (name !== undefined) all[id].name = name;
    if (items !== undefined) all[id].items = items;
    if (attendees !== undefined) all[id].attendees = attendees;
    all[id].updatedAt = Date.now();
    await writeAll(all);
  },

  /** עדכון סטטוס דוח */
  async setStatus(id, status) {
    const all = await readAll();
    if (!all[id]) return;
    all[id].status = status;
    all[id].updatedAt = Date.now();
    await writeAll(all);
  },

  /** מחיקת דוח */
  async deleteReport(id) {
    const all = await readAll();
    delete all[id];
    await writeAll(all);
  },

  /** ייבוא דוח מקובץ Excel - יוצר דוח חדש עם הנתונים שחולצו */
  async importReport(name, items) {
    const all = await readAll();
    const id = crypto.randomUUID();
    all[id] = {
      id,
      name,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "draft",
    };
    await writeAll(all);
    return id;
  },
};
