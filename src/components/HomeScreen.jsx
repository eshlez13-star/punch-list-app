import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../lib/storage";
import { Plus, Download, Pencil, Trash2, FileSpreadsheet, HardHat } from "lucide-react";
import { generateExcel } from "../lib/excelGenerator";

export default function HomeScreen() {
  const [reports, setReports] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setReports(storage.listReports());
  }, []);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const id = storage.createReport(name);
    navigate(`/report/${id}`);
  }

  function handleDelete(id) {
    if (!confirm("למחוק את הדוח?")) return;
    storage.deleteReport(id);
    setReports(storage.listReports());
  }

  async function handleDownload(id) {
    const report = storage.getReport(id);
    if (!report) return;
    await generateExcel(report);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* כותרת */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-navy-700 text-white px-5 py-2.5 rounded-xl mb-4">
          <HardHat size={22} />
          <span className="font-bold text-lg tracking-wide">SPIVAK</span>
        </div>
        <h1 className="text-2xl font-bold text-navy-900">דוח ליקויים</h1>
        <p className="text-sm text-gray-500 mt-1">Punch List / סיור קבלה</p>
      </div>

      {/* יצירת דוח חדש */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
          <Plus size={18} />
          דוח חדש
        </h2>
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full bg-navy-700 hover:bg-navy-800 text-white py-3 rounded-xl font-medium
                       active:scale-[0.98] transition-all"
          >
            צור דוח חדש
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder='לדוגמה: "סיור קבלה - מבנה 3"'
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base
                         focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <button
              onClick={handleCreate}
              className="bg-navy-700 hover:bg-navy-800 text-white px-6 rounded-xl font-medium
                         active:scale-[0.98] transition-all"
            >
              צור
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(""); }}
              className="text-gray-400 px-3"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ארכיון */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2">
            <FileSpreadsheet size={18} />
            ארכיון דוחות
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            אין דוחות עדיין. צור את הדוח הראשון שלך.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.itemCount} פריטים
                    {r.updatedAt && ` · ${new Date(r.updatedAt).toLocaleDateString("he-IL")}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {r.itemCount > 0 && (
                    <button
                      onClick={() => handleDownload(r.id)}
                      className="p-2.5 rounded-lg bg-green-50 text-success hover:bg-green-100 transition-colors"
                      title="הורד Excel"
                    >
                      <Download size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/report/${r.id}`)}
                    className="p-2.5 rounded-lg bg-sky-100 text-navy-700 hover:bg-sky-200 transition-colors"
                    title="ערוך"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2.5 rounded-lg bg-red-50 text-danger hover:bg-red-100 transition-colors"
                    title="מחק"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
