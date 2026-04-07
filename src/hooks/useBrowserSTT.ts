import { useState, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseBrowserSTTOptions {
  onComplete?: (fullText: string) => void;
  language?: string;
}

export function useBrowserSTT({ onComplete, language = "en-US" }: UseBrowserSTTOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const processedIndexRef = useRef(0);
  const accumulatedRef = useRef("");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startRecording = useCallback(() => {
    if (!isSupported || isRecording) return;

    processedIndexRef.current = 0;
    accumulatedRef.current = "";
    setPartialText("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = processedIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const chunk = result[0].transcript.trim();
          if (chunk) {
            accumulatedRef.current += (accumulatedRef.current ? " " : "") + chunk;
          }
          processedIndexRef.current = i + 1;
        } else {
          interim += result[0].transcript;
        }
      }

      setPartialText(accumulatedRef.current + (interim ? " " + interim : ""));
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const fullText = accumulatedRef.current.trim();
      if (fullText) {
        onCompleteRef.current?.(fullText);
      }
      setPartialText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isSupported, isRecording, language]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    isSupported,
    partialText,
  };
}
