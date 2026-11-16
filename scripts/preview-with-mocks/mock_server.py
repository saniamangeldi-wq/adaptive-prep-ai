"""
Answers the app's Supabase calls inside the browser (Playwright routing), from the
fixtures that dump-fixtures.ts writes. Nothing here touches the real project.

  auth   /auth/v1/*            a signed-in student (session seeded in localStorage)
  REST   /rest/v1/<table>      profiles, ielts_writing_reports, ai_conversations
  fns    /functions/v1/<name>  ielts-draft, ielts-generate-writing-task,
                               ielts-grade-writing, student-chat

Behaviour is switched per scenario through MockState fields (see run.py).
"""
from __future__ import annotations

import base64
import json
import time
import uuid
from dataclasses import dataclass, field
from urllib.parse import parse_qs, urlparse

PROJECT_REF = "cgoskszhxymcdmiajaai"
USER_ID = "00000000-0000-4000-8000-0000000000aa"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Range",
}


def _b64(obj: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")


def fake_session() -> dict:
    exp = int(time.time()) + 24 * 3600
    token = f"{_b64({'alg': 'HS256', 'typ': 'JWT'})}.{_b64({'sub': USER_ID, 'exp': exp, 'role': 'authenticated', 'email': 'student@example.com'})}.sig"
    user = {
        "id": USER_ID,
        "aud": "authenticated",
        "role": "authenticated",
        "email": "student@example.com",
        "app_metadata": {"provider": "email"},
        "user_metadata": {"full_name": "Test Student"},
        "created_at": "2026-09-01T00:00:00Z",
    }
    return {"access_token": token, "token_type": "bearer", "expires_in": 86400, "expires_at": exp, "refresh_token": "fake-refresh", "user": user}


def init_script(session: dict | None) -> str:
    """Runs before the app: seeds (or clears) the stored Supabase session."""
    key = f"sb-{PROJECT_REF}-auth-token"
    if session is None:
        return f"try {{ localStorage.removeItem({json.dumps(key)}); }} catch (e) {{}}"
    return f"try {{ if (!localStorage.getItem({json.dumps(key)})) localStorage.setItem({json.dumps(key)}, {json.dumps(json.dumps(session))}); }} catch (e) {{}}"


@dataclass
class MockState:
    fx: dict
    reports: list = field(default_factory=list)  # ielts_writing_reports rows
    drafts: dict = field(default_factory=dict)  # sessionId -> DraftRecord
    conversations: list = field(default_factory=list)
    # switches
    draft_offline: bool = False  # ielts-draft calls fail at the network level
    hold_draft_saves: bool = False  # keep save calls pending (shows "Saving…")
    hold_grade: bool = False  # keep the grade call pending (shows the waiting overlay)
    grade_error: tuple | None = None  # (status, code, message)
    grade_report: str = "task2"  # which fixture report a grading returns
    grade_unsaved: bool = False  # return the report with id null
    task_for_variant: dict = field(default_factory=dict)
    chat_reply: str = "Your coherence band is 6.5 because the paragraphs are clear but the linking is mechanical. Try replacing *Firstly* and *Secondly* with a sentence that builds on the previous idea."
    held: list = field(default_factory=list)
    calls: list = field(default_factory=list)

    def profile(self) -> dict:
        return {"id": "p1", "user_id": USER_ID, "email": "student@example.com", "full_name": "Test Student", "avatar_url": None, "preferred_language": "en"}


def _json(route, body, status=200, headers=None):
    route.fulfill(status=status, headers={**CORS, "Content-Type": "application/json", **(headers or {})}, body=json.dumps(body))


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())


def _rest(route, req, state: MockState, table: str):
    method = req.method
    q = parse_qs(urlparse(req.url).query)
    wants_object = "vnd.pgrst.object" in (req.headers.get("accept") or "")

    def reply_rows(rows):
        if wants_object:
            if len(rows) == 1:
                return _json(route, rows[0])
            return _json(route, {"code": "PGRST116", "message": "JSON object requested, multiple (or no) rows returned", "details": "", "hint": None}, 406)
        return _json(route, rows)

    if table == "profiles":
        return reply_rows([state.profile()])

    if table == "ielts_writing_reports":
        rows = list(state.reports)
        for k, v in q.items():
            if k in ("select", "order", "limit", "offset"):
                continue
            val = v[0]
            if val.startswith("eq.") and k != "user_id":
                rows = [r for r in rows if str(r.get(k)) == val[3:]]
        rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        if "limit" in q:
            rows = rows[: int(q["limit"][0])]
        return reply_rows(rows)

    if table == "ai_conversations":
        if method == "POST":
            body = json.loads(req.post_data or "{}")
            row = {"id": str(uuid.uuid4()), "user_id": USER_ID, "title": body.get("title", "New Conversation"), "messages": body.get("messages", []), "created_at": _now_iso(), "updated_at": _now_iso()}
            state.conversations.insert(0, row)
            return reply_rows([row])
        if method == "PATCH":
            body = json.loads(req.post_data or "{}")
            cid = (q.get("id", ["eq."])[0])[3:]
            for c in state.conversations:
                if c["id"] == cid:
                    c.update(body)
            return route.fulfill(status=204, headers=CORS, body="")
        if method == "DELETE":
            return route.fulfill(status=204, headers=CORS, body="")
        rows = list(state.conversations)
        if "id" in q:
            rows = [c for c in rows if c["id"] == q["id"][0][3:]]
        return reply_rows(rows)

    return reply_rows([])


