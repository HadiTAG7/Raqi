export type LineType = "primary" | "international" | "local";

/** التركيبة الثابتة لكل باقة: 1 أساسي، 2 دولي، 2 محلي. */
export const LINE_SLOTS: ReadonlyArray<{ slot: number; type: LineType }> = [
  { slot: 1, type: "primary" },
  { slot: 2, type: "international" },
  { slot: 3, type: "international" },
  { slot: 4, type: "local" },
  { slot: 5, type: "local" },
];

export const LINE_TYPE_LABELS: Record<LineType, string> = {
  primary: "أساسي",
  international: "دولي",
  local: "محلي",
};
