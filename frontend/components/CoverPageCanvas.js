"use client";

import { useCallback, useRef } from "react";
import { buildContent } from "../lib/coverPdf";

// Fixed preview width so the pt→px scale factor is a known constant instead
// of something measured live — simpler, and accurate enough for dragging.
// A4 is 595.28pt wide; this keeps font sizes on screen proportional to the
// exact sizes that land in the downloaded PDF.
const PREVIEW_W = 440;
const PAGE_W_PT = 595.28;
const SCALE = PREVIEW_W / PAGE_W_PT;

const ANCHOR_TRANSFORM = {
  left: "translate(0, -50%)",
  center: "translate(-50%, -50%)",
  right: "translate(-100%, -50%)",
};

function DraggableItem({ id, el, canvasRef, onMove, onSelect, selected, children, anchor = "center" }) {
  const dragState = useRef(null);

  const onPointerMove = useCallback(
    (e) => {
      const state = dragState.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!state || !rect) return;
      const dxPct = ((e.clientX - state.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - state.startY) / rect.height) * 100;
      onMove(id, {
        x: Math.min(100, Math.max(0, state.origX + dxPct)),
        y: Math.min(100, Math.max(0, state.origY + dyPct)),
      });
    },
    [id, onMove, canvasRef]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  function onPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, transform: ANCHOR_TRANSFORM[anchor] || ANCHOR_TRANSFORM.center, touchAction: "none" }}
      className={`cursor-grab active:cursor-grabbing select-none px-1 rounded transition-shadow ${
        selected ? "outline outline-2 outline-brass-400 outline-offset-4 bg-brass-50/40" : "hover:outline hover:outline-1 hover:outline-brass-200 hover:outline-offset-4"
      }`}
    >
      {children}
    </div>
  );
}

export default function CoverPageCanvas({ form, logo, layout, onMove, selected, onSelect }) {
  const canvasRef = useRef(null);
  const t = buildContent(form);

  function textStyle(el) {
    const font = FONT_CSS[el.font] || FONT_CSS.times;
    return {
      fontFamily: font,
      fontSize: `${(el.fontSize || 12) * SCALE * 1.15}px`, // *1.15: pt→px baseline nudge so on-screen scale reads true to print size
      fontWeight: el.bold ? 700 : 400,
      fontStyle: el.italic ? "italic" : "normal",
      textAlign: el.align || "center",
      color: "#12192B",
      whiteSpace: "nowrap",
    };
  }

  return (
    <div
      ref={canvasRef}
      onPointerDown={() => onSelect(null)}
      className="relative bg-white border-2 border-ink-800 mx-auto"
      style={{ width: PREVIEW_W, aspectRatio: "210 / 297" }}
    >
      <div className="absolute inset-[6px] border border-gray-300 pointer-events-none" />

      {logo?.dataUrl && (
        <DraggableItem id="logo" el={layout.logo} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "logo"} anchor="center">
          <img src={logo.dataUrl} alt="" style={{ width: (layout.logo.w / 100) * PREVIEW_W, objectFit: "contain" }} draggable={false} />
        </DraggableItem>
      )}

      {t.uni && (
        <DraggableItem id="university" el={layout.university} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "university"} anchor={layout.university.align}>
          <div style={textStyle(layout.university)}>{t.uni}</div>
        </DraggableItem>
      )}
      {t.dept && (
        <DraggableItem id="department" el={layout.department} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "department"} anchor={layout.department.align}>
          <div style={{ ...textStyle(layout.department), color: "#7A7E8A" }}>{t.dept}</div>
        </DraggableItem>
      )}
      {t.course && (
        <DraggableItem id="course" el={layout.course} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "course"} anchor={layout.course.align}>
          <div style={{ ...textStyle(layout.course), color: "#464A56" }}>{t.course}</div>
        </DraggableItem>
      )}
      {t.subtitle && (
        <DraggableItem id="subtitle" el={layout.subtitle} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "subtitle"} anchor={layout.subtitle.align}>
          <div style={{ ...textStyle(layout.subtitle), color: "#7A7E8A" }}>{t.subtitle}</div>
        </DraggableItem>
      )}
      <DraggableItem id="title" el={layout.title} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "title"} anchor={layout.title.align}>
        <div style={{ ...textStyle(layout.title), whiteSpace: "normal", maxWidth: PREVIEW_W - 120 }}>{t.title}</div>
      </DraggableItem>

      <DraggableItem id="divider" el={layout.divider} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "divider"} anchor="center">
        <div style={{ width: 34, height: 2, background: "#AB812E" }} />
      </DraggableItem>

      {t.studentLines.length > 0 && (
        <DraggableItem id="submittedBy" el={layout.submittedBy} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "submittedBy"} anchor={layout.submittedBy.align}>
          <div style={{ ...textStyle(layout.submittedBy), whiteSpace: "normal", width: 150 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Submitted by</div>
            {t.studentLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </DraggableItem>
      )}
      {t.teacherLines.length > 0 && (
        <DraggableItem id="submittedTo" el={layout.submittedTo} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "submittedTo"} anchor={layout.submittedTo.align}>
          <div style={{ ...textStyle(layout.submittedTo), whiteSpace: "normal", width: 150 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Submitted to</div>
            {t.teacherLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </DraggableItem>
      )}

      {t.date && (
        <DraggableItem id="date" el={layout.date} canvasRef={canvasRef} onMove={onMove} onSelect={onSelect} selected={selected === "date"} anchor={layout.date.align}>
          <div style={{ ...textStyle(layout.date), color: "#7A7E8A" }}>Date of submission: {t.date}</div>
        </DraggableItem>
      )}
    </div>
  );
}

const FONT_CSS = {
  times: '"Times New Roman", Georgia, serif',
  helvetica: "Helvetica, Arial, sans-serif",
  courier: '"Courier New", monospace',
};
