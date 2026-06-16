import { useRef, useState, useEffect, useCallback } from "react";
import { Undo2, Check, X, Minus, Circle, MoveUpRight } from "lucide-react";

const TOOLS = [
  { id: "freehand", label: "חופשי", Icon: Minus },
  { id: "arrow", label: "חץ", Icon: MoveUpRight },
  { id: "circle", label: "עיגול", Icon: Circle },
];

const COLOR = "#ef4444";
const WIDTH = 3;

export default function CanvasMarkup({ imageSrc, onSave, onCancel }) {
  const mainRef = useRef(null);
  const overlayRef = useRef(null);
  const [tool, setTool] = useState("freehand");
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [history, setHistory] = useState([]);
  const imgObjRef = useRef(null);

  // טעינת התמונה על הקנבס
  useEffect(() => {
    const main = mainRef.current;
    const overlay = overlayRef.current;
    const ctx = main.getContext("2d");
    const img = new Image();

    img.onload = () => {
      imgObjRef.current = img;
      const maxW = Math.min(img.width, window.innerWidth - 24);
      const scale = maxW / img.width;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      main.width = w;
      main.height = h;
      overlay.width = w;
      overlay.height = h;

      ctx.drawImage(img, 0, 0, w, h);
      setHistory([ctx.getImageData(0, 0, w, h)]);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getPos = useCallback((e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    const t = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }, []);

  function snapshot() {
    const c = mainRef.current;
    setHistory((prev) => [...prev.slice(-15), c.getContext("2d").getImageData(0, 0, c.width, c.height)]);
  }

  function drawArrowOn(ctx, from, to) {
    const head = 14;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  function drawEllipseOn(ctx, start, end) {
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    if (rx < 2 && ry < 2) return;
    ctx.beginPath();
    ctx.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function setupCtx(ctx) {
    ctx.strokeStyle = COLOR;
    ctx.lineWidth = WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // === אירועי ציור ===
  function handleStart(e) {
    e.preventDefault();
    const pos = getPos(e);
    setDrawing(true);
    setStartPos(pos);
    snapshot();

    if (tool === "freehand") {
      const ctx = mainRef.current.getContext("2d");
      setupCtx(ctx);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function handleMove(e) {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e);

    if (tool === "freehand") {
      const ctx = mainRef.current.getContext("2d");
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // תצוגה מקדימה על overlay
      const octx = overlayRef.current.getContext("2d");
      octx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      setupCtx(octx);
      if (tool === "arrow") drawArrowOn(octx, startPos, pos);
      else drawEllipseOn(octx, startPos, pos);
    }
  }

  function handleEnd(e) {
    e.preventDefault();
    if (!drawing) return;
    setDrawing(false);

    if (tool !== "freehand" && startPos) {
      const pos = getPos(e);
      const ctx = mainRef.current.getContext("2d");
      setupCtx(ctx);
      if (tool === "arrow") drawArrowOn(ctx, startPos, pos);
      else drawEllipseOn(ctx, startPos, pos);
      // נקה overlay
      overlayRef.current.getContext("2d").clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  }

  function handleUndo() {
    if (history.length <= 1) return;
    const newH = history.slice(0, -1);
    mainRef.current.getContext("2d").putImageData(newH[newH.length - 1], 0, 0);
    setHistory(newH);
  }

  function handleSave() {
    onSave(mainRef.current.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* סרגל כלים */}
      <div className="flex items-center justify-between px-3 py-2 bg-navy-900/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${tool === t.id ? "bg-danger text-white" : "text-white/70"}`}
            >
              <t.Icon size={16} />
              {t.label}
            </button>
          ))}
          <button onClick={handleUndo} className="p-2 text-white/70 hover:text-white mr-2">
            <Undo2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="p-2 text-white/60 hover:text-white">
            <X size={22} />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-success text-white px-4 py-2 rounded-lg font-medium"
          >
            <Check size={18} />
            שמור
          </button>
        </div>
      </div>

      {/* אזור ציור */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3">
        <div className="relative inline-block">
          <canvas ref={mainRef} className="block max-w-full" />
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ touchAction: "none" }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>
      </div>
    </div>
  );
}
