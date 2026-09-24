import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set(["quiz_rendered", "hint_requested", "quiz_submitted", "explanation_opened", "question_skipped", "try_again_started"]);
const clip = (v: unknown, n = 4000) => (typeof v === "string" ? v.slice(0, n) : v == null ? null : String(v).slice(0, n));
const norm = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]+$/, "");

function numericEqual(a: string, b: string): boolean {
  const toNum = (s: string) => {
    const t = s.replace(/[,\s$%]/g, "");
    if (/^-?\d+\/\d+$/.test(t)) { const [n, d] = t.split("/").map(Number); return d ? n / d : NaN; }
    return Number(t);
  };
  const x = toNum(a), y = toNum(b);
  return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-6;
}

type Attempt = Record<string, any>;

function summarize(attempts: Attempt[]) {
  const first = attempts.filter((a) => a.attempt_number === 1);
  const submitted = first.filter((a) => a.status === "submitted");
  const correct = submitted.filter((a) => a.is_correct === true).length;
  const eventual = new Set(attempts.filter((a) => a.is_correct === true).map((a) => a.question_id)).size;
  const times = submitted.map((a) => a.response_time_seconds).filter((t) => typeof t === "number");
  return {
    answered: submitted.length,
    correct_first_attempt: correct,
    incorrect_first_attempt: submitted.length - correct,
    eventual_correct: eventual,
    skipped: first.filter((a) => a.status === "skipped").length,
    unanswered: first.filter((a) => a.status === "unanswered").length,
    accuracy_percentage: submitted.length ? Math.round((correct / submitted.length) * 1000) / 10 : 0,
    eventual_accuracy_percentage: submitted.length ? Math.round((eventual / submitted.length) * 1000) / 10 : 0,
    hints_used: first.filter((a) => a.hint_used).length,
    explanations_opened: first.filter((a) => a.explanation_opened).length,
    average_response_time_seconds: times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null,
    last_practiced: attempts.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null),
  };
}

function groupBy(attempts: Attempt[], key: string) {
  const map = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const k = (a[key] || "General") as string;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(a);
  }
  return map;
}

function sessionReport(session: any, attempts: Attempt[]) {
  const s = summarize(attempts);
  const subs = [...groupBy(attempts.filter((a) => a.status === "submitted"), "subtopic").entries()].map(([subtopic, list]) => ({
    subtopic,
    ...summarize(list),
  }));
  const ranked = [...subs].sort((a, b) => b.accuracy_percentage - a.accuracy_percentage);
  const strongest = ranked[0]?.subtopic ?? null;
  const weakest = ranked.length > 1 ? ranked[ranked.length - 1].subtopic : null;
  return {
    session_id: session.id,
    topic: session.topic,
    subject: session.subject,
    total_questions: session.total_questions,
    first_attempt_score: s.correct_first_attempt,
    first_attempt_accuracy: s.accuracy_percentage,
    eventual_score: s.eventual_correct,
    ...s,
    strongest_subskill: strongest,
    weakest_subskill: weakest,
    recommended_review: subs.filter((x) => x.accuracy_percentage < 70).map((x) => x.subtopic),
    subtopic_progress: subs.map((x) => ({
      subtopic: x.subtopic,
      answered: x.answered,
      correct_first_attempt: x.correct_first_attempt,
      accuracy_percentage: x.accuracy_percentage,
    })),
  };
}