def _draft(route, body, state: MockState):
    if state.draft_offline:
        return route.abort("internetdisconnected")
    action = body.get("action")
    if action == "save":
        if state.hold_draft_saves:
            state.held.append((route, body))
            return
        return _draft_save(route, body, state)
    if action == "get":
        return _json(route, {"action": "get", "draft": state.drafts.get(body.get("sessionId"))})
    if action == "list":
        drafts = sorted(state.drafts.values(), key=lambda d: d["updatedAt"], reverse=True)
        return _json(route, {"action": "list", "drafts": drafts})
    if action == "discard":
        state.drafts.pop(body.get("sessionId"), None)
        return _json(route, {"action": "discard", "ok": True})
    return _json(route, {"error": "bad action", "code": "bad_request"}, 400)


def _draft_save(route, body, state: MockState):
    sid = body.get("sessionId") or str(uuid.uuid4())
    if body.get("sessionId") and sid not in state.drafts:
        return _json(route, {"error": "Draft not found", "code": "not_found"}, 404)
    rec = {"sessionId": sid, "task": body["task"], "script": body["script"], "secondsUsed": round(body["secondsUsed"]), "updatedAt": _now_iso()}
    state.drafts[sid] = rec
    return _json(route, {"action": "save", "sessionId": sid, "updatedAt": rec["updatedAt"]})


def release_held(state: MockState):
    held, state.held = state.held, []
    for route, body in held:
        if body.get("action") == "save":
            _draft_save(route, body, state)
        else:
            _grade(route, body, state, force=True)


def _grade(route, body, state: MockState, force=False):
    if state.hold_grade and not force:
        state.held.append((route, body))
        return
    if state.grade_error:
        status, code, msg = state.grade_error
        return _json(route, {"error": msg, "code": code}, status)
    report = json.loads(json.dumps(state.fx["reports"][state.grade_report]))
    sid = body.get("sessionId")
    if state.grade_unsaved:
        report["id"] = None
    else:
        report["id"] = str(uuid.uuid4())
        report["createdAt"] = _now_iso()
        row = {**state.fx["rows"][state.grade_report], "id": report["id"], "comments": report, "created_at": report["createdAt"]}
        state.reports.append(row)
        state.drafts.pop(sid, None)
    return _json(route, {"report": report, "creditsRemaining": 10})


def _task(route, body, state: MockState):
    variant = body.get("variant")
    task = state.task_for_variant.get(variant) if variant else None
    if task is None:
        candidates = [t for t in state.fx["bank"] if t["taskType"] == body.get("taskType") and (not variant or t["variant"] == variant)]
        task = candidates[0] if candidates else None
    if task is None:
        return _json(route, {"error": "No task available for that selection.", "code": "not_found"}, 404)
    return _json(route, {"task": task, "creditsRemaining": None})


def _chat(route, body, state: MockState):
    words = state.chat_reply.split(" ")
    chunks = [json.dumps({"choices": [{"index": 0, "delta": {"content": w + (" " if i < len(words) - 1 else "")}}]}) for i, w in enumerate(words)]
    stream = "".join(f"data: {c}\n\n" for c in chunks) + "data: [DONE]\n\n"
    route.fulfill(status=200, headers={**CORS, "Content-Type": "text/event-stream"}, body=stream)


def install(context, state: MockState):
    def handler(route):
        req = route.request
        url = urlparse(req.url)
        host = url.hostname or ""
        if host in ("localhost", "127.0.0.1"):
            return route.continue_()
        if not host.endswith(".supabase.co"):
            return route.abort()  # no other network in checks
        if req.method == "OPTIONS":
            return route.fulfill(status=204, headers=CORS, body="")
        path = url.path
        state.calls.append((req.method, path))
        if path.startswith("/auth/v1/"):
            if path.endswith("/user"):
                return _json(route, fake_session()["user"])
            if path.endswith("/token"):
                return _json(route, fake_session())
            return route.fulfill(status=204, headers=CORS, body="")
        if path.startswith("/rest/v1/"):
            return _rest(route, req, state, path.split("/")[3])
        if path.startswith("/functions/v1/"):
            name = path.split("/")[3]
            body = json.loads(req.post_data or "{}")
            if name == "ielts-draft":
                return _draft(route, body, state)
            if name == "ielts-grade-writing":
                return _grade(route, body, state)
            if name == "ielts-generate-writing-task":
                return _task(route, body, state)
            if name == "student-chat":
                return _chat(route, body, state)
            return _json(route, {})
        return _json(route, {})

    context.route("**/*", handler)
