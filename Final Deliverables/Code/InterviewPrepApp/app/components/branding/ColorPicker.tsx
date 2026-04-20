"use client";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#3ecf8e"
          className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-[#3ecf8e]"
        />
        <div
          className="h-10 flex-1 rounded-lg border border-white/10"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}
