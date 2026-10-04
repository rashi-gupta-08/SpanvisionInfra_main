import { createSignal, createContext, useContext, type JSX } from "solid-js";
import en from "../locales/en";

// ── Types ──────────────────────────────────────────────────
export type Locale = "nl" | "en" | "de" | "fr" | "es" | "pt" | "zh" | "ja" | "pl" | "tr" | "ko" | "it" | "ru" | "uk" | "cs" | "ro" | "hu" | "sv" | "da" | "no" | "fi" | "el" | "bg" | "hr" | "sk";

type Translations = Record<string, string>;

const locales: Partial<Record<Locale, Translations>> = { en };

// ── Core i18n factory ──────────────────────────────────────

export function createI18n(_initialLocale: Locale = "en") {
  const [locale, setLocaleState] = createSignal<Locale>("en");

  /**
   * Look up a translation key.
   *
   * 1. Try the current locale
   * 2. Fall back to English if the key is missing
   * 3. Return the raw key if it exists in neither locale
   *
   * Supports `{param}` interpolation:
   *   t("app.startupActive", { hotkey: "Ctrl+Win" })
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    let value =
      locales[locale()]?.[key] ??
      locales.en?.[key] ??
      key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replaceAll(`{${k}}`, String(v));
      }
    }

    return value;
  };

  const availableLocales: Locale[] = ["en"];
  const setLocale = (_value: unknown) => setLocaleState("en");

  return { t, locale, setLocale, availableLocales };
}

// ── Standalone t() for use outside components ─────────────

let _sharedI18n: ReturnType<typeof createI18n> | null = null;

/**
 * Standalone translation function for use outside SolidJS components
 * (e.g. in api.ts, utility modules). Uses the same locale as the provider.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  if (!_sharedI18n) _sharedI18n = createI18n("en");
  return _sharedI18n.t(key, params);
}

// ── Context / Provider / Hook ──────────────────────────────

type I18nValue = ReturnType<typeof createI18n>;

export const I18nContext = createContext<I18nValue>();

interface I18nProviderProps {
  initialLocale?: Locale;
  children: JSX.Element;
}

export function I18nProvider(props: I18nProviderProps) {
  // Re-use the shared singleton so standalone t() stays in sync
  if (!_sharedI18n) _sharedI18n = createI18n(props.initialLocale ?? "en");
  else if (props.initialLocale) _sharedI18n.setLocale(props.initialLocale);
  const i18n = _sharedI18n;

  return (
    // @ts-ignore — SolidJS JSX provider typing
    <I18nContext.Provider value={i18n}>
      {props.children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an <I18nProvider>");
  }
  return ctx;
}

// ── Language options helper ────────────────────────────────

/**
 * Returns an array of `{ value, label }` objects for a speech-recognition
 * language selector, translated via the supplied `t` function.
 */
// Native script names for each language (constant, never translated)
const nativeNames: Record<string, string> = { en: "English" };

export function getLanguageOptions(t: (key: string) => string) {
  const codes = Object.keys(nativeNames);
  const langs = codes.map((c) => {
    const translated = t(`languages.${c}`);
    const native = nativeNames[c];
    // If the translated name is the same as the native name, don't repeat it
    const label = translated === native ? translated : `${translated} (${native})`;
    return { value: c, label };
  });
  langs.sort((a, b) => a.label.localeCompare(b.label));
  return langs;
}
