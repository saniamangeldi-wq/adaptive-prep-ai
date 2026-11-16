#!/usr/bin/env python3
"""
Browser check of every screen against a mocked Supabase (no real project, no AI calls).

  npm run build
  npx vite-node scripts/preview-with-mocks/dump-fixtures.ts > /tmp/ielts-fixtures.json
  python3 scripts/preview-with-mocks/run.py --out /tmp/ielts-shots [--only editor] [--widths 380,1280]

Starts `npx vite preview` on port 4173 (unless something already listens there), opens
Chrome through Playwright, answers every *.supabase.co call from mock_server.py, and
saves full-page screenshots plus a console-error log (errors.txt) in --out. Look at the
screenshots: the script only fails on crashes, not on layout.
Needs: Python Playwright and a Chrome/Chromium (default /usr/bin/google-chrome; --chrome to change).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
import mock_server as ms  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BASE = "http://127.0.0.1:4173"
SID = {  # fixed draft ids per task fixture
    "line": "a0000000-0000-4000-8000-000000000001",
    "bar": "a0000000-0000-4000-8000-000000000002",
    "pie": "a0000000-0000-4000-8000-000000000003",
    "table": "a0000000-0000-4000-8000-000000000004",
    "mixed": "a0000000-0000-4000-8000-000000000005",
    "process": "a0000000-0000-4000-8000-000000000006",
    "cycle": "a0000000-0000-4000-8000-000000000007",
    "branching": "a0000000-0000-4000-8000-000000000008",
    "map": "a0000000-0000-4000-8000-000000000009",
    "letter": "a0000000-0000-4000-8000-00000000000a",
    "task2": "a0000000-0000-4000-8000-00000000000b",
    "bankmap1": "a0000000-0000-4000-8000-00000000000c",
    "bankmap2": "a0000000-0000-4000-8000-00000000000d",
    "custom1": "a0000000-0000-4000-8000-00000000000e",
}
# A 2x2 PNG for the upload control.
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==")


def port_open(port: int) -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


class Runner:
    def __init__(self, browser, fx, out: Path, widths):
        self.browser, self.fx, self.out, self.widths = browser, fx, out, widths
        self.errors: list[str] = []

    def state(self, **kw) -> ms.MockState:
        st = ms.MockState(fx=self.fx)
        for k, v in kw.items():
            setattr(st, k, v)
        return st

    def page(self, width: int, state: ms.MockState, signed_in=True):
        ctx = self.browser.new_context(viewport={"width": width, "height": 860}, device_scale_factor=1, color_scheme="dark")
        ctx.add_init_script(ms.init_script(ms.fake_session() if signed_in else None))
        ms.install(ctx, state)
        page = ctx.new_page()
        tag = f"[{width}]"
        # Failed requests that a scenario provokes on purpose (offline, 4xx, 5xx) are logged by the browser too; skip those.
        page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and self.errors.append(f"{tag} {page.url} console: {m.text}"))
        page.on("pageerror", lambda e: self.errors.append(f"{tag} {page.url} pageerror: {e}"))
        return ctx, page

    def shot(self, page, name: str, width: int, full=True):
        page.wait_for_timeout(250)
        path = self.out / f"{name}@{width}.png"
        page.screenshot(path=str(path), full_page=full)
        print("  shot", path.name)

    def goto(self, page, path: str):
        page.goto(BASE + path)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(300)

    def draft(self, key: str, task: dict, script: str = "", seconds: int = 0) -> dict:
        return {"sessionId": SID[key], "task": task, "script": script, "secondsUsed": seconds, "updatedAt": "2026-11-16T08:00:00.000Z"}


# ───────────────────────── scenarios ─────────────────────────


def sc_public(r: Runner, w: int):
    for path, name in [("/", "landing"), ("/login", "login"), ("/signup", "signup")]:
        ctx, p = r.page(w, r.state(), signed_in=False)
        r.goto(p, path)
        r.shot(p, name, w)
        ctx.close()
    ctx, p = r.page(w, r.state())
    r.goto(p, "/dashboard/settings")
    r.shot(p, "settings", w)
    ctx.close()


def sc_home(r: Runner, w: int):
    st = r.state(drafts={SID["task2"]: r.draft("task2", r.fx["tasks"]["task2"], r.fx["draft"]["script"], 312)})
    ctx, p = r.page(w, st)
    r.goto(p, "/dashboard/writing")
    r.shot(p, "home-drafts", w)
    p.get_by_role("button", name="Academic Task 1").click()
    p.locator("#variant").click()
    p.wait_for_timeout(300)
    r.shot(p, "home-variant-open", w, full=False)
    p.keyboard.press("Escape")
    p.get_by_role("tab", name="Use my own question").click()
    p.locator("#own-prompt").fill("The chart below shows the number of visitors to three museums in 2010 and 2020. Summarise the information.")
    r.shot(p, "home-own-academic", w)
    p.locator("#chart-file").set_input_files(files=[{"name": "my-chart-photo-from-phone.png", "mimeType": "image/png", "buffer": PNG}])
    p.wait_for_timeout(600)
    r.shot(p, "home-own-image", w)
    p.get_by_role("button", name="Describe it in words").click()
    r.shot(p, "home-own-describe", w)
    # Discard flow
    p.get_by_role("button", name="Discard").first.click()
    p.wait_for_timeout(300)
    r.shot(p, "home-discard-dialog", w, full=False)
    p.get_by_role("button", name="Discard").last.click()
    p.wait_for_timeout(500)
    r.shot(p, "home-after-discard", w)
    ctx.close()

    # "Give me a task" end to end: lands in the editor
    st = r.state(task_for_variant={"map": r.fx["bankMaps"][0]})
    ctx, p = r.page(w, st)
    r.goto(p, "/dashboard/writing")
    p.get_by_role("button", name="Academic Task 1").click()
    p.locator("#variant").click()
    p.get_by_role("option", name="Map").click()
    p.get_by_role("button", name="Give me a task").click()
    p.wait_for_url("**/session/**")
    p.wait_for_timeout(800)
    r.shot(p, "home-give-task-result", w)
    ctx.close()

    # Own question: start writing with an image → editor shows the image
    ctx, p = r.page(w, r.state())
    r.goto(p, "/dashboard/writing")
    p.get_by_role("button", name="Academic Task 1").click()
    p.get_by_role("tab", name="Use my own question").click()
    p.locator("#own-prompt").fill("The chart below shows the number of visitors to three museums in 2010 and 2020. Summarise the information.")
    p.locator("#chart-file").set_input_files(files=[{"name": "chart.png", "mimeType": "image/png", "buffer": PNG}])
    p.wait_for_timeout(600)
    p.get_by_role("button", name="Start writing").click()
    p.wait_for_url("**/session/**")
    p.wait_for_timeout(800)
    r.shot(p, "home-own-started", w)
    ctx.close()


def sc_editor_visuals(r: Runner, w: int):
    keys = ["line", "bar", "pie", "table", "mixed", "process", "cycle", "branching", "map", "letter", "task2"]
    drafts = {SID[k]: r.draft(k, r.fx["tasks"][k]) for k in keys}
    for i, t in enumerate(r.fx["bankMaps"][:2]):
        drafts[SID[f"bankmap{i + 1}"]] = r.draft(f"bankmap{i + 1}", t)
    st = r.state(drafts=drafts)
    ctx, p = r.page(w, st)
    for k in keys + ["bankmap1", "bankmap2"]:
        r.goto(p, f"/dashboard/writing/session/{SID[k]}")
        p.wait_for_timeout(700)  # charts and map layout settle
        r.shot(p, f"editor-{k}", w)
        if w >= 1024:  # the task panel scrolls on its own on desktop: unpin it to see all of it
            p.evaluate("""() => { const s = document.querySelector('section[aria-label="The task"]'); if (s) { s.style.maxHeight = 'none'; s.style.position = 'static'; s.style.overflow = 'visible'; } }""")
            r.shot(p, f"editor-{k}-task", w)
    ctx.close()


SCRIPT_TEXT = (
    "In recent years, many parents are asking whether their children should start learning a foreign language at primary school. "
    "I agree with this idea to a large extent.\n\nFirstly, small children copy sounds easily. "
)


def sc_editor_states(r: Runner, w: int):
    t2 = r.fx["tasks"]["task2"]
    st = r.state(drafts={SID["task2"]: r.draft("task2", t2)})
    ctx, p = r.page(w, st)
    r.goto(p, f"/dashboard/writing/session/{SID['task2']}")
    r.shot(p, "editor-empty", w, full=False)
    p.locator("#script").fill(SCRIPT_TEXT)
    p.wait_for_timeout(600)
    r.shot(p, "editor-typed-local", w, full=False)
    st.hold_draft_saves = True
    p.wait_for_timeout(5600)
    r.shot(p, "editor-saving", w, full=False)
    st.hold_draft_saves = False
    ms.release_held(st)
    p.wait_for_timeout(500)
    r.shot(p, "editor-saved", w, full=False)
    st.draft_offline = True
    p.locator("#script").press("End")
    p.keyboard.type(" More text written while offline.")
    p.wait_for_timeout(6000)
    r.shot(p, "editor-offline", w, full=False)
    # Reload while offline: the device copy must come back.
    p.reload()
    p.wait_for_load_state("networkidle")
    p.wait_for_timeout(800)
    r.shot(p, "editor-restored-offline", w, full=False)
    val = p.locator("#script").input_value()
    if "written while offline" not in val:
        r.errors.append(f"[{w}] RESTORE FAILED: offline text missing after reload")
    st.draft_offline = False
    # Submit: waiting overlay, then each error
    st.hold_grade = True
    p.get_by_role("button", name="Get my estimated band").click()
    p.wait_for_timeout(1200)
    r.shot(p, "editor-grading", w, full=False)
    errs = [
        (402, "no_credits", "You're out of credits for today. They reset tomorrow."),
        (400, "too_short", "Write a longer answer before submitting."),
        (413, "too_long", "That answer is too long to mark (max 600 words)."),
        (429, "rate_limited", "The marking service is busy. Please try again in a minute."),
        (502, "grader_invalid_output", "The marker returned an unreadable result."),
        (502, "upstream_error", "The AI service is unavailable right now."),
        (401, "unauthorized", "Please sign in."),
        (404, "not_found", "Unknown task id."),
        (400, "bad_request", "Invalid task: task.prompt: required"),
    ]
    st.grade_error = errs[0]
    ms.release_held(st)
    st.hold_grade = False
    p.wait_for_timeout(800)
    for status, code, msg in errs:
        st.grade_error = (status, code, msg)
        p.get_by_role("button", name="Get my estimated band").click()
        p.wait_for_timeout(900)
        txt = p.locator('[role="alert"]').all_inner_texts()
        print(f"   {code}: {txt}")
        if code in ("no_credits", "grader_invalid_output"):
            r.shot(p, f"editor-error-{code}", w, full=False)
    st.grade_error = None
    p.get_by_role("button", name="Get my estimated band").click()
    p.wait_for_url("**/report/**")
    p.wait_for_timeout(800)
    r.shot(p, "editor-submitted-report", w, full=False)
    ctx.close()

    # Custom Academic task whose chart is not on this device → dialog
    custom = {**r.fx["tasks"]["line"], "id": "custom", "source": "custom", "visuals": []}
    st = r.state(drafts={SID["custom1"]: r.draft("custom1", custom, SCRIPT_TEXT * 2)})
    ctx, p = r.page(w, st)
    r.goto(p, f"/dashboard/writing/session/{SID['custom1']}")
    r.shot(p, "editor-custom-nochart", w)
    p.get_by_role("button", name="Get my estimated band").click()
    p.wait_for_timeout(500)
    r.shot(p, "editor-missing-chart-dialog", w, full=False)
    ctx.close()

    # Missing draft, unsaved report path
    ctx, p = r.page(w, r.state())
    r.goto(p, "/dashboard/writing/session/b0000000-0000-4000-8000-000000000999")
    r.shot(p, "editor-missing", w, full=False)
    r.goto(p, "/dashboard/writing/session/not-a-uuid")
    r.shot(p, "editor-bad-id", w, full=False)
    ctx.close()
    st = r.state(drafts={SID["task2"]: r.draft("task2", t2, SCRIPT_TEXT * 2)}, grade_unsaved=True)
    ctx, p = r.page(w, st)
    r.goto(p, f"/dashboard/writing/session/{SID['task2']}")
    p.get_by_role("button", name="Get my estimated band").click()
    p.wait_for_url("**/report/unsaved")
    p.wait_for_timeout(600)
    r.shot(p, "report-unsaved", w, full=False)
    ctx.close()


def sc_report(r: Runner, w: int):
    rows = r.fx["rows"]
    st = r.state(reports=[rows["task2"], rows["task1Low"], rows["adjusted"], rows["legacy"], *rows["malformed"]])
    ctx, p = r.page(w, st)
    for key in ["task2", "task1Low", "adjusted", "legacy"]:
        r.goto(p, f"/dashboard/writing/report/{rows[key]['id']}")
        r.shot(p, f"report-{key}", w)
    r.goto(p, f"/dashboard/writing/report/{rows['task2']['id']}")
    p.locator("mark").nth(3).click()
    p.wait_for_timeout(400)
    r.shot(p, "report-popover", w, full=False)
    p.keyboard.press("Escape")
    # open the task fold and the model answer fold
    p.get_by_role("button", name="Model answer").click()
    p.get_by_role("button", name="The task").click()
    p.wait_for_timeout(300)
    r.shot(p, "report-folds-open", w)
    r.goto(p, f"/dashboard/writing/report/{rows['malformed'][1]['id']}")
    r.shot(p, "report-malformed", w, full=False)
    r.goto(p, "/dashboard/writing/report/c0000000-0000-4000-8000-000000000404")
    r.shot(p, "report-missing", w, full=False)
    ctx.close()


def sc_history(r: Runner, w: int):
    rows = r.fx["rows"]
    many = []
    bands = [(5, 5.5, 5, 5), (5.5, 6, 5.5, 5), (6, 6, 6, 5.5), (6, 6.5, 6, 5.5), (6.5, 6.5, 6.5, 6)]
    for i, b in enumerate(bands):
        rep = json.loads(json.dumps(r.fx["reports"]["task2"]))
        rep["id"] = f"d0000000-0000-4000-8000-00000000000{i}"
        for k, band in zip(["task", "coherence", "lexical", "grammar"], b):
            rep["criteria"][k]["band"] = band
        rep["overall"] = int(sum(b) / 4 * 2) / 2
        day = f"2026-10-{10 + i * 5:02d}T10:00:00.000Z"
        many.append({**rows["task2"], "id": rep["id"], "comments": rep, "created_at": day, "overall_band": rep["overall"]})
    for name, reports in [("history-empty", []), ("history-one", [rows["task2"]]), ("history-several", many + [rows["legacy"], rows["malformed"][1], rows["task1Low"]])]:
        ctx, p = r.page(w, r.state(reports=reports))
        r.goto(p, "/dashboard/history")
        p.wait_for_timeout(500)
        r.shot(p, name, w)
        ctx.close()


def sc_chat(r: Runner, w: int):
    rows = r.fx["rows"]
    st = r.state(reports=[rows["task2"]])
    ctx, p = r.page(w, st)
    r.goto(p, f"/dashboard?report={rows['task2']['id']}")
    p.wait_for_timeout(500)
    r.shot(p, "chat-report-chip", w, full=False)
    p.get_by_role("button", name="Why did I lose marks for coherence?").click()
    p.wait_for_timeout(1500)
    r.shot(p, "chat-reply", w, full=False)
    ctx.close()
    ctx, p = r.page(w, r.state())
    r.goto(p, "/dashboard")
    r.shot(p, "chat-plain", w, full=False)
    ctx.close()


SCENARIOS = {
    "public": sc_public,
    "home": sc_home,
    "editor-visuals": sc_editor_visuals,
    "editor-states": sc_editor_states,
    "report": sc_report,
    "history": sc_history,
    "chat": sc_chat,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/ielts-shots")
    ap.add_argument("--fixtures", default="/tmp/ielts-fixtures.json")
    ap.add_argument("--only", default="")
    ap.add_argument("--widths", default="380,1280")
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    fx = json.loads(Path(args.fixtures).read_text())
    widths = [int(x) for x in args.widths.split(",")]

    server = None
    if not port_open(4173):
        server = subprocess.Popen(["npx", "vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(60):
            if port_open(4173):
                break
            time.sleep(0.5)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chrome, args=["--no-sandbox"])
            r = Runner(browser, fx, out, widths)
            for name, fn in SCENARIOS.items():
                if args.only and args.only not in name:
                    continue
                for w in widths:
                    print(f"{name} @ {w}")
                    try:
                        fn(r, w)
                    except Exception as e:  # keep going; report at the end
                        r.errors.append(f"[{w}] SCENARIO {name} crashed: {e}")
                        print("  CRASH", e)
            browser.close()
            (out / "errors.txt").write_text("\n".join(r.errors))
            print(f"\n{len(r.errors)} console/page errors (see {out / 'errors.txt'})")
            for e in r.errors[:40]:
                print(" ", e[:300])
    finally:
        if server:
            server.terminate()


if __name__ == "__main__":
    main()
