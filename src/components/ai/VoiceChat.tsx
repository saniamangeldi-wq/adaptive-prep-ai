import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Crown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (text: string) => void;
  isDisabled?: boolean;
  className?: string;
  fullMode?: boolean;
}

export function VoiceChat({ onTranscript, isDisabled, className, fullMode = false }: VoiceChatProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      toast.success("Voice chat connected - speak now!");
    },
    onDisconnect: () => {
      toast.info("Voice chat ended");
    },
    onMessage: (message: any) => {
      // Handle transcript events
      if (message?.type === "user_transcript") {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          setTranscript(prev => [...prev, { role: "user", text: userText }]);
          onTranscript?.(userText);
        }
      } else if (message?.type === "agent_response") {
        const agentText = message?.agent_response_event?.agent_response;
        if (agentText) {
          setTranscript(prev => [...prev, { role: "assistant", text: agentText }]);
        }
      }
    },
    onError: (error) => {
      console.error("Voice chat error:", error);
      toast.error("Voice chat error occurred");
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

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
      if (!data?.token) throw new Error("No token received");

      setTranscript([]);

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
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
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(() => {
    const newVolume = isMuted ? 1 : 0;
    conversation.setVolume({ volume: newVolume });
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  // Compact button mode (used in chat input area)
  if (!fullMode) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant={isConnected ? "destructive" : "outline"}
          size="icon"
          className={cn(
            "relative w-12 h-12 rounded-xl transition-all",
            isConnected && "animate-pulse ring-2 ring-destructive ring-offset-2 ring-offset-background"
          )}
          onClick={isConnected ? stopConversation : startConversation}
          disabled={isDisabled || isConnecting}
          title={isConnected ? "Stop voice chat" : "Start voice chat (Elite tier)"}
        >
          {isConnecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isConnected ? (
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

  // Full voice chat panel mode
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Voice chat area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {!isConnected ? (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Mic className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Voice Study Coach</h2>
              <p className="text-muted-foreground max-w-sm">
                Have a natural conversation with your AI tutor. Just speak and listen!
              </p>
            </div>
            <Button
              variant="hero"
              size="lg"
              onClick={startConversation}
              disabled={isDisabled || isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              {isConnecting ? "Connecting..." : "Start Voice Chat"}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-6 w-full max-w-lg">
            {/* Pulsing animation when AI is speaking */}
            <div className="relative w-32 h-32 mx-auto">
              <div className={cn(
                "absolute inset-0 rounded-full bg-primary/20 transition-transform duration-300",
                isSpeaking && "animate-ping"
              )} />
              <div className={cn(
                "absolute inset-2 rounded-full bg-primary/30 transition-transform duration-500",
                isSpeaking && "scale-110"
              )} />
              <div className="absolute inset-4 rounded-full bg-primary/40 flex items-center justify-center">
                <Volume2 className={cn(
                  "w-12 h-12 text-primary transition-opacity",
                  isSpeaking ? "opacity-100" : "opacity-50"
                )} />
              </div>
            </div>

            <p className="text-lg font-medium text-foreground">
              {isSpeaking ? "AI is speaking..." : "Listening..."}
            </p>
            <p className="text-sm text-muted-foreground">
              Speak naturally. Your AI coach will respond in real-time.
            </p>

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto space-y-2 text-left p-4 rounded-xl bg-card/50 border border-border/50">
                {transcript.slice(-6).map((msg, i) => (
                  <div key={i} className={cn(
                    "text-sm p-2 rounded-lg",
                    msg.role === "user" 
                      ? "bg-primary/10 text-foreground ml-8" 
                      : "bg-muted text-foreground mr-8"
                  )}>
                    <span className="text-xs text-muted-foreground">
                      {msg.role === "user" ? "You" : "Coach"}:
                    </span>{" "}
                    {msg.text}
                  </div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                className="gap-2"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? "Unmute AI" : "Mute AI"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopConversation}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                End Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
