"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import {
  NEXT_THEME,
  THEME_EVENT,
  THEME_STORAGE_KEY,
  applyThemePreference,
  readThemePreference,
  syncThemeClass,
  type ThemePreference,
} from "@/lib/theme";

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      syncThemeClass(readThemePreference());
      onChange();
    }
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const ICONS: Record<ThemePreference, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readThemePreference, () => "system" as ThemePreference);

  // عند "تلقائي": تابع تغيّر مظهر الجهاز أثناء فتح الصفحة
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => syncThemeClass("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const Icon = ICONS[preference];
  const current = labels.theme[preference];
  const next = labels.theme[NEXT_THEME[preference]];

  return (
    <button
      type="button"
      onClick={() => applyThemePreference(NEXT_THEME[preference])}
      className={buttonClasses("ghost", "sm")}
      aria-label={`${labels.theme.label}: ${current}. ${labels.theme.switchTo} ${next}`}
      title={`${labels.theme.label}: ${current}`}
      data-theme-preference={preference}
    >
      <Icon className="size-4" aria-hidden />
      <span>{current}</span>
    </button>
  );
}
