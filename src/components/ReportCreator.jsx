import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";
import { createEmptyItem } from "../lib/constants";
import { generateExcel } from "../lib/excelGenerator";
import ItemForm from "./ItemForm";
import {
  ArrowRight, Plus, FileSpreadsheet, Loader2, Save, CheckCircle2,
} from "lucide-react";

const SAVE_INTERVAL = 5000;

export default function ReportCreator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reportName, setReportName] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved"
  const [generating, setGenerating] = useState(false);
  const dirty = useRef(false);

  // === טעינה ===
  useEffect(() => {
    const report = storage.getReport(id);
    if (report) {
      setReportName(report.name);
      if (report.items?.length) setItems(report.items);
    } else {
      navigate("/");
    }
    setLoaded(true);
  }, [id, navigate]);

  // === סימון שינוי ===
  useEffect(() => {
    if (loaded) dirty.current = true;
  }, [items, reportName, loaded]);

  // === שמירה (מחזיר promise כדי לאפשר המתנה) ===
  const save = useCallback(() => {
    if (!loaded) return;
    dirty.current = false;
    setSaveStatus("saving");
    storage.saveReport(id, { name: reportName, items });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [id, reportName, items, loaded]);

  // === שמירה אוטומטית כל 5 שניות ===
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirty.current) save();
    }, SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [save]);

  // === הגנה מפני רענון / סגירת טאב ===
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty.current) {
        save(); // שמירה אחרונה
        e.preventDefault();
        // הדפדפן יציג דיאלוג "האם אתה בטוח?" (טקסט מותאם לא נתמך בדפדפנים מודרניים)
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // שמירה כאשר אפליקציית מצלמה נפתחת (visibilitychange)
    const handleVisibility = () => {
      if (document.hidden && dirty.current) save();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [save]);

  function handleItemChange(index, updated) {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  }

  function handleRemoveItem(index) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  // === יצירת Excel - עצמאי לחלוטין מהשמירה ===
  // משתמש בנתוני ה-state הנוכחיים ישירות, בלי תלות ב-localStorage
  async function handleGenerate() {
    const hasContent = items.some((it) => it.structure);
    if (!hasContent) {
      alert("יש למלא לפחות פריט אחד עם מבנה.");
      return;
    }
    setGenerating(true);
    try {
      // בנה את אובייקט הדוח מה-state הנוכחי, לא מהסטורג'
      const reportData = {
        id,
        name: reportName,
        items,
        createdAt: storage.getReport(id)?.createdAt || new Date().toISOString(),
      };
      await generateExcel(reportData);
    } catch (e) {
      alert("שגיאה ביצירת הדוח: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-navy-700" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
      {/* כותרת */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => { save(); navigate("/"); }}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowRight size={22} className="text-navy-700" />
        </button>
        <div className="flex-1">
          <input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="text-xl font-bold text-navy-900 bg-transparent w-full
                       focus:outline-none border-b-2 border-transparent focus:border-navy-600 pb-0.5"
            placeholder="שם הדוח..."
          />
        </div>

        {/* אינדיקטור שמירה */}
        <div className="flex items-center gap-1 text-xs min-w-[75px] justify-end">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-gray-400">
              <Loader2 size={14} className="animate-spin" /> שומר...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-green-600 font-medium animate-pulse">
              <CheckCircle2 size={14} /> נשמר בהצלחה
            </span>
          )}
        </div>
      </div>

      {/* לוגו */}
      <div className="bg-navy-700 text-white text-center py-2 rounded-xl mb-5 text-sm font-medium tracking-wider">
        SPIVAK ENGINEERING
      </div>

      {/* פריטים */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <ItemForm
            key={item.id}
            item={item}
            index={idx}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
          />
        ))}
      </div>

      {/* הוסף */}
      <button
        onClick={addItem}
        className="w-full mt-4 border-2 border-dashed border-gray-300 rounded-2xl py-4
                   flex items-center justify-center gap-2 text-gray-400 font-medium
                   hover:border-navy-600 hover:text-navy-600 transition-colors active:bg-gray-50"
      >
        <Plus size={20} />
        הוסף ליקוי
      </button>

      {/* סרגל תחתון */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={save}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300
                       text-gray-600 font-medium active:scale-[0.98] transition-all"
          >
            {saveStatus === "saved" ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <Save size={18} />
            )}
            שמור
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800
                       text-white py-3 rounded-xl font-medium disabled:opacity-50
                       active:scale-[0.98] transition-all"
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> מייצר...</>
            ) : (
              <><FileSpreadsheet size={18} /> צור דוח Excel</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
