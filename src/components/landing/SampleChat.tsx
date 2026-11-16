import { ArrowUp } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { SAMPLE } from "./sample";

function Emphasis({ text }: { text: string }) {
  // The sample answer uses *word* for emphasis, as the coach's markdown does.
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

/** A static copy of the chat screen discussing the sample report. Labelled as a sample. */
export function SampleChat() {
  return (
    <figure className="rounded-2xl border border-border bg-card shadow-float">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sample chat</span>
        <span className="text-xs text-muted-foreground">Discussing the sample report</span>
      </figcaption>
      <div className="space-y-5 px-4 py-5 sm:px-5">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-6 text-secondary-foreground">
            {SAMPLE.chat.question}
          </p>
        </div>
        <div className="flex gap-3">
          <LogoMark className="hidden h-7 w-7 sm:block mt-0.5" />
          <div className="chat-prose min-w-0 flex-1 text-[15px]">
            {SAMPLE.chat.answer.map((p, i) => (
              <p key={i}>
                <Emphasis text={p} />
              </p>
            ))}
            <blockquote>{SAMPLE.chat.example}</blockquote>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 sm:px-5" aria-hidden="true">
        <div className="flex items-center justify-between rounded-2xl border border-input bg-background px-4 py-2.5">
          <span className="text-[15px] text-muted-foreground">Reply to the coach…</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ArrowUp className="h-4 w-4" />
          </span>
        </div>
      </div>
    </figure>
  );
}
