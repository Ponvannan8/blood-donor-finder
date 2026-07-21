"""
Thin wrapper around OpenRouter's OpenAI-compatible chat completions API
(https://openrouter.ai/api/v1/chat/completions). Uses OpenRouter's free
tier — either a specific `:free`-suffixed model, or the `openrouter/free`
auto-router (the default), which picks whichever free model is currently
available so this doesn't silently break as individual free models rotate
in and out of OpenRouter's catalog.
"""
import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are the assistant embedded in Blood Donor Finder, a platform that connects blood \
donors with recipients and hospitals. Answer questions about blood donation: eligibility criteria, how \
often someone can donate, the donation process and what to expect, blood type compatibility, recovery and \
aftercare, common myths, and how to use this platform's own features (donor registration, blood requests, \
donor search, blood banks and hospitals directories).

Rules:
- Keep answers concise and easy to read in a small chat widget — a few sentences or a short list, not an essay.
- You are not a doctor. For anything about a specific person's fitness to donate, medication interactions, \
or symptoms after donating, give general guidance and clearly recommend they confirm with a doctor or the \
blood bank staff before donating.
- Never invent specific medical thresholds (hemoglobin cutoffs, exact drug interaction lists, etc.) you're \
not confident about — point to consulting a medical professional instead of guessing.
- If asked something unrelated to blood donation or this platform, politely redirect back to what you can help with.
"""

MAX_OUTPUT_TOKENS = 400
REQUEST_TIMEOUT_SECONDS = 30


async def get_chat_reply(messages: list[dict]) -> str:
    settings = get_settings()

    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "The chatbot isn't configured yet — set OPENROUTER_API_KEY in the backend .env "
            "(get a free key at https://openrouter.ai/keys).",
        )

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *messages],
        "max_tokens": MAX_OUTPUT_TOKENS,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        # Optional but recommended by OpenRouter for their analytics/rankings — harmless to omit functionally.
        "HTTP-Referer": "https://github.com/",
        "X-Title": "Blood Donor Finder",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(status.HTTP_504_GATEWAY_TIMEOUT, "The chatbot took too long to respond. Try again.")
    except httpx.RequestError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not reach OpenRouter: {exc}")

    if response.status_code == 429:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "OpenRouter's free tier is rate-limited (20 requests/minute). Wait a moment and try again.",
        )
    if response.status_code != 200:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"OpenRouter returned an error ({response.status_code}): {response.text[:300]}"
        )

    data = response.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "OpenRouter returned an unexpected response shape.")
