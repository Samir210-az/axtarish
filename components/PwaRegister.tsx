"use client";

import { useEffect } from "react";

/** Service worker-i qeydiyyatdan keçirir ki, sayt telefona PWA kimi yüklənə bilsin. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
