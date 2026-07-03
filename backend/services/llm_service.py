import os
import re
from groq import Groq

_client: Groq | None = None
_client_checked = False


def _get_client() -> Groq | None:
    """Lazily create the Groq client on first use instead of at import
    time. Previously `Groq(api_key=...)` ran at module import, so a
    missing GROQ_API_KEY crashed the entire FastAPI app on startup
    (ImportError chain through routers/explain.py -> main.py) instead of
    just disabling the AI explanation feature. Now a missing/bad key just
    means explain_forecast() falls back to the rule-based Bangla text."""
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        _client = Groq(api_key=api_key)
    except Exception:
        _client = None
    return _client


SYSTEM_PROMPT = """তুমি MarketMind AI, বাংলাদেশের সাধারণ মানুষের জন্য একজন বাজার মূল্য বিশ্লেষক।
নিয়ম (অবশ্যই মানতে হবে):
1. শুধুমাত্র বাংলায় উত্তর দাও। কোনো ইংরেজি বাক্য বা বাক্যাংশ লিখবে না। ইংরেজি হরফে বাংলা (Banglish)ও লিখবে না।
2. শুধু সংখ্যা, একক (৳, BDT, %) এবং প্রয়োজনে পণ্যের নাম ইংরেজিতে (যদি বাংলা না থাকে) রাখতে পারো।
3. দামের নিশ্চয়তা দেবে না। "সম্ভবত", "আশা করা যাচ্ছে", "হতে পারে" এই ধরনের শব্দ ব্যবহার করো।
4. তোমাকে যে তথ্য দেওয়া হয়েছে (যেমন: উৎসব, সাপ্তাহিক ছুটি, বৃষ্টিপাত, সাম্প্রতিক দামের প্রবণতা) শুধুমাত্র সেগুলোর ভিত্তিতেই কারণ ব্যাখ্যা করবে।
5. যে তথ্য দেওয়া হয়নি (যেমন সরবরাহ সংকট, আমদানি, সরকারি সিদ্ধান্ত) তা নিজে থেকে অনুমান করে বলবে না।
6. উত্তর ২-৩টি সংক্ষিপ্ত, সহজ বাক্যে দাও, সাধারণ মানুষ বোঝে এমন ভাষায়।"""

_LATIN_RE = re.compile(r"[A-Za-z]{3,}")
_ALLOWED_LATIN = {"BDT", "AI", "MarketMind"}


def _has_stray_english(text: str) -> bool:
    """Rough guard: flags runs of 3+ Latin letters that aren't in the
    small allow-list (unit/brand names), which usually means the model
    slipped into English or Banglish despite the prompt."""
    for match in _LATIN_RE.finditer(text):
        if match.group(0) not in _ALLOWED_LATIN:
            return True
    return False


def _weather_context_bn(is_festival: bool, is_weekend: bool, rainfall_mm: float | None) -> str:
    """Turns the model's actual computed drivers into a short Bangla
    fact line the LLM must ground its explanation in, instead of the
    LLM guessing at causes like 'festival' or 'rain' out of thin air."""
    facts = []
    if is_festival:
        facts.append("আগামীকাল একটি সরকারি ছুটি/উৎসবের দিন")
    if is_weekend:
        facts.append("আগামীকাল সাপ্তাহিক বন্ধের দিন (শুক্র/শনি)")
    if rainfall_mm is not None and rainfall_mm > 10:
        facts.append(f"এই এলাকায় প্রায় {round(rainfall_mm, 1)} মিমি বৃষ্টিপাতের সম্ভাবনা রয়েছে")
    if not facts:
        return "কোনো বিশেষ উৎসব, ছুটি বা উল্লেখযোগ্য বৃষ্টিপাতের পূর্বাভাস নেই — মূলত সাম্প্রতিক দামের প্রবণতার উপর ভিত্তি করে এই পূর্বাভাস।"
    return "মডেল অনুযায়ী এই বিষয়গুলো বিবেচনায় নেওয়া হয়েছে: " + "; ".join(facts) + "।"


def _factors_context_bn(top_factors: list[dict] | None) -> str | None:
    """Grounds the explanation in the model's actual SHAP-ranked drivers
    for THIS specific prediction, instead of the fixed festival/weekend/
    rainfall checklist. Returns None if no factors are available so the
    caller can fall back to _weather_context_bn."""
    if not top_factors:
        return None
    lines = []
    for f in top_factors:
        arrow = "বাড়িয়েছে" if f["direction"] == "up" else "কমিয়েছে"
        lines.append(f"{f['label_bn']} দামকে {arrow}")
    return "মডেলের বিশ্লেষণ (SHAP) অনুযায়ী এই কারণগুলো সবচেয়ে বেশি প্রভাব ফেলেছে: " + "; ".join(lines) + "।"


def _fallback_bn(product_bn: str, current_price: float, predicted_price: float, direction: str) -> str:
    """Rule-based Bangla fallback used when Groq is unavailable (no API
    key, network error, rate limit, etc.) — kept fully in Bangla so the
    UI never mixes languages regardless of which path fires."""
    change = abs(round(predicted_price - current_price, 2))
    if direction == "increase":
        return (
            f"{product_bn}-এর দাম আগামীকাল প্রায় {change} টাকা বাড়তে পারে, "
            f"সাম্প্রতিক দামের প্রবণতা অনুযায়ী। আজকের মধ্যে কিনে ফেলাই ভালো হতে পারে।"
        )
    elif direction == "decrease":
        return (
            f"{product_bn}-এর দাম আগামীকাল সামান্য কমতে পারে। "
            f"চাইলে ১-২ দিন অপেক্ষা করে দেখতে পারেন।"
        )
    return (
        f"{product_bn}-এর দাম আগামীকাল প্রায় {current_price} টাকার আশেপাশে স্থিতিশীল থাকতে পারে। "
        f"এখনই কেনা বা অপেক্ষা করার তেমন প্রয়োজন নেই।"
    )


