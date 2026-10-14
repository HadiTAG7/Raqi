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

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readThemePreference, () => "system" as ThemePreference);
  // الخادم لا يعرف التفضيل المحفوظ؛ نخفي الأيقونة والنص حتى يُعرف على الجهاز لتجنّب عرض "تلقائي" بالخطأ
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // يعيد تطبيق المظهر عند التركيب (قد يكون مظهر الجهاز تغيّر بينما لم تكن الأداة معروضة)،
  // ويتابع تغيّر مظهر الجهاز أثناء فتح الصفحة. يقرأ التفضيل الحالي في كل مرة بدل قيمة محفوظة
  // من وقت العرض، حتى لا يُلغي ضغطة سريعة على الزر حدثت أثناء تحميل الصفحة.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => syncThemeClass(readThemePreference());
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const Icon = ICONS[preference];
  const current = labels.theme[preference];
  const next = labels.theme[NEXT_THEME[preference]];

  return (
    <button
      type="button"
      // نقرأ التفضيل المحفوظ لحظة الضغط (قد تُعاد الضغطة بعد التحميل قبل تحديث العرض)
      onClick={() => applyThemePreference(NEXT_THEME[readThemePreference()])}
      className={buttonClasses("ghost", "sm")}
      aria-label={`${labels.theme.label}: ${current}. ${labels.theme.switchTo} ${next}`}
      title={`${labels.theme.label}: ${current}`}
      data-theme-preference={preference}
    >
      <Icon className={hydrated ? "size-4" : "invisible size-4"} aria-hidden />
      <span className={hydrated ? undefined : "invisible"}>{current}</span>
    </button>
  );
}
