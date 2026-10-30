"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";

const subscribe = () => () => {};

/** iOS can't show an install prompt, so explain "Add to Home Screen" there. */
export function InstallHint() {
  const { t } = useI18n();
  const show = useSyncExternalStore(
    subscribe,
    () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      return isIOS && !standalone;
    },
    () => false,
  );

  if (!show) return null;
  return (
    <p className="max-w-xs rounded-xl bg-zinc-900 p-3 text-center text-sm text-zinc-400">
      {t.ui.install} <strong className="text-zinc-200">{t.ui.addToHome}</strong>.
    </p>
  );
}
