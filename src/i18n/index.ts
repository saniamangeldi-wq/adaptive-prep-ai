import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enLegacy from "./en";
import kkLegacy from "./kk";
import ruLegacy from "./ru";
import enJson from "./en.json";
import ruJson from "./ru.json";
import kkJson from "./kk.json";

// Deep-merge legacy TS translation namespaces (sidebar/settings/roles/common)
// with the new JSON namespaces (landing/marketing/auth) so both coexist.
function deepMerge<T extends Record<string, any>>(a: T, b: T): T {
  const out: any = { ...a };
  for (const key of Object.keys(b)) {
    const av = (a as any)[key];
    const bv = (b as any)[key];
    if (av && bv && typeof av === "object" && typeof bv === "object" && !Array.isArray(av) && !Array.isArray(bv)) {
      out[key] = deepMerge(av, bv);
    } else {
      out[key] = bv;
    }
  }
  return out;
}

const en = deepMerge(enLegacy as any, enJson as any);
const ru = deepMerge(ruLegacy as any, ruJson as any);
const kk = deepMerge(kkLegacy as any, kkJson as any);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      kk: { translation: kk },
      ru: { translation: ru },
    },
    // The interface is English only. The language choice in Settings sets the language of feedback and chat answers.
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
