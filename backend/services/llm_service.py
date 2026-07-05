import os
import re

try:
    from groq import Groq
except Exception: 
    Groq = None

_client = None
_client_checked = False


def _get_client():
    """Create Groq client lazily. If the key/package/network is missing,
    the app still returns a complete rule-based Bangla explanation."""
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True

    if Groq is None:
        return None

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        _client = Groq(api_key=api_key)
    except Exception:
        _client = None
    return _client


EXPLAIN_MODEL = os.getenv("GROQ_EXPLAIN_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT = """তুমি MarketMind AI, বাংলাদেশের সাধারণ মানুষের জন্য একজন বাজার মূল্য বিশ্লেষক।
নিয়ম:
1. শুধুমাত্র বাংলায় উত্তর দাও। ইংরেজি বাক্য বা Banglish লিখবে না।
2. শুধু দেওয়া সংখ্যাগুলো, ৳, %, °C এবং পণ্যের নাম ব্যবহার করতে পারো।
3. দামের নিশ্চয়তা দেবে না; "সম্ভবত", "হতে পারে", "মডেল অনুযায়ী" ধরনের সতর্ক ভাষা ব্যবহার করবে।
4. সরবরাহ সংকট, আমদানি, সরকারি সিদ্ধান্ত বা কোনো বাইরের কারণ অনুমান করবে না।
5. আবহাওয়া, উৎসব/সাপ্তাহিক ছুটি এবং সাম্প্রতিক দামের প্রবণতা—এই তিনটি দিক অবশ্যই ব্যাখ্যায় রাখবে।
6. উত্তর সম্পূর্ণ হবে; মাঝপথে থেমে যাবে না। ৩-৪টি ছোট লাইনে লিখবে।"""

_LATIN_RE = re.compile(r"[A-Za-z]{3,}")
_ALLOWED_LATIN = {"BDT", "AI", "MarketMind"}
_CONTEXT_WORDS = ("বৃষ্টি", "আবহাও", "তাপমাত্রা", "উৎসব", "ছুটি")


def _has_stray_english(text: str) -> bool:
    for match in _LATIN_RE.finditer(text or ""):
        if match.group(0) not in _ALLOWED_LATIN:
            return True
    return False


def _num(value, default="তথ্য নেই"):
    try:
        return f"{float(value):.2f}"
    except Exception:
        return default


def _change_direction_bn(change_pct: float | None, direction: str | None = None) -> str:
    try:
        change = float(change_pct)
    except Exception:
        change = 0.0
    if direction == "increase" or change > 2:
        return "বাড়তে পারে"
    if direction == "decrease" or change < -2:
        return "কমতে পারে"
    return "আগের মতোই থাকতে পারে"


def _advice_bn(direction: str, change_pct: float | None) -> str:
    try:
        change = float(change_pct)
    except Exception:
        change = 0.0

    if direction == "increase" or change > 2:
        if change >= 8:
            return "তাই খুব দরকার না হলে এখনই কিনে ফেলা বুদ্ধিমানের কাজ হবে।"
        return "তাই প্রয়োজন থাকলে এখনই কিনে নিতে পারেন, তবে অনেক বেশি জমিয়ে রাখার দরকার নেই।"
    if direction == "decrease" or change < -2:
        return "তাই তাড়াহুড়ো না থাকলে বাজারের পরবর্তী আপডেট দেখে কেনা ভালো হবে।"
    return "তাই দাম যেহেতু স্বাভাবিক আছে, আপনার প্রয়োজন অনুযায়ী কিনলেই চলবে।"


def _weather_sentence_bn(is_festival: bool, is_weekend: bool, rainfall_mm: float | None, temp_avg_c: float | None) -> str:
    parts = []

    if is_festival:
        parts.append("উৎসব বা সরকারি ছুটির হিসাব ধরা হয়েছে")
    elif is_weekend:
        parts.append("সাপ্তাহিক ছুটির দিনের হিসাব ধরা হয়েছে")
    else:
        parts.append("ছুটি বা উৎসবের তেমন কোনো প্রভাব নেই")

    if rainfall_mm is None:
        parts.append("বৃষ্টিপাতের সঠিক তথ্য পাওয়া যায়নি")
    else:
        rain = float(rainfall_mm)
        if rain >= 20:
            parts.append(f"ভারী বৃষ্টি হতে পারে, প্রায় {rain:.1f} মিমি")
        elif rain >= 8:
            parts.append(f"মাঝারি বৃষ্টি হতে পারে, প্রায় {rain:.1f} মিমি")
        else:
            parts.append(f"হালকা বা কম বৃষ্টি হতে পারে, প্রায় {rain:.1f} মিমি")

    if temp_avg_c is not None:
        try:
            parts.append(f"গড় তাপমাত্রা থাকবে প্রায় {float(temp_avg_c):.1f}°C")
        except Exception:
            pass

    return "আবহাওয়া ও ছুটির দিন বিবেচনায় " + ", ".join(parts) + "।"


def _factor_sentence_bn(top_factors: list[dict] | None) -> str:
    if not top_factors:
        return "সাম্প্রতিক দামের ওঠানামাই মডেলের সিদ্ধান্তের প্রধান কারণ।"

    useful = []
    for f in top_factors[:3]:
        label = f.get("label_bn") or f.get("label_en") or f.get("feature")
        direction = "দাম বাড়িয়েছে" if f.get("direction") == "up" else "দাম কমিয়েছে"
        useful.append(f"{label} {direction}")

    return "প্রধান কারণগুলো হলো: " + "; ".join(useful) + "।"


def _deterministic_forecast_explanation_bn(
    product_name: str,
    current_price: float,
    predicted_price: float,
    direction: str,
    change_pct: float | None,
    is_festival: bool,
    is_weekend: bool,
    rainfall_mm: float | None,
    temp_avg_c: float | None,
    top_factors: list[dict] | None,
) -> str:
    try:
        change = float(change_pct)
    except Exception:
        change = ((float(predicted_price) - float(current_price)) / float(current_price)) * 100 if current_price else 0

    direction_text = _change_direction_bn(change, direction)
    price_line = (
        f"বর্তমানে {product_name}-এর গড় দাম ৳{_num(current_price)}, "
        f"আর সামনের বাজারে দাম হতে পারে প্রায় ৳{_num(predicted_price)} — "
        f"অর্থাৎ দাম {change:+.2f}% এর মতো {direction_text}।"
    )
    factor_line = _factor_sentence_bn(top_factors)
    weather_line = _weather_sentence_bn(is_festival, is_weekend, rainfall_mm, temp_avg_c)
    advice_line = _advice_bn(direction, change)

    return "\n".join([price_line, factor_line, weather_line, advice_line])


def _bad_explanation(text: str) -> bool:
    text = (text or "").strip()
    if len(text) < 120:
        return True
    if _has_stray_english(text):
        return True
    if not any(word in text for word in _CONTEXT_WORDS):
        return True
    if text[-1] not in "।!?":
        return True
    return False


def explain_forecast(
    product_en: str,
    current_price: float,
    predicted_price: float,
    direction: str,
    advice: str,
    product_bn: str | None = None,
    market: str | None = None,
    change_pct: float | None = None,
    is_festival: bool = False,
    is_weekend: bool = False,
    rainfall_mm: float | None = None,
    temp_avg_c: float | None = None,
    top_factors: list[dict] | None = None,
) -> str:
    """Return a complete Bangla explanation for the forecast."""
    display_name = product_bn or product_en

    safe_draft = _deterministic_forecast_explanation_bn(
        product_name=display_name,
        current_price=current_price,
        predicted_price=predicted_price,
        direction=direction,
        change_pct=change_pct,
        is_festival=is_festival,
        is_weekend=is_weekend,
        rainfall_mm=rainfall_mm,
        temp_avg_c=temp_avg_c,
        top_factors=top_factors,
    )

    client = _get_client()
    if client is None:
        return safe_draft

    prompt = f"""
নিচের খসড়াটি MarketMind AI-এর পূর্বাভাস ডেটা থেকে তৈরি। এটিকে আরও স্বাভাবিক ও সুন্দর বাংলায় লিখো।
তথ্য বদলাবে না, নতুন কারণ যোগ করবে না, সংখ্যাগুলো বদলাবে না।
আবহাওয়া, উৎসব/সাপ্তাহিক ছুটি এবং দামের প্রবণতার কথা অবশ্যই থাকবে।
উত্তর ৩-৪টি সম্পূর্ণ ছোট লাইনে দাও।

খসড়া:
{safe_draft}
"""

    try:
        resp = client.chat.completions.create(
            model=EXPLAIN_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            temperature=0.2,
        )
        text = (resp.choices[0].message.content or "").strip()
        if _bad_explanation(text):
            return safe_draft
        return text
    except Exception:
        return safe_draft


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
        f"- {i['product']}: {i['qty']} @ {i['best_market']} (৳{i['best_price']} প্রতি পিস/কেজি)"
        for i in items
    )
    single_line = (
        f"এক জায়গা থেকে কেনার অপশন: {single_market['market']}-এ সব একসাথে পাবেন ৳{single_market['total']}-এ।"
        if single_market else "কোনো একটা নির্দিষ্ট বাজারে সব পণ্য একসাথে পাওয়া যাচ্ছে না।"
    )
    wait_line = (
        f"যেসব পণ্য পরে কিনলে ভালো হয়: {', '.join(wait_products)}।" if wait_products else "এই মুহূর্তে অপেক্ষা করার মতো কোনো পণ্য নেই।"
    )

    if client is None:
        if single_market and savings_vs_blind < 10:
            return (
                f"সবকিছু {single_market['market']} থেকেই কিনে নেওয়া ভালো — মোট খরচ ৳{single_market['total']}। "
                f"আলাদা আলাদা বাজারে গেলে খুব একটা লাভ বা সাশ্রয় হবে না।"
            )
        return (
            f"প্রতিটি জিনিস আলাদা করে সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}। "
            f"এতে কোনো পরিকল্পনা ছাড়া কেনার চেয়ে আপনার প্রায় ৳{savings_vs_blind} বাঁচবে।"
        )

    prompt = f"""
একজন ক্রেতার বাজারের ফর্দ এবং আমাদের সিস্টেমের পরামর্শ:
{item_lines}

কয়েকটা বাজার ঘুরে কিনলে সর্বনিম্ন মোট খরচ: ৳{multi_market_total}
{single_line}
আন্দাজে বা এক জায়গা থেকে কেনার চেয়ে আনুমানিক সাশ্রয়: ৳{savings_vs_blind}
{wait_line}

উপরের তথ্যের ওপর ভিত্তি করে, সাধারণ মানুষের ভাষায় ২-৩টি ছোট লাইনে বুঝিয়ে বলো — আলাদা আলাদা বাজারে গিয়ে কেনা লাভজনক হবে নাকি এক জায়গা থেকেই কিনে ফেলা ভালো। শুধু বাংলায় লিখবে, কোনো ইংরেজি শব্দ রাখবে না।
"""
    try:
        resp = client.chat.completions.create(
            model=EXPLAIN_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.3,
        )
        text = resp.choices[0].message.content.strip()
        if _has_stray_english(text):
            return (
                f"প্রতিটি জিনিস আলাদা করে সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}। "
                f"এতে আপনার প্রায় ৳{savings_vs_blind} সাশ্রয় হবে।"
            )
        return text
    except Exception:
        return (
            f"প্রতিটি জিনিস আলাদা করে সবচেয়ে সস্তা বাজার থেকে কিনলে মোট খরচ হবে ৳{multi_market_total}। "
            f"এতে আপনার প্রায় ৳{savings_vs_blind} সাশ্রয় হবে।"
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
        product_en,
        current_price,
        predicted_price,
        "decrease",
        advice,
        product_bn=product_bn,
        market=market,
        change_pct=change_pct,
    )