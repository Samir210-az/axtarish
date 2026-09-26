"use client";

import { useEffect } from "react";

/**
 * SECURITY GROUP-un paylaşılan "Sistem Jurnalı" admin panelinə (Menyu-dakı
 * sg-insight-x92q.html) səhifə baxışlarını göndərir. Firebase-in klient SDK-sını
 * yükləmədən, birbaşa REST API ilə işləyir ki, əlavə asılılıq yaranmasın.
 */
const FIREBASE_API_KEY = "AIzaSyCBhyGNzZRGgQShP_C9kwAzTm_g_0zJlzg";
const RTDB_URL = "https://an-psixoloji-33442-default-rtdb.firebaseio.com";
const PROJECT_NAME = "Axtarış";
const SID_KEY = "sg_sid_v1";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "s_" + Date.now().toString(36);
  }
}

let idTokenPromise: Promise<string | null> | null = null;
function getIdToken(): Promise<string | null> {
  if (!idTokenPromise) {
    idTokenPromise = fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInAnonymously?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
      }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data && typeof data.idToken === "string" ? data.idToken : null))
      .catch(() => null);
  }
  return idTokenPromise;
}

async function getGeo() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();
    if (data && data.success !== false) {
      return {
        ip: data.ip || "naməlum",
        city: data.city || "",
        region: data.region || "",
        country: data.country || "",
      };
    }
  } catch {
    /* səssiz — analitika uğursuz olsa da sayt normal işləməlidir */
  }
  return { ip: "naməlum", city: "", region: "", country: "" };
}

async function trackPageView() {
  try {
    const token = await getIdToken();
    if (!token) return;
    const geo = await getGeo();
    const payload = {
      type: "page_view",
      source: PROJECT_NAME,
      data: { path: location.pathname + location.search },
      sid: getSessionId(),
      ip: geo.ip,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      ua: navigator.userAgent,
      lang: navigator.language,
      screen: typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "",
      ts: Date.now(),
      tsHuman: new Date().toISOString(),
    };
    await fetch(`${RTDB_URL}/menyu_analytics/events.json?auth=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* səssiz uğursuzluq — istifadəçi təcrübəsinə mane olmasın */
  }
}

export function SgInsight() {
  useEffect(() => {
    trackPageView();
  }, []);

  return null;
}
