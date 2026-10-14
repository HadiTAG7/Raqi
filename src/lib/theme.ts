/** تفضيل المظهر المحفوظ على الجهاز (localStorage). غيابه = يتبع الجهاز. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "raqi-theme";
export const THEME_EVENT = "raqi-theme-change";

/**
 * سكربت صغير يعمل في <head> قبل رسم الصفحة لتجنّب وميض الوضع الفاتح.
 * يقرأ التفضيل ويضع الصنف .dark على <html>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(_){}})();`;

export function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** يطبّق التفضيل على <html> ويحفظه، ثم يبلّغ المستمعين. */
export function applyThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // التخزين غير متاح (وضع خاص مثلاً): نطبّق المظهر على هذه الصفحة فقط
  }
  syncThemeClass(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function syncThemeClass(preference: ThemePreference): void {
  const dark = preference === "dark" || (preference === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};
