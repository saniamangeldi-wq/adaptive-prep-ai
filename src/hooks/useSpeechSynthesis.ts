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
  currentText: string;
  voices: SpeechSynthesisVoice[];
  rate: number;
  setRate: (rate: number) => void;
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
  const [currentText, setCurrentText] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Tracks user intent — the Web Speech `paused`/`speaking` flags flicker
  // between chunked utterances, so we drive the UI from intent instead.
  const pauseIntentRef = useRef(false);
  const speakIntentRef = useRef(false);
  const [rate, setRateState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem("lesson.speechRate") || "1");
      return Number.isFinite(v) && v > 0 ? v : 1;
    } catch { return 1; }
  });
  const rateRef = useRef(rate);
  useEffect(() => { rateRef.current = rate; try { localStorage.setItem("lesson.speechRate", String(rate)); } catch {} }, [rate]);
  const lastTextRef = useRef<string>("");
  const lastLangRef = useRef<SpeechLang>("en");

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

  // Poll actual synth state, but let user intent win so pause/resume UI is
  // stable across queued utterance boundaries.
  useEffect(() => {
    if (!supported) return;
    const id = window.setInterval(() => {
      const s = window.speechSynthesis;
      if (pauseIntentRef.current) {
        // Chrome sometimes auto-resumes the queue; re-assert pause.
        if (!s.paused && (s.speaking || s.pending)) s.pause();
        setSpeaking(false);
        setPaused(true);
        return;
      }
      if (speakIntentRef.current && (s.speaking || s.pending)) {
        setSpeaking(true);
        setPaused(false);
        return;
      }
      if (!s.speaking && !s.pending) {
        speakIntentRef.current = false;
        setSpeaking(false);
        setPaused(false);
      }
    }, 200);
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
    pauseIntentRef.current = false;
    speakIntentRef.current = false;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setCurrentText("");
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: SpeechLang = "en"): boolean => {
      if (!supported || !text) return false;
      const synth = window.speechSynthesis;
      const bcp = toBcp47(lang);
      const voice = pickVoice(bcp);
      lastTextRef.current = text;
      lastLangRef.current = lang;

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
        pauseIntentRef.current = false;
        speakIntentRef.current = true;
        setCurrentText("");
        chunks.forEach((chunk, i) => {
          const u = new SpeechSynthesisUtterance(chunk);
          u.lang = bcp;
          if (voice) u.voice = voice;
          u.rate = rateRef.current;
          u.pitch = 1;
          u.onstart = () => {
            if (!pauseIntentRef.current) {
              setCurrentText(chunk);
              setSpeaking(true);
              setPaused(false);
            }
          };
          if (i === chunks.length - 1) {
            u.onend = () => {
              speakIntentRef.current = false;
              pauseIntentRef.current = false;
              setSpeaking(false);
              setPaused(false);
              setCurrentText("");
            };
          }
          u.onerror = () => {
            speakIntentRef.current = false;
            pauseIntentRef.current = false;
            setSpeaking(false);
            setPaused(false);
            setCurrentText("");
          };
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
    pauseIntentRef.current = true;
    window.speechSynthesis.pause();
    setSpeaking(false);
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    pauseIntentRef.current = false;
    // Chrome sometimes needs resume() called twice after a chunk boundary.
    window.speechSynthesis.resume();
    window.setTimeout(() => {
      if (!pauseIntentRef.current) window.speechSynthesis.resume();
    }, 50);
    setPaused(false);
    setSpeaking(true);
  }, [supported]);

  // Stop on unmount
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, paused, currentText, voices, speak, pause, resume, stop, isLangFallback };
  const setRate = useCallback((r: number) => {
    setRateState(r);
    rateRef.current = r;
    // If currently speaking, restart the current text at the new rate.
    if (supported && speakIntentRef.current && lastTextRef.current) {
      const text = lastTextRef.current;
      const lang = lastLangRef.current;
      window.speechSynthesis.cancel();
      window.setTimeout(() => {
        // Inline mini-speak using latest rate via ref; reuse `speak` closure.
        speakRef.current?.(text, lang);
      }, 120);
    }
  }, [supported]);

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  return { supported, speaking, paused, currentText, voices, rate, setRate, speak, pause, resume, stop, isLangFallback };
}
