import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";
import { createEmptyItem } from "../lib/constants";
import { generateExcel } from "../lib/excelGenerator";
import { compressImage } from "../lib/imageCompressor";
import ItemForm from "./ItemForm";
import {
  ArrowRight, Plus, FileSpreadsheet, Loader2, Save, CheckCircle2, Camera, Search, X,
} from "lucide-react";

const SAVE_INTERVAL = 5000;

export default function ReportCreator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reportName, setReportName] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const [attendees, setAttendees] = useState(["", ""]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved"
  const [generating, setGenerating] = useState(false);
  const [query, setQuery] = useState("");
  const dirty = useRef(false);
  const cameraInputRef = useRef(null);

  // === טעינה ===
  useEffect(() => {
    async function load() {
      const report = await storage.getReport(id);
      if (report) {
        setReportName(report.name);
        if (report.items?.length) setItems(report.items);
        setAttendees(report.attendees?.length >= 2 ? report.attendees : ["", ""]);
      } else {
        navigate("/");
      }
      setLoaded(true);
    }
    load();
  }, [id, navigate]);

  // === סימון שינוי ===
  useEffect(() => {
    if (loaded) dirty.current = true;
  }, [items, reportName, attendees, loaded]);

  // === שמירה (מחזיר promise כדי לאפשר המתנה) ===
  const save = useCallback(async () => {
    if (!loaded) return;
    dirty.current = false;
    setSaveStatus("saving");
    try {
      await storage.saveReport(id, { name: reportName, items, attendees });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("");
    }
  }, [id, reportName, items, attendees, loaded]);

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
        save(); // שמירה אחרונה (best-effort — הדפדפן לא מחכה ל-async)
        e.preventDefault();
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
    setItems((prev) => {
      const last = prev[prev.length - 1];
      const inherited = {
        structure: last?.structure || "",
        room: last?.room || "",
      };
      return [...prev, { ...createEmptyItem(), ...inherited }];
    });
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  async function handleCameraCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);

      setItems((prev) => {
        const last = prev[prev.length - 1];
        const isEmpty = !last?.image_original && !last?.description;

        if (isEmpty) {
          return prev.map((it, i) =>
            i === prev.length - 1 ? { ...it, image_original: compressed, needsMarkup: true } : it
          );
        } else {
          const inherited = {
            structure: last?.structure || "",
            room: last?.room || "",
          };
          return [...prev, { ...createEmptyItem(), ...inherited, image_original: compressed, needsMarkup: true }];
        }
      });

      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  // === יצירת Excel - עצמאי לחלוטין מהשמירה ===
  // משתמש בנתוני ה-state הנוכחיים ישירות, בלי תלות ב-storage
  async function handleGenerate() {
    const hasContent = items.some((it) => it.structure);
    if (!hasContent) {
      alert("יש למלא לפחות פריט אחד עם מבנה.");
      return;
    }
    setGenerating(true);
    try {
      const existing = await storage.getReport(id);
      const reportData = {
        id,
        name: reportName,
        items,
        attendees: attendees.filter(Boolean),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await generateExcel(reportData);
    } catch (e) {
      alert("שגיאה ביצירת הדוח: " + e.message);
    } finally {
      setGenerating(false);
    }
  }

  const q = query.trim().toLowerCase();
  const visibleItems = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) =>
      !q ||
      (item.structure || "").toLowerCase().includes(q) ||
      (item.room || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q)
    );

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
          onClick={async () => { await save(); navigate("/"); }}
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

      {/* נוכחים */}
      <div className="mb-5" dir="rtl">
        <h3 className="text-sm font-semibold text-navy-900 mb-2">נוכחים</h3>
        <div className="space-y-2">
          {attendees.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const next = [...attendees];
                  next[i] = e.target.value;
                  setAttendees(next);
                }}
                placeholder="שם נוכח"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-base
                           focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
              <button
                type="button"
                onClick={() => setAttendees((prev) => prev.filter((_, j) => j !== i))}
                disabled={attendees.length <= 2}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50
                           disabled:opacity-0 disabled:pointer-events-none transition-colors"
                aria-label="הסר נוכח"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAttendees((prev) => [...prev, ""])}
          className="mt-2 flex items-center gap-1.5 text-sm text-navy-700 font-medium
                     hover:text-navy-900 transition-colors"
        >
          <Plus size={16} />
          הוסף נוכח
        </button>
      </div>

      {/* חיפוש ליקויים */}
      <div className="relative mb-4" dir="rtl">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי מבנה, חדר או תיאור..."
          className="w-full border border-gray-300 rounded-xl pr-10 pl-10 py-2.5 text-base
                     focus:outline-none focus:ring-2 focus:ring-navy-600"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* פריטים */}
      <div className="space-y-4">
        {visibleItems.map(({ item, idx }) => (
          <ItemForm
            key={item.id}
            item={item}
            index={idx}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
          />
        ))}
        {q && visibleItems.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">לא נמצאו ליקויים תואמים</p>
        )}
      </div>

      {/* הוסף + צלם */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 border-2 border-dashed border-blue-300 rounded-2xl py-4
                     flex items-center justify-center gap-2 text-blue-500 font-medium
                     hover:border-blue-500 hover:text-blue-600 transition-colors active:bg-blue-50"
        >
          <Camera size={20} />
          צלם ליקוי
        </button>
        <button
          onClick={addItem}
          className="flex-1 border-2 border-dashed border-gray-300 rounded-2xl py-4
                     flex items-center justify-center gap-2 text-gray-400 font-medium
                     hover:border-navy-600 hover:text-navy-600 transition-colors active:bg-gray-50"
        >
          <Plus size={20} />
          הוסף ליקוי
        </button>
      </div>

      {/* סרגל תחתון */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-300
                       text-gray-600 font-medium active:scale-[0.98] transition-all shrink-0"
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
            className="flex-1 flex items-center justify-center gap-1.5 bg-navy-700 hover:bg-navy-800
                       text-white py-3 rounded-xl font-medium disabled:opacity-50
                       active:scale-[0.98] transition-all min-w-0"
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> מייצר...</>
            ) : (
              <><FileSpreadsheet size={18} /><span className="truncate">צור דוח Excel</span></>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
