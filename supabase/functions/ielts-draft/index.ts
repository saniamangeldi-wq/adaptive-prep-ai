// POST ielts-draft — DraftRequest → DraftResponse | ApiError
//
// Autosave for writing drafts in the existing ielts_sessions table
// (skill = 'writing', task in `content`, script + seconds in `answers`).
// Client-side inserts are blocked for most users by the old has_ielts_access
// policy, so this function writes with the service role. The user comes from
// the JWT, and EVERY query is filtered by that user id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DraftRecord, DraftResponse } from "../_shared/ielts/contract.ts";
import { fail, json, preflight, readJson } from "../_shared/ielts/http.ts";
import { draftColumns, draftFromRow, validateDraftRequest } from "../_shared/ielts/requests.ts";

const LIST_LIMIT = 20;

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "Please sign in.", "unauthorized");
  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return fail(401, "Please sign in.", "unauthorized");
    userId = data.user.id;
  } catch {
    return fail(401, "Please sign in.", "unauthorized");
  }

  const body = await readJson(req, 200_000);
  if (body === null) return fail(400, "Request body must be JSON.", "bad_request");
  const checked = validateDraftRequest(body);
  if (checked.ok === false) return json(checked.error, checked.status);
  const r = checked.value;

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const sessions = () => admin.from("ielts_sessions");

  try {
    switch (r.action) {
      case "save": {
        const cols = draftColumns(r);
        if (r.sessionId) {
          const { data, error } = await sessions()
            .update(cols)
            .eq("id", r.sessionId)
            .eq("user_id", userId)
            .eq("skill", "writing")
            .eq("status", "in_progress")
            .select("id, updated_at")
            .maybeSingle();
          if (error) throw error;
          if (!data) return fail(404, "Draft not found (it may have been submitted or discarded). Save without a sessionId to start a new one.", "not_found");
          const res: DraftResponse = { action: "save", sessionId: data.id, updatedAt: data.updated_at };
          return json(res);
        }
        const { data, error } = await sessions()
          .insert({ ...cols, user_id: userId, status: "in_progress" })
          .select("id, updated_at")
          .single();
        if (error) throw error;
        const res: DraftResponse = { action: "save", sessionId: data.id, updatedAt: data.updated_at };
        return json(res);
      }
      case "get": {
        const { data, error } = await sessions()
          .select("id, content, answers, updated_at, created_at")
          .eq("id", r.sessionId)
          .eq("user_id", userId)
          .eq("skill", "writing")
          .eq("status", "in_progress")
          .maybeSingle();
        if (error) throw error;
        const res: DraftResponse = { action: "get", draft: data ? draftFromRow(data) : null };
        return json(res);
      }
      case "list": {
        const { data, error } = await sessions()
          .select("id, content, answers, updated_at, created_at")
          .eq("user_id", userId)
          .eq("skill", "writing")
          .eq("status", "in_progress")
          .order("updated_at", { ascending: false })
          .limit(LIST_LIMIT * 2);
        if (error) throw error;
        // Old-app writing sessions in a different format are skipped by draftFromRow.
        const drafts = (data ?? []).map(draftFromRow).filter((d: DraftRecord | null): d is DraftRecord => d !== null).slice(0, LIST_LIMIT);
        const res: DraftResponse = { action: "list", drafts };
        return json(res);
      }
      case "discard": {
        const { error } = await sessions()
          .update({ status: "abandoned" })
          .eq("id", r.sessionId)
          .eq("user_id", userId)
          .eq("skill", "writing")
          .eq("status", "in_progress");
        if (error) throw error;
        const res: DraftResponse = { action: "discard", ok: true };
        return json(res);
      }
    }
  } catch (e) {
    console.error("ielts-draft failed", e);
    return fail(500, "Could not access your drafts. Please try again.", "upstream_error");
  }
});