def explain_forecast(
    product_en: str,
    current_price: float,
    predicted_price: float,
    direction: str,
    advice: str,
    product_bn: str | None = None,
    market: str | None = None,
    is_festival: bool = False,
    is_weekend: bool = False,
    rainfall_mm: float | None = None,
    temp_avg_c: float | None = None,
    top_factors: list[dict] | None = None,
) -> str:
    display_name = product_bn or product_en
    client = _get_client()

    if client is None:
        return _fallback_bn(display_name, current_price, predicted_price, direction)

    # Prefer real SHAP-ranked drivers for this exact prediction; fall
    # back to the coarse festival/weekend/rainfall checklist only if
    # SHAP factors weren't computed (e.g. legacy caller).
    context_line = _factors_context_bn(top_factors) or _weather_context_bn(
        is_festival, is_weekend, rainfall_mm
    )

    prompt = f"""
পণ্য: {display_name}
বাজার: {market or "N/A"}
আজকের গড় দাম: {current_price} টাকা
আগামীকালের পূর্বাভাসিত দাম: {predicted_price} টাকা
প্রবণতা: {direction}
ক্রয় পরামর্শ: {advice}

{context_line}

উপরের তথ্যের ভিত্তিতে, ২-৩টি সংক্ষিপ্ত বাক্যে বাংলায় ব্যাখ্যা দাও — কেন এই পরিবর্তন হতে পারে
এবং ক্রেতার এখন কী করা উচিত। শুধু বাংলায় লিখবে, ইংরেজি লিখবে না।
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.4,
        )
        text = resp.choices[0].message.content.strip()

        if _has_stray_english(text):
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": text},
                    {"role": "user", "content": "তুমি ইংরেজি ব্যবহার করেছ। পুরো উত্তরটি শুধুমাত্র বাংলায় আবার লেখো, কোনো ইংরেজি শব্দ ছাড়া।"},
                ],
                max_tokens=300,
                temperature=0.2,
            )
            text = resp.choices[0].message.content.strip()
            if _has_stray_english(text):
                return _fallback_bn(display_name, current_price, predicted_price, direction)

        return text
    except Exception:
        return _fallback_bn(display_name, current_price, predicted_price, direction)


def explain_basket_plan(
    items: list[dict],
    multi_market_total: float,
    single_market: dict | None,
    savings_vs_blind: float,
    wait_products: list[str],
) -> str:
    """Explain the basket optimizer's recommendation in plain Bangla."""
    client = _get_client()

    item_lines = "\n".join(
        f"- {i['product']}: {i['qty']} @ {i['best_market']} (৳{i['best_price']} প্রতি একক)"
        for i in items
    )
    single_line = (
        f"এক জায়গায় সব কেনার বিকল্প: {single_market['market']}-এ সব মিলিয়ে ৳{single_market['total']}"
        if single_market else "কোনো একক বাজারে পুরো তালিকা পাওয়া যাচ্ছে না।"
    )
    wait_line = (
        f"অপেক্ষা করার মতো পণ্য: {', '.join(wait_products)}।" if wait_products else "অপেক্ষা করার মতো কোনো পণ্য নেই।"
    )

    if client is None:
        if single_market and savings_vs_blind < 10:
            return (
                f"সব পণ্যের জন্য {single_market['market']}-এ যাওয়াই ভালো — মোট ৳{single_market['total']}। "
                f"একাধিক বাজারে গিয়ে খুব বেশি সাশ্রয় হবে না।"
            )
        return (
            f"প্রতিটি পণ্য সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}, "
            f"যা পরিকল্পনা ছাড়া কেনাকাটার তুলনায় প্রায় ৳{savings_vs_blind} সাশ্রয় করবে।"
        )

    prompt = f"""
একজন ক্রেতার বাজারের তালিকা এবং আমাদের অপ্টিমাইজারের পরামর্শ:
{item_lines}

একাধিক বাজার মিলিয়ে সর্বনিম্ন মোট খরচ: ৳{multi_market_total}
{single_line}
পরিকল্পনা ছাড়া কেনাকাটার তুলনায় আনুমানিক সাশ্রয়: ৳{savings_vs_blind}
{wait_line}

উপরের তথ্যের ভিত্তিতে, ২-৩টি সংক্ষিপ্ত বাক্যে বাংলায় ব্যাখ্যা দাও — একাধিক বাজারে যাওয়া লাভজনক
নাকি এক জায়গা থেকেই কেনা ভালো। শুধু বাংলায় লিখবে, ইংরেজি লিখবে না।
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.4,
        )
        text = resp.choices[0].message.content.strip()
        if _has_stray_english(text):
            return (
                f"প্রতিটি পণ্য সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}, "
                f"যা প্রায় ৳{savings_vs_blind} সাশ্রয় করবে।"
            )
        return text
    except Exception:
        return (
            f"প্রতিটি পণ্য সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}, "
            f"যা প্রায় ৳{savings_vs_blind} সাশ্রয় করবে।"
        )


def explain_price_alert(
    product_en: str,
    current_price: float,
    predicted_price: float,
    change_pct: float,
    product_bn: str | None = None,
    market: str | None = None,
) -> str:
    """Explain a triggered price-drop alert. Always a 'decrease' since alerts only fire on drops."""
    advice = "এক-দুই দিন কেনা থেকে বিরত থাকা ভালো হতে পারে।"
    return explain_forecast(
        product_en, current_price, predicted_price, "decrease", advice,
        product_bn=product_bn, market=market,
    )