import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseSpeechToTextOptions {
  onTranscript?: (text: string) => void;
  onPartial?: (text: string) => void;
}

/**
 * Speech-to-text via Lovable AI Gateway (openai/gpt-4o-transcribe).
 * Records PCM with the Web Audio API and uploads a self-contained WAV
 * to the `voice-transcribe` edge function on stop.
 * Transcription is returned once after stop (no partial streaming).
 */
export function useSpeechToText({ onTranscript, onPartial: _onPartial }: UseSpeechToTextOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialText] = useState(""); // kept for API compatibility

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const fullTranscriptRef = useRef("");

  const cleanup = useCallback(() => {
    try { processorRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    pcmChunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    if (isConnecting || isRecording) return;
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;

      const AudioCtx: typeof AudioContext =
        (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      fullTranscriptRef.current = "";
      setIsRecording(true);
    } catch (error) {
      console.error("STT start error:", error);
      cleanup();
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please enable microphone permissions.");
      } else {
        toast.error("Failed to start recording");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isRecording, cleanup]);

  const encodeWav = (chunks: Float32Array[], sampleRate: number): Blob => {
    // Downsample to 16 kHz mono 16-bit PCM for smaller uploads
    const totalIn = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(totalIn);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }

    const targetRate = 16000;
    const ratio = sampleRate / targetRate;
    const outLen = Math.floor(merged.length / ratio);
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const s = merged[Math.floor(i * ratio)] || 0;
      const clamped = Math.max(-1, Math.min(1, s));
      out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    const bytesPerSample = 2;
    const dataSize = out.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);      // PCM
    view.setUint16(22, 1, true);      // mono
    view.setUint32(24, targetRate, true);
    view.setUint32(28, targetRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);
    let p = 44;
    for (let i = 0; i < out.length; i++, p += 2) view.setInt16(p, out[i], true);
    return new Blob([buffer], { type: "audio/wav" });
  };

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    const chunks = pcmChunksRef.current;
    const sampleRate = audioCtxRef.current?.sampleRate ?? 48000;
    setIsRecording(false);
    cleanup();

    if (chunks.length === 0) return;
    const wav = encodeWav(chunks, sampleRate);
    if (wav.size < 2048) {
      toast.error("That recording was too short — please try again.");
      return;
    }

    setIsTranscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to use speech-to-text");
        return;
      }
      const fd = new FormData();
      fd.append("file", wav, "recording.wav");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-transcribe`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Transcription failed");
        return;
      }
      const { text } = await res.json();
      const clean = (text || "").trim();
      if (clean) {
        fullTranscriptRef.current = clean;
        onTranscript?.(clean);
      }
    } catch (error) {
      console.error("STT stop error:", error);
      toast.error("Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, cleanup, onTranscript]);

  const getTranscript = useCallback(() => fullTranscriptRef.current, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    isConnecting: isConnecting || isTranscribing,
    partialText,
    getTranscript,
  };
}
