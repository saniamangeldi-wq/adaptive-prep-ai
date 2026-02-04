import { useState, useCallback } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
}

export function VoiceChat({ onTranscript, isDisabled, className }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setLastTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        onTranscript(data.text.trim());
        setLastTranscript("");
      }
    },
  });

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to use voice chat");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`,
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
          toast.error("Voice chat is only available for Elite tier subscribers");
        } else {
          toast.error(error.error || "Failed to start voice chat");
        }
        return;
      }

      const data = await response.json();

      if (!data?.token) {
        throw new Error("No token received");
      }

      // Start the transcription session
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      toast.success("Voice chat started - speak now!");
    } catch (error) {
      console.error("Failed to start voice chat:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please enable microphone permissions.");
      } else {
        toast.error("Failed to start voice chat");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [scribe]);

  const stopRecording = useCallback(() => {
    scribe.disconnect();
    setLastTranscript("");
    toast.info("Voice chat ended");
  }, [scribe]);

  const isRecording = scribe.isConnected;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Live transcript indicator */}
      {lastTranscript && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 max-w-[200px]">
          <Volume2 className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground truncate">
            {lastTranscript}
          </span>
        </div>
      )}

      {/* Voice button */}
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        className={cn(
          "relative w-12 h-12 rounded-xl transition-all",
          isRecording && "animate-pulse ring-2 ring-destructive ring-offset-2 ring-offset-background"
        )}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled || isConnecting}
        title={isRecording ? "Stop recording" : "Start voice chat (Elite tier)"}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <Crown className="w-3 h-3 absolute -top-1 -right-1 text-warning" />
          </>
        )}
      </Button>
    </div>
  );
}
