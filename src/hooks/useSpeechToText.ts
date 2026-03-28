import { useState, useCallback, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseSpeechToTextOptions {
  onTranscript?: (text: string) => void;
  onPartial?: (text: string) => void;
}

export function useSpeechToText({ onTranscript, onPartial }: UseSpeechToTextOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialText, setPartialText] = useState("");
  const fullTranscriptRef = useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (data) => {
      setPartialText(data.text);
      onPartial?.(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + data.text.trim();
        onTranscript?.(fullTranscriptRef.current);
      }
      setPartialText("");
    },
  });

  const startRecording = useCallback(async () => {
    if (isConnecting || isRecording) return;
    setIsConnecting(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to use speech-to-text");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          toast.error("Speech-to-text requires Pro or Elite tier");
        } else {
          toast.error(error.error || "Failed to start recording");
        }
        return;
      }

      const data = await response.json();
      if (!data?.token) {
        throw new Error("No token received");
      }

      fullTranscriptRef.current = "";
      setPartialText("");

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsRecording(true);
    } catch (error) {
      console.error("STT error:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please enable microphone permissions.");
      } else {
        toast.error("Failed to start recording");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isRecording, scribe]);

  const stopRecording = useCallback(() => {
    scribe.disconnect();
    setIsRecording(false);
    setPartialText("");
  }, [scribe]);

  const getTranscript = useCallback(() => {
    const final = fullTranscriptRef.current;
    const pending = partialText.trim();
    return pending ? (final ? final + " " + pending : pending) : final;
  }, [partialText]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    isConnecting,
    partialText,
    getTranscript,
  };
}
