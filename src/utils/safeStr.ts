/**
 * Safely extract a display string from a value that might be a FHIR
 * CodeableConcept ({text, coding}), a Coding ({display, code}), an array,
 * or a plain string/number.
 *
 * Returns `fallback` (default "") when no meaningful string can be extracted.
 */
export function safeStr(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    // Array of CodeableConcept / Coding — join display strings
    const parts = value.map((v) => safeStr(v)).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : fallback;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // FHIR CodeableConcept: { text?: string, coding?: [{display, code, system}] }
    if (typeof obj.text === "string" && obj.text) return obj.text;
    if (typeof obj.display === "string" && obj.display) return obj.display;
    if (Array.isArray(obj.coding) && obj.coding.length > 0) {
      const c = obj.coding[0] as Record<string, unknown>;
      if (typeof c?.display === "string" && c.display) return c.display;
      if (typeof c?.code === "string" && c.code) return c.code;
    }
    // FHIR Reference: { reference?: string, display?: string }
    if (typeof obj.reference === "string") return obj.display ? String(obj.display) : obj.reference;
    // Generic: try common display-like keys
    for (const key of ["name", "value", "label"]) {
      if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
    }
  }
  return fallback;
}
