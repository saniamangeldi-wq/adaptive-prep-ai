import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechLang = "en" | "ru" | "kk" | string;

const LANG_MAP: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  kk: "kk-KZ",
};

function toBcp47(lang: SpeechLang): string {
  if (!lang) return "en-US";
  if (lang.includes("-")) return lang;
  return LANG_MAP[lang] || lang;
}

export interface UseSpeechSynthesisResult {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  voices: SpeechSynthesisVoice[];
  /** Returns true if speech started, false if fallback/unsupported for that language */
  speak: (text: string, lang?: SpeechLang) => boolean;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** true if a voice for the requested lang is unavailable and a fallback will be used */
  isLangFallback: (lang: SpeechLang) => boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
    };
  }, [supported]);

  // Poll speaking/paused state (Web Speech events are unreliable across browsers)
  useEffect(() => {
    if (!supported) return;
    const id = window.setInterval(() => {
      const s = window.speechSynthesis;
      setSpeaking(s.speaking && !s.paused);
      setPaused(s.paused);
    }, 250);
    return () => window.clearInterval(id);
  }, [supported]);

  const pickVoice = useCallback(
    (bcp47: string): SpeechSynthesisVoice | undefined => {
      if (voices.length === 0) return undefined;
      const lower = bcp47.toLowerCase();
      const base = lower.split("-")[0];
      // exact match
      let v = voices.find((v) => v.lang.toLowerCase() === lower);
      if (v) return v;
      // same base language
      v = voices.find((v) => v.lang.toLowerCase().startsWith(base + "-"));
      if (v) return v;
      // Kazakh fallback -> Russian
      if (base === "kk") {
        v = voices.find((v) => v.lang.toLowerCase().startsWith("ru"));
        if (v) return v;
      }
      return undefined;
    },
    [voices]
  );

  const isLangFallback = useCallback(
    (lang: SpeechLang) => {
      if (!supported) return false;
      const bcp = toBcp47(lang);
      const base = bcp.split("-")[0].toLowerCase();
      return !voices.some((v) => v.lang.toLowerCase().startsWith(base));
    },
    [supported, voices]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: SpeechLang = "en"): boolean => {
      if (!supported || !text) return false;
      const synth = window.speechSynthesis;
      const bcp = toBcp47(lang);
      const voice = pickVoice(bcp);

      // Chunk long text into ~180-char sentence groups — Chrome cuts off
      // utterances after ~15s / ~200 chars, so we queue smaller chunks.
      const chunks: string[] = [];
      const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/);
      let buf = "";
      for (const s of sentences) {
        if ((buf + " " + s).trim().length > 180 && buf) {
          chunks.push(buf.trim());
          buf = s;
        } else {
          buf = (buf + " " + s).trim();
        }
      }
      if (buf) chunks.push(buf);
      if (chunks.length === 0) chunks.push(text);

      const startQueue = () => {
        chunks.forEach((chunk, i) => {
          const u = new SpeechSynthesisUtterance(chunk);
          u.lang = bcp;
          if (voice) u.voice = voice;
          u.rate = 1;
          u.pitch = 1;
          if (i === chunks.length - 1) {
            u.onend = () => { setSpeaking(false); setPaused(false); };
          }
          u.onerror = () => { setSpeaking(false); setPaused(false); };
          synth.speak(u);
          if (i === 0) utteranceRef.current = u;
        });
        setSpeaking(true);
        setPaused(false);
      };

      // synth.cancel() is async in Chrome — a follow-up speak() in the same
      // tick can be swallowed. Defer briefly if we need to clear a queue.
      if (synth.speaking || synth.pending) {
        synth.cancel();
        window.setTimeout(startQueue, 120);
      } else {
        startQueue();
      }
      return true;
    },
    [supported, pickVoice]
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  // Stop on unmount
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, paused, voices, speak, pause, resume, stop, isLangFallback };
}
