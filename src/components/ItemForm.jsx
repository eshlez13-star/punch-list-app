import { useState, useRef, useEffect } from "react";
import { STRUCTURES, RESPONSIBILITIES, DEFECT_TEMPLATES, SAFETY_TEMPLATES, RECURRING_NOTE } from "../lib/constants";
import { compressImage } from "../lib/imageCompressor";
import { Camera, FolderOpen, X, Pencil, ChevronDown, ChevronUp, Trash2, CheckCheck } from "lucide-react";
import CanvasMarkup from "./CanvasMarkup";

export default function ItemForm({ item, index, onChange, onRemove }) {
  const [showMarkup, setShowMarkup] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fileCamRef = useRef(null);
  const fileGalleryRef = useRef(null);
  const fileAfterCamRef = useRef(null);
  const fileAfterGalleryRef = useRef(null);

  useEffect(() => {
    if (item.needsMarkup) {
      setShowMarkup(true);
      update("needsMarkup", false);
    }
  }, [item.needsMarkup]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field, value) {
    onChange(index, { ...item, [field]: value });
  }

  function updateMany(fields) {
    onChange(index, { ...item, ...fields });
  }

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      updateMany({ image_original: compressed, image_marked: null });
      setShowMarkup(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleImageAfterFix(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      update("image_after_fix", compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleMarkupSave(dataUrl) {
    update("image_marked", dataUrl);
    setShowMarkup(false);
  }

  function handleRemoveImage() {
    updateMany({ image_original: null, image_marked: null });
  }

  function handleRemoveAfterImage() {
    update("image_after_fix", null);
  }

  const displayImage = item.image_marked || item.image_original;
  const subtitle = item.structure ? item.structure.split(" - ")[1] : "";

  function ImagePicker({ onCamClick, onGalleryClick, blue }) {
    const base = blue
      ? "border-blue-200 text-blue-300 hover:border-blue-400 hover:text-blue-400 active:bg-blue-50"
      : "border-gray-300 text-gray-400 hover:border-navy-600 hover:text-navy-600 active:bg-gray-50";
    return (
      <details className="group">
        <summary
          className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer w-full
                      border-2 border-dashed rounded-xl py-7 flex flex-col items-center gap-2
                      transition-colors ${base}`}
        >
          <Camera size={26} />
          <span className="text-sm font-medium">צלם או בחר תמונה</span>
        </summary>
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCamClick}
            className={`flex-1 border-2 border-dashed rounded-xl py-4
                        flex flex-col items-center gap-1.5 transition-colors ${base}`}
          >
            <Camera size={22} />
            <span className="text-xs font-medium">צלם</span>
          </button>
          <button
            onClick={onGalleryClick}
            className={`flex-1 border-2 border-dashed rounded-xl py-4
                        flex flex-col items-center gap-1.5 transition-colors ${base}`}
          >
            <FolderOpen size={22} />
            <span className="text-xs font-medium">גלריה</span>
          </button>
        </div>
      </details>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100"
        >
          <span className="font-medium text-navy-800">
            ליקוי #{index + 1}
            {subtitle && <span className="text-gray-400 font-normal text-sm mr-2">{subtitle}</span>}
          </span>
          <div className="flex items-center gap-2">
            {displayImage && <span className="w-2 h-2 rounded-full bg-success" />}
            {item.image_after_fix && <span className="w-2 h-2 rounded-full bg-blue-400" />}
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </button>

        {!collapsed && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">מבנה</label>
              <select
                value={item.structure}
                onChange={(e) => update("structure", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white
                           focus:outline-none focus:ring-2 focus:ring-navy-600"
              >
                <option value="">בחר מבנה...</option>
                {STRUCTURES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">חדר / חלל</label>
              <input
                type="text"
                value={item.room}
                onChange={(e) => update("room", e.target.value)}
                placeholder="שם החדר או האזור..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">חתך (0-90)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="90"
                step="0.1"
                value={item.section}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") { update("section", ""); return; }
                  const n = parseFloat(v);
                  if (!isNaN(n) && n >= 0 && n <= 90) update("section", v);
                }}
                placeholder="0"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>

            {/* תמונת ליקוי */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">תמונת ליקוי</label>
              {displayImage ? (
                <div className="relative">
                  <img
                    src={displayImage}
                    alt="ליקוי"
                    className="w-full rounded-xl border border-gray-200 max-h-60 object-contain bg-gray-50"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <button
                      onClick={() => setShowMarkup(true)}
                      className="p-2 bg-navy-700/80 text-white rounded-lg backdrop-blur"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      className="p-2 bg-danger/80 text-white rounded-lg backdrop-blur"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <ImagePicker
                  onCamClick={() => fileCamRef.current?.click()}
                  onGalleryClick={() => fileGalleryRef.current?.click()}
                  blue={false}
                />
              )}
              <input ref={fileCamRef} type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
              <input ref={fileGalleryRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>

            {/* תמונה לאחר תיקון */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <CheckCheck size={14} className="text-blue-500" />
                תמונה לאחר תיקון
              </label>
              {item.image_after_fix ? (
                <div className="relative">
                  <img
                    src={item.image_after_fix}
                    alt="לאחר תיקון"
                    className="w-full rounded-xl border border-blue-200 max-h-60 object-contain bg-blue-50"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <button
                      onClick={() => fileAfterCamRef.current?.click()}
                      className="p-2 bg-blue-600/80 text-white rounded-lg backdrop-blur"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={handleRemoveAfterImage}
                      className="p-2 bg-danger/80 text-white rounded-lg backdrop-blur"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <ImagePicker
                  onCamClick={() => fileAfterCamRef.current?.click()}
                  onGalleryClick={() => fileAfterGalleryRef.current?.click()}
                  blue={true}
                />
              )}
              <input ref={fileAfterCamRef} type="file" accept="image/*" capture="environment" onChange={handleImageAfterFix} className="hidden" />
              <input ref={fileAfterGalleryRef} type="file" accept="image/*" onChange={handleImageAfterFix} className="hidden" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">פירוט הבעיה</label>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {DEFECT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    onClick={() => update("description", item.description ? `${item.description}, ${tpl}` : tpl)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors bg-white text-gray-600 border-gray-300 hover:border-navy-600 hover:text-navy-700"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
              {/* כפתורי בטיחות + הערה חוזרת */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {SAFETY_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    onClick={() => update("description", item.description ? `${item.description}, ${tpl}` : tpl)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-500 hover:bg-amber-100"
                  >
                    {tpl}
                  </button>
                ))}
                <button
                  onClick={() => update("description", item.description ? `${item.description}, ${RECURRING_NOTE}` : RECURRING_NOTE)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200"
                >
                  {RECURRING_NOTE}
                </button>
              </div>
              <textarea
                value={item.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="תאר את הליקוי..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base resize-none
                           focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">גורם אחראי</label>
              <div className="flex gap-2 flex-wrap">
                {RESPONSIBILITIES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => update("responsibility", r.value)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors
                      ${item.responsibility === r.value
                        ? "bg-navy-700 text-white border-navy-700"
                        : "bg-white text-gray-600 border-gray-300"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm("למחוק את הליקוי? פעולה זו אינה הפיכה.")) {
                  onRemove(index);
                }
              }}
              className="flex items-center gap-1.5 text-sm text-danger/70 hover:text-danger mt-2"
            >
              <Trash2 size={14} />
              הסר ליקוי
            </button>
          </div>
        )}
      </div>

      {showMarkup && (
        <CanvasMarkup
          imageSrc={item.image_original}
          onSave={handleMarkupSave}
          onCancel={() => setShowMarkup(false)}
        />
      )}
    </>
  );
}
