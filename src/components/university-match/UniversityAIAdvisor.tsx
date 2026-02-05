 import { useState, useRef, useEffect } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { useToast } from "@/hooks/use-toast";
 import { 
   Bot, 
   Send, 
   Loader2, 
   Sparkles,
   Calendar,
   Target,
  GraduationCap,
  Coins
 } from "lucide-react";
 import ReactMarkdown from "react-markdown";
 
 interface Message {
   role: "user" | "assistant";
   content: string;
 }
 
 interface UniversityAIAdvisorProps {
   topUniversities: Array<{
     name: string;
     country: string;
     match_score: number;
   }>;
 }
 
 const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/university-advisor`;
 
 export function UniversityAIAdvisor({ topUniversities }: UniversityAIAdvisorProps) {
  const { user, profile, refreshProfile } = useAuth();
   const { toast } = useToast();
   const [messages, setMessages] = useState<Message[]>([]);
   const [input, setInput] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [targetUniversity, setTargetUniversity] = useState<string | null>(null);
   const scrollRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     // Initial greeting
     if (messages.length === 0 && topUniversities.length > 0) {
       const greeting = `Hi! 👋 I'm your University Advisor AI. I've analyzed your profile and see you have ${topUniversities.length} great university matches!\n\n**Your top matches:**\n${topUniversities.slice(0, 5).map((u, i) => `${i + 1}. **${u.name}** (${u.country}) - ${Math.round(u.match_score)}% match`).join("\n")}\n\nWhich university would you like to focus on? I'll create a personalized **12-month action plan** to maximize your chances of getting accepted! 🎯`;
       
       setMessages([{ role: "assistant", content: greeting }]);
     }
   }, [topUniversities]);
 
   useEffect(() => {
     if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
   }, [messages]);
 
   async function streamChat(userMessage: string) {
     if (!user) return;
 
     const userMsg: Message = { role: "user", content: userMessage };
     setMessages(prev => [...prev, userMsg]);
     setIsLoading(true);
 
     // Check if user mentioned a university
     const mentionedUniversity = topUniversities.find(u => 
       userMessage.toLowerCase().includes(u.name.toLowerCase())
     );
     
     const currentTarget = mentionedUniversity?.name || targetUniversity;
     if (mentionedUniversity && !targetUniversity) {
       setTargetUniversity(mentionedUniversity.name);
     }
 
     let assistantContent = "";
 
     const updateAssistant = (chunk: string) => {
       assistantContent += chunk;
       setMessages(prev => {
         const last = prev[prev.length - 1];
         if (last?.role === "assistant") {
           return prev.map((m, i) => 
             i === prev.length - 1 ? { ...m, content: assistantContent } : m
           );
         }
         return [...prev, { role: "assistant", content: assistantContent }];
       });
     };
 
     try {
       const resp = await fetch(CHAT_URL, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
         },
         body: JSON.stringify({
           student_id: user.id,
           target_university: currentTarget,
           messages: [...messages, userMsg].map(m => ({
             role: m.role,
             content: m.content
           }))
         }),
       });
 
       if (resp.status === 402) {
         const errorData = await resp.json();
         toast({
           title: "Not enough credits",
           description: errorData.error || "You need more credits to use the University Advisor.",
           variant: "destructive"
         });
         refreshProfile();
         return;
       }

       if (!resp.ok) {
         const errorData = await resp.json();
         throw new Error(errorData.error || "Failed to get response");
       }
 
       if (!resp.body) throw new Error("No response body");
 
       const reader = resp.body.getReader();
       const decoder = new TextDecoder();
       let textBuffer = "";
 
       while (true) {
         const { done, value } = await reader.read();
         if (done) break;
 
         textBuffer += decoder.decode(value, { stream: true });
 
         let newlineIndex: number;
         while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
           let line = textBuffer.slice(0, newlineIndex);
           textBuffer = textBuffer.slice(newlineIndex + 1);
 
           if (line.endsWith("\r")) line = line.slice(0, -1);
           if (line.startsWith(":") || line.trim() === "") continue;
           if (!line.startsWith("data: ")) continue;
 
           const jsonStr = line.slice(6).trim();
           if (jsonStr === "[DONE]") break;
 
           try {
             const parsed = JSON.parse(jsonStr);
             const content = parsed.choices?.[0]?.delta?.content as string | undefined;
             if (content) updateAssistant(content);
           } catch {
             textBuffer = line + "\n" + textBuffer;
             break;
           }
         }
       }
     } catch (error: any) {
       console.error("Chat error:", error);
       toast({
         title: "Error",
         description: error.message || "Failed to get AI response",
         variant: "destructive"
       });
     } finally {
       setIsLoading(false);
      refreshProfile(); // Refresh to update credit count
     }
   }
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!input.trim() || isLoading) return;
     
     const message = input.trim();
     setInput("");
     streamChat(message);
   };
 
   const quickActions = [
     { label: "Create 12-month plan", icon: Calendar, prompt: "Create a detailed 12-month action plan for getting into my target university" },
     { label: "SAT prep timeline", icon: Target, prompt: "What's the best SAT preparation timeline for me?" },
     { label: "Essay strategy", icon: GraduationCap, prompt: "Help me with my college essay strategy" },
   ];
 
   return (
     <div className="bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-xl border border-primary/20 overflow-hidden">
       <div className="p-4 border-b border-border bg-card/50">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
             <Sparkles className="w-5 h-5 text-primary" />
           </div>
           <div>
             <h3 className="font-semibold text-foreground flex items-center gap-2">
               University AI Advisor
               <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Beta</span>
             </h3>
             <p className="text-sm text-muted-foreground">
               {targetUniversity 
                 ? `Planning for ${targetUniversity}` 
                 : "Your personal admissions strategist"}
             </p>
           </div>
          {profile && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <Coins className="w-4 h-4" />
              <span>{profile.credits_remaining}</span>
              <span className="text-xs">(2/msg)</span>
            </div>
          )}
         </div>
       </div>
 
       <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
         <div className="space-y-4">
           {messages.map((message, index) => (
             <div
               key={index}
               className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
             >
               <div
                 className={`max-w-[85%] rounded-xl px-4 py-3 ${
                   message.role === "user"
                     ? "bg-primary text-primary-foreground"
                     : "bg-muted"
                 }`}
               >
                 {message.role === "assistant" ? (
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                     <ReactMarkdown>{message.content}</ReactMarkdown>
                   </div>
                 ) : (
                   <p className="text-sm">{message.content}</p>
                 )}
               </div>
             </div>
           ))}
 
           {isLoading && messages[messages.length - 1]?.role === "user" && (
             <div className="flex justify-start">
               <div className="bg-muted rounded-xl px-4 py-3">
                 <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
               </div>
             </div>
           )}
         </div>
       </ScrollArea>
 
       {/* Quick Actions */}
       {messages.length <= 2 && targetUniversity && (
         <div className="px-4 pb-2">
           <div className="flex flex-wrap gap-2">
             {quickActions.map((action) => (
               <Button
                 key={action.label}
                 variant="outline"
                 size="sm"
                 onClick={() => streamChat(action.prompt)}
                 disabled={isLoading}
                 className="gap-2 text-xs"
               >
                 <action.icon className="w-3 h-3" />
                 {action.label}
               </Button>
             ))}
           </div>
         </div>
       )}
 
       <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/30">
         <div className="flex gap-2">
           <Textarea
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder={targetUniversity 
               ? "Ask about your admission plan..." 
               : "Which university would you like to target?"}
             className="min-h-[44px] max-h-32 resize-none"
             rows={1}
             onKeyDown={(e) => {
               if (e.key === "Enter" && !e.shiftKey) {
                 e.preventDefault();
                 handleSubmit(e);
               }
             }}
           />
           <Button 
             type="submit" 
             disabled={!input.trim() || isLoading}
             className="px-3"
           >
             {isLoading ? (
               <Loader2 className="w-4 h-4 animate-spin" />
             ) : (
               <Send className="w-4 h-4" />
             )}
           </Button>
         </div>
       </form>
     </div>
   );
 }