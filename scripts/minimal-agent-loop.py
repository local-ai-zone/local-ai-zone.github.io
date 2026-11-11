#!/usr/bin/env python
"""A minimal, real AI agent loop — the ~80-line version the guide describes.

Standard library only. Talks to any OpenAI-compatible endpoint (llama.cpp's
`llama-server`, Ollama's `/v1`, LM Studio, vLLM, a hosted API) and gives the model three
real tools it can actually use on your disk:

    list_dir(path)            read_file(path)            write_file(path, content)

The model replies with a small JSON object per turn:

    {"tool": "list_dir", "path": "."}          -> the loop executes it and feeds back the result
    {"final_answer": "..."}                    -> the loop stops

    python scripts/minimal-agent-loop.py --help
    python scripts/minimal-agent-loop.py --base-url http://127.0.0.1:8080/v1 --model local \
        --task "Create notes.md with three bullets about ternary quantisation, list the
                directory, then summarise what you did."

Every tool call is confined to --workdir (default ./agent-workdir), and the loop prints
each turn as it happens — which is also the frame the blog's photo slot wants.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

# Windows consoles default to cp1252; model output and progress lines must not crash.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SYSTEM_PROMPT = """You are a careful agent working on a real filesystem.

You have exactly three tools:
  {"tool": "list_dir", "path": "."}                     list a directory
  {"tool": "read_file", "path": "notes.md"}             read a text file
  {"tool": "write_file", "path": "notes.md", "content": "..."}   write a text file

Reply with ONE JSON object and nothing else.
Use a tool when you still need information or need to write something.
When the task is done, reply with {"final_answer": "..."}.
"""

TOOLS = ("list_dir", "read_file", "write_file")


def call_model(base_url, model, messages, timeout, api_key=None):
    """One chat completion against an OpenAI-compatible endpoint."""
    body = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 700,
    }).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(base_url.rstrip("/") + "/chat/completions",
                                     data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload["choices"][0]["message"]["content"].strip()


def parse_reply(text):
    """Pull the first JSON object out of a model reply, ignoring code fences and prose."""
    cleaned = text.replace("```json", "```").strip()
    if "```" in cleaned:
        parts = [p for p in cleaned.split("```") if p.strip()]
        for part in parts:
            candidate = parse_reply(part) if part.strip().startswith("{") else None
            if candidate:
                return candidate
    start = cleaned.find("{")
    while start != -1:
        depth = 0
        for index in range(start, len(cleaned)):
            if cleaned[index] == "{":
                depth += 1
            elif cleaned[index] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(cleaned[start:index + 1])
                    except json.JSONDecodeError:
                        break
        start = cleaned.find("{", start + 1)
    return None


def safe_path(workdir, relative):
    """Resolve a model-supplied path inside the sandbox, refusing escapes."""
    target = os.path.abspath(os.path.join(workdir, str(relative or ".")))
    if os.path.commonpath([workdir, target]) != workdir:
        raise ValueError(f"path escapes the sandbox: {relative}")
    return target


def run_tool(name, arguments, workdir):
    """Execute one tool call and return the observation text."""
    if name == "list_dir":
        target = safe_path(workdir, arguments.get("path", "."))
        entries = sorted(os.listdir(target))
        return "\n".join(f"{e}{'/' if os.path.isdir(os.path.join(target, e)) else ''}" for e in entries) or "(empty)"

    if name == "read_file":
        target = safe_path(workdir, arguments.get("path", ""))
        with open(target, encoding="utf-8", errors="replace") as handle:
            text = handle.read(4000)
        return text or "(empty file)"

    if name == "write_file":
        target = safe_path(workdir, arguments.get("path", ""))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        content = arguments.get("content", "")
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(content)
        return f"wrote {len(content)} bytes to {os.path.relpath(target, workdir)}"

    raise ValueError(f"unknown tool: {name}")


def main():
    parser = argparse.ArgumentParser(description="Minimal local agent loop (standard library only).")
    parser.add_argument("--base-url", default="http://127.0.0.1:8080/v1",
                        help="OpenAI-compatible base URL (llama.cpp: :8080/v1, Ollama: :11434/v1)")
    parser.add_argument("--model", default="local", help="model name the server expects")
    parser.add_argument("--task", default="Create notes.md with three bullets about ternary "
                                          "quantisation, list the directory, then summarise what you did.")
    parser.add_argument("--workdir", default="agent-workdir", help="sandbox directory for the tools")
    parser.add_argument("--max-turns", type=int, default=8)
    parser.add_argument("--timeout", type=int, default=180, help="seconds per model call")
    parser.add_argument("--api-key", default=os.environ.get("OPENAI_API_KEY"))
    args = parser.parse_args()

    workdir = os.path.abspath(args.workdir)
    os.makedirs(workdir, exist_ok=True)

    print(f"agent loop : {args.base_url}  (model={args.model})")
    print(f"workdir    : {workdir}")
    print(f"task       : {args.task}\n")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Task: {args.task}\n\nWorking directory: {workdir}"},
    ]

    for turn in range(1, args.max_turns + 1):
        print(f"--- turn {turn} " + "-" * 52)
        try:
            reply = call_model(args.base_url, args.model, messages, args.timeout, args.api_key)
        except urllib.error.URLError as error:
            print(f"could not reach the model server at {args.base_url}: {error.reason}")
            print("start one first, e.g.  llama-server -m model.gguf -c 8192 --port 8080")
            return 1
        except (KeyError, json.JSONDecodeError) as error:
            print(f"unexpected response from the server: {error}")
            return 1

        action = parse_reply(reply)
        if not action:
            print(f"model: {reply.strip()}")
            print("\n(the reply was not JSON, so the loop treated it as the final answer)")
            return 0

        if "final_answer" in action:
            print(f"model: {reply.strip()}")
            print(f"\nfinal answer: {action['final_answer']}")
            return 0

        tool = action.get("tool")
        if tool not in TOOLS:
            observation = f"error: {tool!r} is not a tool. Use one of {', '.join(TOOLS)}."
        else:
            print(f"model: {json.dumps(action)}")
            try:
                observation = run_tool(tool, action, workdir)
            except (OSError, ValueError) as error:
                observation = f"error: {error}"
        print(f"tool call: {tool}({', '.join(f'{k}={v!r}' for k, v in action.items() if k != 'tool')})")
        print(f"observation: {observation.splitlines()[0] if observation else '(empty)'}"
              + (f"   … {len(observation.splitlines()) - 1} more line(s)" if len(observation.splitlines()) > 1 else ""))
        print()

        messages.append({"role": "assistant", "content": reply})
        messages.append({"role": "user", "content": f"observation: {observation}"})

    print(f"\nstopped after {args.max_turns} turns without a final answer")
    return 1


if __name__ == "__main__":
    sys.exit(main())