async function gradeFreeWrite(question: any, text: string): Promise<{ score: number; is_correct: boolean; evaluation: string }> {
  if (question.correct_answer && (numericEqual(text, question.correct_answer) || norm(text) === norm(question.correct_answer))) {
    return { score: 100, is_correct: true, evaluation: "Matches the expected answer." };
  }
  if (question.correct_answer && /^[-\d.,/\s$%]+$/.test(question.correct_answer)) {
    return { score: 0, is_correct: false, evaluation: `Expected ${question.correct_answer}.` };
  }
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { score: 0, is_correct: false, evaluation: "Could not evaluate automatically." };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: 'You grade short student answers. Reply ONLY with JSON: {"score":0-100,"evaluation":"one or two sentences"}.' },
          {
            role: "user",
            content: `Question: ${question.question_text}\nCriteria: ${JSON.stringify(question.evaluation_criteria || [])}\nStudent answer: ${text}`,
          },
        ],
      }),
    });
    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content || "");
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : {};
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    return { score, is_correct: score >= 70, evaluation: clip(parsed.evaluation, 600) as string || "" };
  } catch (e) {
    console.error("free write grading failed", e);
    return { score: 0, is_correct: false, evaluation: "Could not evaluate automatically." };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const uid = user.id;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const action = body?.action as string;

    const logEvent = (event_type: string, session_id: string | null, question_id: string | null, payload: Record<string, unknown>) =>
      db.from("quiz_events").insert({ user_id: uid, session_id, question_id, event_type, payload });

    const sessionAttempts = async (session_id: string) => {
      const { data } = await db.from("quiz_attempts").select("*").eq("user_id", uid).eq("session_id", session_id);
      return data || [];
    };

    const sessionState = async (session: any) => {
      const [{ data: qs }, attempts] = await Promise.all([
        db.from("quiz_questions").select("question_id, sequence_number").eq("session_id", session.id).order("sequence_number"),
        sessionAttempts(session.id),
      ]);
      const done = new Set(attempts.map((a: Attempt) => a.question_id));
      const firstOpen = (qs || []).find((q: any) => !done.has(q.question_id));
      return {
        session,
        registered: (qs || []).length,
        completed: done.size,
        current_sequence: firstOpen?.sequence_number ?? Math.min((qs || []).length + 1, session.total_questions),
        progress: summarize(attempts),
        is_complete: done.size >= session.total_questions,
      };
    };

    const endSession = async (session: any) => {
      const { data: qs } = await db.from("quiz_questions").select("*").eq("session_id", session.id);
      const attempts = await sessionAttempts(session.id);
      const done = new Set(attempts.map((a: Attempt) => a.question_id));
      const hints = await db.from("quiz_events").select("question_id").eq("session_id", session.id).eq("event_type", "hint_requested");
      const hinted = new Set((hints.data || []).map((h: any) => h.question_id));
      const rows = (qs || []).filter((q: any) => !done.has(q.question_id)).map((q: any) => ({
        user_id: uid, session_id: session.id, question_id: q.question_id, subject: q.subject, topic: q.topic, subtopic: q.subtopic,
        sequence_number: q.sequence_number, total_questions: q.total_questions, question_text: q.question_text, input_type: q.input_type,
        options: q.options, status: "unanswered", is_correct: null, attempt_number: 1, hint_used: hinted.has(q.question_id),
      }));
      if (rows.length) await db.from("quiz_attempts").upsert(rows, { onConflict: "user_id,session_id,question_id,attempt_number", ignoreDuplicates: true });
      await db.from("quiz_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
      return sessionReport(session, await sessionAttempts(session.id));
    };

    switch (action) {
      case "register": {
        const q = body.question || {};
        const question_id = String(q.question_id || "");
        if (!UUID_RE.test(question_id)) return json({ error: "Invalid question_id" }, 400);
        const conversation_id = UUID_RE.test(body.conversation_id || "") ? body.conversation_id : null;

        // Already registered? Return saved state (session recovery — never re-count).
        const { data: existing } = await db.from("quiz_questions").select("*").eq("question_id", question_id).maybeSingle();
        if (existing && existing.user_id !== uid) return json({ error: "Forbidden" }, 403);

        let question = existing;
        if (!question) {
          const incomingTopic = clip(q.topic, 200) as string | null;
          let { data: session } = await db.from("quiz_sessions").select("*").eq("user_id", uid).eq("status", "active")
            .eq("conversation_id", conversation_id).order("started_at", { ascending: false }).limit(1).maybeSingle();
          if (session) {
            const st = await sessionState(session);
            const topicChanged = incomingTopic && incomingTopic !== "General" && session.topic !== "General" && norm(incomingTopic) !== norm(session.topic);
            if (st.registered >= session.total_questions || topicChanged) {
              await endSession(session);
              session = null;
            } else if (session.topic === "General" && incomingTopic && incomingTopic !== "General") {
              await db.from("quiz_sessions").update({ topic: incomingTopic }).eq("id", session.id);
              session.topic = incomingTopic;
            }
          }
          if (!session) {
            const { data: created, error } = await db.from("quiz_sessions").insert({
              user_id: uid, conversation_id, subject: clip(q.subject, 100) || "SAT", topic: incomingTopic || "General", total_questions: 10,
            }).select("*").single();
            if (error) throw error;
            session = created;
          }
          const { count } = await db.from("quiz_questions").select("question_id", { count: "exact", head: true }).eq("session_id", session.id);
          const options = Array.isArray(q.options) ? q.options.slice(0, 8).map((o: any) => ({ id: clip(o?.id, 10), text: clip(o?.text, 1000) })) : null;
          const row = {
            question_id, user_id: uid, session_id: session.id,
            subject: session.subject, topic: session.topic, subtopic: clip(q.subtopic, 200) || session.topic,
            sequence_number: (count || 0) + 1, total_questions: session.total_questions,
            question_text: clip(q.question_text, 4000) || "", input_type: clip(q.input_type, 30) || "radio",
            options, correct_answer: clip(q.correct_answer, 500), explanation: clip(q.explanation, 4000),
            evaluation_criteria: Array.isArray(q.evaluation_criteria) ? q.evaluation_criteria.slice(0, 6) : null,
          };
          const { error: insErr } = await db.from("quiz_questions").insert(row);
          if (insErr && !String(insErr.message).includes("duplicate")) throw insErr;
          const { data: saved } = await db.from("quiz_questions").select("*").eq("question_id", question_id).single();
          question = saved;
          await logEvent("quiz_rendered", session.id, question_id, { sequence_number: question.sequence_number, topic: question.topic });
        }

        const { data: session } = await db.from("quiz_sessions").select("*").eq("id", question.session_id).single();
        const { data: attempt } = await db.from("quiz_attempts").select("*").eq("user_id", uid).eq("question_id", question_id).eq("attempt_number", 1).maybeSingle();
        const { count: hintCount } = await db.from("quiz_events").select("id", { count: "exact", head: true }).eq("question_id", question_id).eq("event_type", "hint_requested");
        return json({
          question_id, session_id: question.session_id, sequence_number: question.sequence_number, total_questions: question.total_questions,
          subject: question.subject, topic: question.topic, subtopic: question.subtopic, rendered_at: question.rendered_at,
          hint_used: (hintCount || 0) > 0,
          attempt: attempt ? { ...attempt, explanation: question.explanation } : null,
          state: await sessionState(session),
        });
      }

      case "submit":
      case "skip": {
        const question_id = String(body.question_id || "");
        if (!UUID_RE.test(question_id)) return json({ error: "Invalid question_id" }, 400);
        const { data: q } = await db.from("quiz_questions").select("*").eq("question_id", question_id).maybeSingle();
        if (!q || q.user_id !== uid) return json({ error: "Question not found" }, 404);

        const { data: prior } = await db.from("quiz_attempts").select("*").eq("user_id", uid).eq("question_id", question_id).eq("attempt_number", 1).maybeSingle();
        const { data: session } = await db.from("quiz_sessions").select("*").eq("id", q.session_id).single();
        if (prior) {
          return json({ duplicate: true, attempt: { ...prior, explanation: q.explanation }, state: await sessionState(session) });
        }

        const { count: hintCount } = await db.from("quiz_events").select("id", { count: "exact", head: true }).eq("question_id", question_id).eq("event_type", "hint_requested");
        const hint_used = !!body.hint_used || (hintCount || 0) > 0;
        const elapsed = Math.round((Date.now() - new Date(q.rendered_at).getTime()) / 1000);
        const rt = Number.isFinite(Number(body.response_time_seconds)) ? Math.max(0, Math.min(Number(body.response_time_seconds), 7200)) : Math.min(elapsed, 7200);

        let selected: string | null = null, is_correct: boolean | null = null, score: number | null = null, evaluation: string | null = null;
        if (action === "submit") {
          selected = clip(body.selected_answer, 6000) as string;
          if (!selected || !selected.trim()) return json({ error: "Answer required" }, 400);
          if (q.input_type === "free_write") {
            const g = await gradeFreeWrite(q, selected);
            is_correct = g.is_correct; score = g.score; evaluation = g.evaluation;
          } else if (q.input_type === "radio") {
            is_correct = !!q.correct_answer && norm(selected) === norm(q.correct_answer);
            score = is_correct ? 100 : 0;
          } else {
            is_correct = !!q.correct_answer && (norm(selected) === norm(q.correct_answer) || numericEqual(selected, q.correct_answer));
            score = is_correct ? 100 : 0;
          }
        }

        const row = {
          user_id: uid, session_id: q.session_id, question_id, subject: q.subject, topic: q.topic, subtopic: q.subtopic,
          sequence_number: q.sequence_number, total_questions: q.total_questions, question_text: q.question_text,
          input_type: q.input_type, options: q.options, selected_answer: selected, correct_answer: q.correct_answer,
          is_correct, status: action === "submit" ? "submitted" : "skipped", score, evaluation, hint_used,
          attempt_number: 1, response_time_seconds: Math.round(rt),
        };
        const { error } = await db.from("quiz_attempts").upsert(row, { onConflict: "user_id,session_id,question_id,attempt_number", ignoreDuplicates: true });
        if (error) throw error;
        const { data: saved } = await db.from("quiz_attempts").select("*").eq("user_id", uid).eq("question_id", question_id).eq("attempt_number", 1).single();

        const eventPayload = {
          event_type: action === "submit" ? "quiz_submission" : "question_skipped",
          question_id, session_id: q.session_id, subject: q.subject, topic: q.topic, subtopic: q.subtopic,
          sequence_number: q.sequence_number, total_questions: q.total_questions,
          selected_answer: saved.selected_answer, correct_answer: q.correct_answer, is_correct: saved.is_correct,
          hint_used: saved.hint_used, attempt_number: 1, response_time_seconds: saved.response_time_seconds,
          timestamp: saved.created_at,
        };
        await logEvent(action === "submit" ? "quiz_submitted" : "question_skipped", q.session_id, question_id, eventPayload);

        const state = await sessionState(session);
        let report = null;
        if (state.is_complete && session.status === "active") report = await endSession(session);
        return json({ attempt: { ...saved, explanation: q.explanation }, event: eventPayload, state, report });
      }

      case "event": {
        const question_id = UUID_RE.test(body.question_id || "") ? body.question_id : null;
        const event_type = String(body.event_type || "");
        if (!EVENT_TYPES.has(event_type) || !question_id) return json({ error: "Invalid event" }, 400);
        const { data: q } = await db.from("quiz_questions").select("session_id, user_id").eq("question_id", question_id).maybeSingle();
        if (!q || q.user_id !== uid) return json({ error: "Question not found" }, 404);
        await logEvent(event_type, q.session_id, question_id, { at: new Date().toISOString() });
        if (event_type === "explanation_opened") {
          await db.from("quiz_attempts").update({ explanation_opened: true }).eq("user_id", uid).eq("question_id", question_id);
        }
        return json({ ok: true });
      }

      case "state": {
        const conversation_id = UUID_RE.test(body.conversation_id || "") ? body.conversation_id : null;
        if (!conversation_id) return json({ state: null });
        const { data: session } = await db.from("quiz_sessions").select("*").eq("user_id", uid).eq("conversation_id", conversation_id)
          .order("started_at", { ascending: false }).limit(1).maybeSingle();
        if (!session) return json({ state: null });
        const state = await sessionState(session);
        const report = session.status === "ended" ? sessionReport(session, await sessionAttempts(session.id)) : null;
        return json({ state, report });
      }

      case "end_session": {
        const session_id = String(body.session_id || "");
        const { data: session } = await db.from("quiz_sessions").select("*").eq("id", session_id).eq("user_id", uid).maybeSingle();
        if (!session) return json({ error: "Session not found" }, 404);
        const report = session.status === "active" ? await endSession(session) : sessionReport(session, await sessionAttempts(session.id));
        return json({ report });
      }

      case "context": {
        const conversation_id = UUID_RE.test(body.conversation_id || "") ? body.conversation_id : null;
        const { data: latestEv } = await db.from("quiz_events").select("payload, session_id").eq("user_id", uid)
          .in("event_type", ["quiz_submitted", "question_skipped"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
        let session: any = null;
        if (conversation_id) {
          const r = await db.from("quiz_sessions").select("*").eq("user_id", uid).eq("conversation_id", conversation_id)
            .order("started_at", { ascending: false }).limit(1).maybeSingle();
          session = r.data;
        }
        if (!session && latestEv?.session_id) {
          session = (await db.from("quiz_sessions").select("*").eq("id", latestEv.session_id).maybeSingle()).data;
        }
        if (!session && !latestEv) return json({ context: null });

        let current_topic_progress = null, subtopic_progress: unknown[] = [], current_set = null;
        if (session) {
          const { data: topicAttempts } = await db.from("quiz_attempts").select("*").eq("user_id", uid).eq("topic", session.topic);
          const s = summarize(topicAttempts || []);
          current_topic_progress = { topic: session.topic, subject: session.subject, ...s };
          subtopic_progress = [...groupBy((topicAttempts || []).filter((a: Attempt) => a.status === "submitted"), "subtopic").entries()].map(([subtopic, list]) => {
            const x = summarize(list);
            return { subtopic, answered: x.answered, correct_first_attempt: x.correct_first_attempt, accuracy_percentage: x.accuracy_percentage };
          });
          const st = await sessionState(session);
          current_set = {
            session_id: session.id, status: session.status, topic: session.topic,
            question_number: st.current_sequence, total_questions: session.total_questions,
            completed: st.completed, correct_so_far: st.progress.correct_first_attempt, skipped: st.progress.skipped,
          };
        }
        const p = latestEv?.payload as any;
        return json({
          context: {
            latest_quiz_event: p ? {
              event_type: p.event_type, question_id: p.question_id, topic: p.topic, subtopic: p.subtopic,
              sequence_number: p.sequence_number, total_questions: p.total_questions,
              selected_answer: p.selected_answer, correct_answer: p.correct_answer, is_correct: p.is_correct,
              hint_used: p.hint_used, attempt_number: p.attempt_number, response_time_seconds: p.response_time_seconds, timestamp: p.timestamp,
            } : null,
            current_set,
            current_topic_progress,
            subtopic_progress,
          },
        });
      }

      case "dashboard": {
        const { data: all } = await db.from("quiz_attempts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5000);
        const attempts = all || [];
        const subjects = [...groupBy(attempts, "subject").entries()].map(([subject, sList]) => ({
          subject, ...summarize(sList),
          topics: [...groupBy(sList, "topic").entries()].map(([topic, tList]) => ({
            topic, ...summarize(tList),
            subtopics: [...groupBy(tList, "subtopic").entries()].map(([subtopic, stList]) => ({ subtopic, ...summarize(stList) })),
          })),
        }));
        const topics = subjects.flatMap((s) => s.topics.map((t) => ({ subject: s.subject, topic: t.topic, accuracy: t.accuracy_percentage, answered: t.answered })))
          .filter((t) => t.answered > 0);
        const incorrect = attempts.filter((a) => a.attempt_number === 1 && a.status === "submitted" && a.is_correct === false).slice(0, 20)
          .map((a) => ({ question_id: a.question_id, topic: a.topic, subtopic: a.subtopic, question_text: a.question_text, selected_answer: a.selected_answer, correct_answer: a.correct_answer }));
        return json({
          overall: summarize(attempts),
          subjects,
          weakest: [...topics].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
          strongest: [...topics].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5),
          incorrect,
        });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("quiz-tracker error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
