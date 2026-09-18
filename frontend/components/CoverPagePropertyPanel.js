"use client";

import { FONT_CHOICES } from "../lib/coverPdf";

const LABELS = {
  logo: "Logo",
  university: "University name",
  department: "Department",
  course: "Course line",
  subtitle: "Assignment type / subtitle",
  title: "Title",
  divider: "Divider line",
  submittedBy: "Submitted by",
  submittedTo: "Submitted to",
  date: "Date",
};

function ToggleButton({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors ${
        active ? "bg-ink-800 text-white border-ink-800" : "border-gray-200 text-gray-500 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function CoverPagePropertyPanel({ selected, layout, onUpdate, onResetOne, onResetAll }) {
  if (!selected) {
    return (
      <div className="text-sm text-gray-400 leading-relaxed">
        Click and drag anything on the page to reposition it. Click an element to edit its font here.
        <button type="button" onClick={onResetAll} className="block mt-3 text-xs font-medium text-brass-600 hover:text-brass-700">
          Reset entire layout to default
        </button>
      </div>
    );
  }

  const el = layout[selected];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-800">{LABELS[selected] || selected}</div>
        <button type="button" onClick={() => onResetOne(selected)} className="text-xs text-gray-400 hover:text-crimson-500">
          Reset
        </button>
      </div>

      {selected === "logo" && (
        <div>
          <label className="text-xs text-gray-500 font-medium">Logo size</label>
          <input
            type="range" min="6" max="26" step="1" value={el.w}
            onChange={(e) => onUpdate(selected, { w: Number(e.target.value) })}
            className="w-full mt-2 accent-brass-500"
          />
        </div>
      )}

      {selected === "divider" && (
        <p className="text-xs text-gray-400">Just drag it wherever you'd like the rule to sit.</p>
      )}

      {selected !== "logo" && selected !== "divider" && (
        <>
          <div>
            <label className="text-xs text-gray-500 font-medium">Font</label>
            <select
              className="input mt-1.5 text-sm"
              value={el.font}
              onChange={(e) => onUpdate(selected, { font: e.target.value })}
            >
              {FONT_CHOICES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Size</label>
            <div className="flex items-center gap-2 mt-1.5">
              <button type="button" onClick={() => onUpdate(selected, { fontSize: Math.max(7, (el.fontSize || 12) - 1) })} className="w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:border-gray-300">−</button>
              <input
                type="number" min="7" max="40" step="0.5" value={el.fontSize}
                onChange={(e) => onUpdate(selected, { fontSize: Number(e.target.value) })}
                className="input text-sm text-center w-16 py-1.5"
              />
              <button type="button" onClick={() => onUpdate(selected, { fontSize: Math.min(40, (el.fontSize || 12) + 1) })} className="w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:border-gray-300">+</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Style</label>
            <div className="flex gap-1.5 mt-1.5">
              <ToggleButton title="Bold" active={el.bold} onClick={() => onUpdate(selected, { bold: !el.bold })}><b>B</b></ToggleButton>
              <ToggleButton title="Italic" active={el.italic} onClick={() => onUpdate(selected, { italic: !el.italic })}><i>I</i></ToggleButton>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">Alignment</label>
            <div className="flex gap-1.5 mt-1.5">
              <ToggleButton title="Left" active={el.align === "left"} onClick={() => onUpdate(selected, { align: "left" })}>⟵</ToggleButton>
              <ToggleButton title="Center" active={el.align === "center"} onClick={() => onUpdate(selected, { align: "center" })}>↔</ToggleButton>
              <ToggleButton title="Right" active={el.align === "right"} onClick={() => onUpdate(selected, { align: "right" })}>⟶</ToggleButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
