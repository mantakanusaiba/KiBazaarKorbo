import json
import os
import re
import unicodedata
from difflib import get_close_matches
from typing import Any

import pandas as pd
from services.advice_engine import fair_price_check
from services.basket_optimizer import optimize_basket as run_optimize_basket
from services.data_service import get_default_market, get_price_history, load_data
from services.model_service import predict_range


AGENT_MODEL = os.getenv("GROQ_AGENT_MODEL", "openai/gpt-oss-120b")
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "45"))
MAX_TOOL_ROUNDS = int(os.getenv("GROQ_MAX_TOOL_ROUNDS", "2"))

DIVISION_ALIASES = {
    "chattogram": 1,
    "chittagong": 1,
    "চট্টগ্রাম": 1,
    "rajshahi": 2,
    "রাজশাহী": 2,
    "dhaka": 6,
    "ঢাকা": 6,
    "rangpur": 7,
    "রংপুর": 7,
}

PRODUCT_ALIASES = {
    "rice": "rice_boro_hybrid_medium",
    "chal": "rice_boro_hybrid_medium",
    "চাল": "rice_boro_hybrid_medium",
    "potato": "potato_local",
    "alu": "potato_local",
    "আলু": "potato_local",
    "onion": "onion_local",
    "peyaj": "onion_local",
    "পেয়াজ": "onion_local",
    "পেঁয়াজ": "onion_local",
    "egg": "egg_farm_red",
    "eggs": "egg_farm_red",
    "dim": "egg_farm_red",
    "ডিম": "egg_farm_red",
    "chicken": "broiler_chicken",
    "broiler": "broiler_chicken",
    "murgi": "broiler_chicken",
    "মুরগি": "broiler_chicken",
    "মুরগী": "broiler_chicken",
    "tomato": "tomato",
    "টমেটো": "tomato",
    "hilsha": "hilsha_500_900_gm",
    "ilish": "hilsha_500_900_gm",
    "ইলিশ": "hilsha_500_900_gm",
    "fish": "hilsha_500_900_gm",
    "green chili": "green_chili_local",
    "kacha morich": "green_chili_local",
    "কাঁচা মরিচ": "green_chili_local",
    "soybean oil": "soyabin_oil_1_lit_bottle",
    "soyabin oil": "soyabin_oil_1_lit_bottle",
    "oil": "soyabin_oil_1_lit_bottle",
    "তেল": "soyabin_oil_1_lit_bottle",
    "beef": "beef",
    "গরু": "beef",
    "mutton": "mutton_male",
    "খাসি": "mutton_male",
}

MARKET_ALIASES = {
    "karwan": "kawran_bazar",
    "kawran": "kawran_bazar",
    "কাওরান": "kawran_bazar",
    "কারওয়ান": "kawran_bazar",
    "mirpur": "mirpur_1_bazar",
    "মিরপুর": "mirpur_1_bazar",
    "mohammadpur": "mohammadpur_krishi_market",
    "মোহাম্মদপুর": "mohammadpur_krishi_market",
    "tangail": "tangail_bajar",
    "টাঙ্গাইল": "tangail_bajar",
    "narayanganj": "narayanganj_sadar_bajar",
    "নারায়ণগঞ্জ": "narayanganj_sadar_bajar",
}

# key -> Bangla display label, sourced from the frontend's marketRegions.js
# so the agent's chat replies use exactly the same Bangla names the user
# sees elsewhere in the app.
MARKET_NAME_BN = {
    "kawran_bazar": "কারওয়ান বাজার",
    "mirpur_1_bazar": "মিরপুর ১ বাজার",
    "mohammadpur_krishi_market": "মোহাম্মদপুর কৃষি মার্কেট",
    "narayanganj_sadar_bajar": "নারায়ণগঞ্জ সদর বাজার",
    "norshingdi_sadar_bajar": "নরসিংদী সদর বাজার",
    "manikganj_bajar": "মানিকগঞ্জ বাজার",
    "munshiganj_sadar_bajar": "মুন্সিগঞ্জ সদর বাজার",
    "tangail_bajar": "টাঙ্গাইল বাজার",
    "kishorganj_bajar": "কিশোরগঞ্জ বাজার",
    "faridpur_sadar_bajar": "ফরিদপুর সদর বাজার",
    "rajbari_sadar_bajar": "রাজবাড়ী সদর বাজার",
    "madaripur_sadar_bajar": "মাদারীপুর সদর বাজার",
    "shariyatpur_sadar_bajar": "শরীয়তপুর সদর বাজার",
    "gopalganj_sadar_borobajar": "গোপালগঞ্জ বড় বাজার",
    "chittagong_sadar_bazar": "চট্টগ্রাম সদর বাজার",
    "cox_bazar_sadar_bajar": "কক্সবাজার সদর বাজার",
    "feni_sadar_bajar": "ফেনী সদর বাজার",
    "noakhali_sadar_bajar": "নোয়াখালী সদর বাজার",
    "lakshmipur_sadar_bajar": "লক্ষ্মীপুর সদর বাজার",
    "rajshahi_sadar_bazar": "রাজশাহী সদর বাজার",
    "rangpur_city_bazar": "রংপুর সিটি বাজার",
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "Get 5 or 7 market-update-step price forecast for a product. Product and market can be natural names or standard keys.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {"type": "string", "description": "Product name/key. Prefer the romanized/English form or standard_key (e.g. onion, peyaj, hilsha, hilsha_500_900_gm) over typing Bangla script here, since Bangla script is more error-prone to generate correctly in a JSON argument."},
                    "market": {"type": "string", "description": "Optional market name/key, e.g. kawran_bazar, Mirpur, Karwan"},
                    "division": {"type": "string", "description": "Optional division name, e.g. Dhaka, Chattogram, Rajshahi, Rangpur"},
                    "days": {"type": ["integer", "string"], "description": "Forecast horizon in market update steps: 5 or 7"},
                },
                "required": ["product"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_market_comparison",
            "description": "Compare latest available DAM prices of one product across markets, optionally inside a division.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {"type": "string"},
                    "division": {"type": "string", "description": "Optional division filter"},
                    "max_markets": {"type": ["integer", "string"], "description": "Number of markets to return, 1-10"},
                },
                "required": ["product"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_basket",
            "description": "Find cheapest markets and timing advice for a shopping list. Use this when user asks for basket, budget, shopping plan, or cheapest market plan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product": {"type": "string", "description": "Product natural name or standard key"},
                                "qty": {"type": ["number", "string"], "description": "Quantity in the product's DAM unit"},
                            },
                            "required": ["product", "qty"],
                        },
                    },
                    "division": {"type": "string", "description": "Optional division filter, e.g. Dhaka"},
                },
                "required": ["items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fair_price_check",
            "description": "Check whether a paid price is below/within/above official latest DAM price range for a product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {"type": "string"},
                    "paid_price": {"type": ["number", "string"]},
                    "division": {"type": "string", "description": "Optional division filter"},
                },
                "required": ["product", "paid_price"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_price_history",
            "description": "Get historical average/min/max price trend for a product for the latest N days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product": {"type": "string"},
                    "days": {"type": ["integer", "string"], "description": "Number of days of history, 7-180"},
                },
                "required": ["product"],
            },
        },
    },
]

SYSTEM_PROMPT = """তুমি MarketMind AI-এর agentic shopping assistant।
তুমি বাংলাদেশের বাজারদর নিয়ে সাহায্য করবে।

গুরুত্বপূর্ণ নিয়ম:
1. tool call শুধু তখনই করবে যখন user সত্যি দাম, পূর্বাভাস, বাজার-তুলনা, fair-price, history/trend বা basket optimization চায়।
2. greeting, help, app explanation, thanks, random/general question হলে কোনো tool call করবে না — সরাসরি উত্তর দাও।
3. দাম, পূর্বাভাস, সাশ্রয়, বাজারের নাম বা অফিসিয়াল রেঞ্জ নিজে বানাবে না। data লাগলে tool call করবে।
4. forecast প্রশ্নে get_forecast ব্যবহার করো। latest/current/today price বা market comparison প্রশ্নে get_market_comparison ব্যবহার করো।
5. basket, cheapest shopping plan, budget list, family shopping plan প্রশ্নে optimize_basket ব্যবহার করো। যদি user item না দেয়, সাধারণ প্রয়োজনীয় পণ্য দিয়ে ছোট practical basket বানাও: rice_boro_hybrid_medium, potato_local, onion_local, egg_farm_red, broiler_chicken, green_chili_local।
6. "আমি কি ঠকেছি", "fair price", "overpaid", "x টাকায় কিনেছি" ধরনের প্রশ্নে fair_price_check ব্যবহার করো।
7. User স্পষ্টভাবে না বললে কখনো বলবে না যে user কোনো নির্দিষ্ট বাজার থেকে পণ্য কিনেছে। "bought/kinechen/কিনেছেন" শব্দ ব্যবহার করবে শুধু user নিজে কিনেছে বললে।
8. DAM weekend data gap থাকার কারণে exact calendar date নিয়ে জোর দেবে না। "সর্বশেষ পাওয়া DAM তথ্য", "পরের বাজার-হালনাগাদ" বলো।
9. উত্তর সবসময় শুধুমাত্র বাংলায় দেবে — user বাংলা, Banglish বা English যেভাবেই লিখুক না কেন, উত্তর কখনো ইংরেজিতে দেবে না। সংখ্যা বাংলা অঙ্কে লিখবে (০-৯)। উত্তর সংক্ষিপ্ত, ব্যবহারযোগ্য এবং সাধারণ মানুষের ভাষায় হবে।
10. tool result-এ error থাকলে সরাসরি বলো কোন তথ্য পাওয়া যায়নি, অনুমান করো না।
"""

SAFE_DETERMINISTIC_FINALS = os.getenv("AGENT_SAFE_DETERMINISTIC_FINALS", "1").strip().lower() not in {"0", "false", "no"}

GREETING_RE = re.compile(r"^(hi+|hello+|hey+|hii+|হাই|হ্যালো|আসসালামু আলাইকুম|salam|সালাম)[!?.।\s]*$", re.I)
THANKS_RE = re.compile(r"^(thanks|thank you|tnx|ধন্যবাদ|শুকরিয়া|ok|okay|ঠিক আছে)[!?.।\s]*$", re.I)

DATA_INTENT_WORDS = {
    "price", "prices", "dam", "rate", "cost", "today", "todays", "current", "latest",
    "forecast", "predict", "prediction", "tomorrow", "increase", "decrease", "rise", "drop",
    "market", "bazar", "bazaar", "cheap", "cheapest", "compare", "comparison",
    "fair", "overpaid", "bought", "buy", "shopping", "basket", "budget", "history", "trend",
    "দাম", "আজ", "বর্তমান", "সর্বশেষ", "পূর্বাভাস", "কাল", "বাড়বে", "কমবে", "বাজার",
    "সস্তা", "কম", "তুলনা", "ঠকেছি", "কিনেছি", "কেনা", "বাজেট", "তালিকা", "ইতিহাস", "ট্রেন্ড",
    # Banglish/Roman-Bangla intent words
    "aj", "aaj", "ajk", "ajke", "kal", "kalk", "kalke", "agamikal",
    "dam", "daam", "koto", "taka", "tk", "bazar", "bazaar",
    "kinbo", "kinle", "kinte", "kena", "valo", "bhalo", "vhalo", "hobe", "naki", "uchit",
    "barbe", "kombe", "barbe?", "kombe?",
}

GENERAL_HELP_PATTERNS = [
    "what can you do", "what do you do", "how can you help", "help me", "who are you",
    "about marketmind", "how to use", "features", "কি করতে পার", "কী করতে পার",
    "সাহায্য", "তুমি কে", "কিভাবে ব্যবহার", "কীভাবে ব্যবহার",
]

# Common Banglish/Roman-Bangla words users type in chat.
# These are important because queries like
# "tomato ki ajk kinle valo hobe naki kalke kinle" are real forecast/buy-timing
# questions even though they do not contain Bangla script.
ROMAN_BN_WORDS = {
    "ki", "kita", "kemon", "koto", "koto taka", "tk", "taka",
    "aj", "aaj", "ajk", "ajke", "aijke", "today",
    "kal", "kalk", "kalke", "agamikal", "tomorrow",
    "kinbo", "kinle", "kine", "kinen", "kena", "kinte", "buy", "bought",
    "valo", "bhalo", "vhalo", "better", "uchit", "hobe", "naki", "na ki",
    "barbe", "barbe?", "kombe", "kombe?", "dam", "daam", "bazar", "bazaar",
}

BUY_TIMING_WORDS = {
    "buy", "buying", "should i buy", "better to buy", "wait",
    "kinbo", "kinle", "kinte", "kena", "kine", "kinbo?",
    "valo", "bhalo", "vhalo", "uchit", "hobe", "naki",
    "আজ কিন", "আজকে কিন", "কাল কিন", "কেনা ভালো", "কেনা উচিত", "অপেক্ষা",
}

TIME_COMPARE_WORDS = {
    "today", "tomorrow", "aj", "aaj", "ajk", "ajke", "kal", "kalk", "kalke", "agamikal",
    "আজ", "আজকে", "কাল", "আগামীকাল", "পরের", "next",
}

_BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")


def _bn_digits(text: Any) -> str:
    """Convert any ASCII digits in a string to Bangla numerals."""
    return str(text).translate(_BN_DIGITS)


def _bn_date(value: Any) -> str:
    """Format a YYYY-MM-DD date string with Bangla numerals (DD-MM-YYYY).
    Falls back to Bangla-ifying whatever digits are present if the format
    doesn't match."""
    text = str(value or "").strip()
    if not text:
        return "তারিখ নেই"
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", text)
    if m:
        y, mo, d = m.groups()
        text = f"{d}-{mo}-{y}"
    return _bn_digits(text)


def _has_bangla(text: str) -> bool:
    return bool(re.search(r"[ঀ-৿]", text or ""))


def _wants_bangla(text: str) -> bool:
    # Policy: the assistant always answers in Bangla, no matter whether the
    # user wrote Bangla, Banglish, or English. Kept as a function (instead of
    # inlining True at every call site) so the reply-language rule lives in
    # exactly one place.
    return True


def _contains_product_hint(text: str) -> bool:
    n = _norm(text)
    for alias in PRODUCT_ALIASES:
        if _norm(alias) and _norm(alias) in n:
            return True
    return False


def _looks_like_data_request(text: str) -> bool:
    raw = str(text or "").strip()
    if not raw:
        return False
    lower = raw.lower()
    if "৳" in raw or re.search(r"\b\d+(?:\.\d+)?\s*(tk|taka|bdt|kg|kg|কেজি|টাকা)\b", lower):
        return True
    if any(word in lower for word in DATA_INTENT_WORDS):
        return True
    if any(word in raw for word in DATA_INTENT_WORDS):
        return True
    # Product alone is ambiguous, not a data request. Ask a clarification instead of wasting a tool call.
    return False


def _looks_like_buy_timing_request(text: str) -> bool:
    """Detect forecast/advice questions written in Banglish/Bangla/English.

    Examples:
    - tomato ki ajk kinle valo hobe naki kalke kinle
    - আজ পেঁয়াজ কিনব নাকি কাল?
    - should I buy tomato today or wait till tomorrow
    """
    raw = str(text or "").strip()
    if not raw or not _contains_product_hint(raw):
        return False
    lower = raw.lower()
    has_buy_word = any(w in lower for w in BUY_TIMING_WORDS) or any(w in raw for w in BUY_TIMING_WORDS)
    has_time_word = any(w in lower for w in TIME_COMPARE_WORDS) or any(w in raw for w in TIME_COMPARE_WORDS)
    # If the user mentions a product plus today/tomorrow/buy/wait language, it is a forecast question.
    return has_buy_word and has_time_word


def _extract_division_from_text(text: str) -> str | None:
    raw = str(text or "")
    n = _norm(raw)
    for alias in DIVISION_ALIASES:
        if _norm(alias) and _norm(alias) in n:
            return alias
    return None


def _direct_tool_reply(user_message: str) -> dict | None:
    """Handle obvious tool intents before the LLM.

    This avoids the LLM asking unnecessary clarification for common Banglish questions
    like: "tomato ki ajk kinle valo hobe naki kalke kinle?".
    """
    if _looks_like_buy_timing_request(user_message):
        division = _extract_division_from_text(user_message)
        result = tool_get_forecast(product=user_message, market=None, division=division, days=7)
        tool_results = [{"tool": "get_forecast", "args": {"product": user_message, "division": division, "days": 7}, "result": result}]
        final = _safe_final_answer(user_message, tool_results)
        return {
            "answer": final or "এই পণ্যের পূর্বাভাস পাওয়া যায়নি।",
            "tool_results": tool_results,
            "model": "deterministic-intent-router",
        }
    return None


def _non_tool_reply(user_message: str) -> str | None:
    raw = str(user_message or "").strip()
    if not raw:
        return "আপনি কী জানতে চান?"

    lower = raw.lower()

    if GREETING_RE.match(raw):
        return "হ্যালো! আমি MarketMind AI। দাম, পূর্বাভাস, ঠিক দাম যাচাই, বাজার তুলনা বা বাজার তালিকার পরিকল্পনা জানতে চাইলে লিখুন—প্রয়োজন হলে আমি ডেটা দেখে উত্তর দেব।"

    if THANKS_RE.match(raw):
        return "স্বাগতম!"

    if any(p in lower or p in raw for p in GENERAL_HELP_PATTERNS):
        return (
            "আমি আপনার বাজারদর সহকারী। আমি পাঁচ ধরনের কাজে সাহায্য করতে পারি: আজকের/সর্বশেষ দাম, দামের পূর্বাভাস, কোন বাজারে কম দাম, আপনি বেশি দাম দিয়েছেন কি না, এবং বাজেট অনুযায়ী বাজার তালিকার পরিকল্পনা। উদাহরণ: 'ঢাকায় পেঁয়াজের দাম কত?' বা 'আমি ৮০ টাকায় পেঁয়াজ কিনেছি, ঠকেছি?'"
        )

    if _contains_product_hint(raw) and not _looks_like_data_request(raw):
        return f"{raw} নিয়ে আপনি কী জানতে চান—সর্বশেষ দাম, পূর্বাভাস, সবচেয়ে সস্তা বাজার, নাকি ঠিক দাম যাচাই?"

    if not _looks_like_data_request(raw):
        return "এই প্রশ্নের জন্য বাজারদর ডেটার প্রয়োজন নেই। আপনি দাম, পূর্বাভাস, ঠিক দাম যাচাই, বাজার তুলনা বা বাজার তালিকার পরিকল্পনা জানতে চাইলে পণ্য/বাজারসহ লিখুন।"

    return None


def _money(value: Any) -> str:
    try:
        v = float(value)
        formatted = f"{v:,.2f}" if abs(v - round(v)) > 1e-9 else f"{v:,.0f}"
        return f"৳{_bn_digits(formatted)}"
    except Exception:
        return "তথ্য নেই"


def _pretty_market(value: Any) -> str:
    raw = str(value or "")
    key = _norm(raw)
    for market_key, bn_label in MARKET_NAME_BN.items():
        if _norm(market_key) == key:
            return bn_label
    # Fallback for any market key not yet in the map above.
    text = raw or "অজানা বাজার"
    return text.replace("_", " ").title().replace("Bajar", "Bazar")


def _pretty_division(value: Any) -> str:
    if value is None:
        return ""
    n = _norm(value)
    if n in {_norm("dhaka"), _norm("ঢাকা"), "6"}:
        return "ঢাকা"
    if n in {_norm("chattogram"), _norm("chittagong"), _norm("চট্টগ্রাম"), "1"}:
        return "চট্টগ্রাম"
    if n in {_norm("rajshahi"), _norm("রাজশাহী"), "2"}:
        return "রাজশাহী"
    if n in {_norm("rangpur"), _norm("রংপুর"), "7"}:
        return "রংপুর"
    return str(value).strip().title()


def _direction_word(change: float | None) -> str:
    if change is None:
        return "পরিবর্তন অনিশ্চিত"
    if change > 2:
        return "বাড়তে পারে"
    if change < -2:
        return "কমতে পারে"
    return "প্রায় স্থিতিশীল থাকতে পারে"


_ERROR_TRANSLATIONS = [
    (re.compile(r"product not found", re.I), "পণ্যটি খুঁজে পাওয়া যায়নি"),
    (re.compile(r"no market found for", re.I), "এই পণ্যের জন্য কোনো বাজার পাওয়া যায়নি"),
    (re.compile(r"no latest market data found", re.I), "এই পণ্য বা বিভাগের জন্য সাম্প্রতিক বাজারদর পাওয়া যায়নি"),
    (re.compile(r"no official price range found", re.I), "অফিসিয়াল দামের রেঞ্জ পাওয়া যায়নি"),
    (re.compile(r"no valid basket products found", re.I), "ফর্দের কোনো বৈধ পণ্য খুঁজে পাওয়া যায়নি"),
    (re.compile(r"days must be one of", re.I), "দিনের সংখ্যা সঠিক নয়"),
    (re.compile(r"no trained model for", re.I), "এই পণ্যের জন্য কোনো প্রশিক্ষিত পূর্বাভাস মডেল নেই"),
    (re.compile(r"unknown market", re.I), "এই নামে কোনো বাজার পাওয়া যায়নি"),
    (re.compile(r"not enough history for", re.I), "পূর্বাভাসের জন্য পর্যাপ্ত পুরনো তথ্য নেই"),
    (re.compile(r"no trained horizons", re.I), "এই সময়সীমার জন্য কোনো পূর্বাভাস মডেল নেই"),
    (re.compile(r"unknown tool", re.I), "সিস্টেমে একটা কারিগরি সমস্যা হয়েছে"),
    (re.compile(r"tool failed", re.I), "তথ্য আনতে একটা কারিগরি সমস্যা হয়েছে"),
]


def _translate_error_bn(err: str, product_hint: str | None = None) -> str:
    """Turn an internal (often English) tool error into a clean Bangla-only
    sentence, so no raw English ever leaks into a user-facing answer."""
    text = str(err or "")
    for pattern, bn_text in _ERROR_TRANSLATIONS:
        if pattern.search(text):
            if product_hint:
                return f"{product_hint}: {bn_text}।"
            return f"{bn_text}।"
    # Unknown/unrecognized error shape: never show the raw text, just a
    # generic Bangla apology so English never leaks through.
    if product_hint:
        return f"দুঃখিত, {product_hint} সম্পর্কে এই মুহূর্তে তথ্য পাওয়া যাচ্ছে না।"
    return "দুঃখিত, এই মুহূর্তে প্রয়োজনীয় তথ্য পাওয়া যাচ্ছে না।"


def _format_one_tool_answer(user_message: str, item: dict) -> str | None:
    tool = item.get("tool")
    result = item.get("result") or {}

    if not result.get("ok", True) or result.get("error"):
        err = result.get("error", "No data found")
        product_hint = result.get("product_bn") or result.get("product_en") or result.get("product")
        return _translate_error_bn(err, product_hint)

    product = result.get("product_bn") or result.get("product") or "পণ্য"

    if tool == "get_market_comparison":
        markets = result.get("markets") or []
        division = result.get("division")
        if not markets:
            return f"{product}–এর সর্বশেষ বাজারদর পাওয়া যায়নি।"
        top = markets[:5]
        area = f"{_pretty_division(division)} বিভাগে" if division else "উপলব্ধ বাজারগুলোতে"
        lines = [f"{area} {product}–এর সর্বশেষ পাওয়া দাম:"]
        for r in top:
            raw_date = r.get("date")
            date_txt = _bn_date(raw_date) if raw_date else "সর্বশেষ পাওয়া তথ্য"
            lines.append(
                f"• {_pretty_market(r.get('market'))}: {_money(r.get('min_price'))}–{_money(r.get('max_price'))}, গড় {_money(r.get('avg_price'))} (তারিখ: {date_txt})"
            )
        cheapest = result.get("cheapest_market") or top[0]
        lines.append(f"সবচেয়ে কম গড় দাম এখন {_pretty_market(cheapest.get('market'))}–এ দেখা যাচ্ছে।")
        if division and _norm(division) in {_norm("dhaka"), _norm("ঢাকা")}:
            lines.append("নোট: এখানে 'ঢাকা' বলতে ডেটাসেটের ঢাকা বিভাগ বোঝানো হয়েছে; ঢাকা শহরের নির্দিষ্ট বাজার চাইলে বাজারের নাম লিখুন।")
        return "\n".join(lines)

    if tool == "get_forecast":
        market = _pretty_market(result.get("market"))
        current = result.get("current_avg")
        forecast = result.get("forecast") or []
        first = forecast[0] if forecast else {}
        change = _safe_float(first.get("change_pct"))
        change_txt = _bn_digits(f"{change:+.2f}%") if change is not None else "তথ্য নেই"
        pred = first.get("predicted_price")
        low = first.get("predicted_low")
        high = first.get("predicted_high")
        rain = first.get("rainfall_mm")
        temp = first.get("temp_avg_c")
        weekend = first.get("is_weekend")
        festival = first.get("is_festival")

        calendar_bits = []
        if weekend:
            calendar_bits.append("সাপ্তাহিক ছুটির প্রভাব থাকতে পারে")
        if festival:
            calendar_bits.append("উৎসবের প্রভাব থাকতে পারে")
        calendar_txt = "। ".join(calendar_bits) if calendar_bits else "বড় ছুটি বা উৎসবের ইঙ্গিত নেই"

        if change is not None and change > 2:
            decision = "আজ/সর্বশেষ দামে দরকার হলে কিনে নেওয়াই ভালো, কারণ পরের বাজার-হালনাগাদে দাম বাড়ার ইঙ্গিত আছে।"
        elif change is not None and change < -2:
            decision = "খুব জরুরি না হলে পরের বাজার-হালনাগাদ পর্যন্ত অপেক্ষা করলে ভালো হতে পারে, কারণ দাম কমার ইঙ্গিত আছে।"
        else:
            decision = "আজ কিনলেও বা পরের হালনাগাদ পর্যন্ত অপেক্ষা করলেও বড় পার্থক্য নাও হতে পারে।"

        rain_txt = _bn_digits(f"{rain} মিমি") if rain is not None else "তথ্য নেই"
        temp_txt = _bn_digits(f"{temp}°সে") if temp is not None else "তথ্য নেই"

        return (
            f"হ্যাঁ, আমি পূর্বাভাস দেখে বলছি। {product}–এর সর্বশেষ গড় দাম {market} বাজারে {_money(current)}।\n"
            f"পরের বাজার-হালনাগাদে মডেলের পূর্বাভাস {_money(pred)} — দাম {_direction_word(change)} ({change_txt})।\n"
            f"আবহাওয়া ও প্রেক্ষাপট: বৃষ্টিপাত প্রায় {rain_txt}, তাপমাত্রা প্রায় {temp_txt}। {calendar_txt}। পূর্বাভাসের অনিশ্চয়তা: {_money(low)}–{_money(high)}।\n"
            f"সিদ্ধান্ত: {decision}"
        )

    if tool == "fair_price_check":
        paid = result.get("paid_price")
        lo = result.get("official_min")
        hi = result.get("official_max")
        if result.get("verdict") == "above_range":
            verdict = "আপনি অফিসিয়াল রেঞ্জের চেয়ে বেশি দাম দিয়েছেন বলে মনে হচ্ছে।"
        elif result.get("verdict") == "below_range":
            verdict = "আপনি অফিসিয়াল রেঞ্জের চেয়ে কম দামে পেয়েছেন — ভালো দর।"
        else:
            verdict = "দামটি অফিসিয়াল রেঞ্জের মধ্যে আছে — ঠিক দাম।"
        return f"{product}: আপনি দিয়েছেন {_money(paid)}। অফিসিয়াল সর্বশেষ রেঞ্জ {_money(lo)}–{_money(hi)}। {verdict}"

    if tool == "optimize_basket":
        best = result.get("best_single_market") or {}
        items = result.get("items") or []
        unresolved = result.get("unresolved_products") or result.get("unresolved_input") or []
        resolved_items = result.get("resolved_items") or []

        # Map internal standard_key -> Bangla display name, so line items
        # never show raw snake_case keys like "rice_boro_hybrid_medium".
        key_to_bn = {r.get("product"): r.get("product_bn") for r in resolved_items if r.get("product")}

        def _item_label(raw_key: str) -> str:
            return key_to_bn.get(raw_key) or _product_display(raw_key).get("product_bn") or raw_key

        lines = ["আপনার বাজার তালিকার পরিকল্পনা:"]
        if best:
            cov = best.get("covers_n_of")
            if best.get("covers_all_items"):
                cover_txt = "সব পণ্য পাওয়া যায়"
            elif cov:
                cover_txt = _bn_digits(f"{cov[0]}/{cov[1]} পণ্য পাওয়া যায়")
            else:
                cover_txt = "আংশিকভাবে পাওয়া যায়"
            lines.append(f"• সেরা একক বাজার: {_pretty_market(best.get('market'))} — মোট প্রায় {_money(best.get('total'))} ({cover_txt})")
        for it in items[:6]:
            product_label = _item_label(it.get("product"))
            lines.append(f"• {product_label}: {_pretty_market(it.get('best_market'))}, প্রতি একক গড় দাম {_money(it.get('best_price'))}, লাইন মোট {_money(it.get('line_total'))}")
        if unresolved:
            lines.append(f"ডেটা পাওয়া যায়নি: {', '.join(map(str, unresolved))}")
        return "\n".join(lines)

    if tool == "get_price_history":
        history = result.get("history") or []
        if len(history) < 2:
            return f"{product}–এর যথেষ্ট পুরনো তথ্য নেই।"
        first, last = history[0], history[-1]
        diff = (_safe_float(last.get("avg_price")) or 0) - (_safe_float(first.get("avg_price")) or 0)
        diff_txt = _bn_digits(f"{diff:+.2f}")
        days_txt = _bn_digits(str(result.get("days")))
        return f"গত {days_txt} দিনের {product}–এর প্রবণতা: গড় দাম {_bn_date(first.get('date'))}–এ {_money(first.get('avg_price'))} থেকে সর্বশেষ {_money(last.get('avg_price'))} হয়েছে; পরিবর্তন {diff_txt} টাকা।"

    return None


def _safe_final_answer(user_message: str, tool_results: list[dict]) -> str | None:
    if not tool_results:
        return None
    parts = []
    for item in tool_results:
        part = _format_one_tool_answer(user_message, item)
        if part:
            parts.append(part)
    return "\n\n".join(parts) if parts else None


def _get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq
        return Groq(api_key=api_key, timeout=GROQ_TIMEOUT_SECONDS)
    except Exception:
        return None


def _norm(text: Any) -> str:
    # NFC-normalize first: Bangla has multiple valid Unicode encodings for
    # the same visible character (e.g. a precomposed letter vs. a base
    # letter + combining nukta/vowel-sign pair that renders identically).
    # Without this, correctly-spelled Bangla text from the LLM or the user
    # can silently fail to match aliases/catalog entries stored in a
    # different (but visually identical) normalization form.
    raw = unicodedata.normalize("NFC", str(text or ""))
    return re.sub(r"[\s_\-()/.`'\"]+", "", raw.strip().lower())



def _safe_float(value: Any) -> float | None:
    try:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return None
        return float(value)
    except Exception:
        return None


def _sanitize(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, (pd.Timestamp,)):
        return obj.strftime("%Y-%m-%d")
    if isinstance(obj, float) and (pd.isna(obj) or obj == float("inf") or obj == float("-inf")):
        return None
    return obj


def _division_id(division: str | None) -> int | None:
    if not division:
        return None
    n = _norm(division)
    for key, did in DIVISION_ALIASES.items():
        if _norm(key) in n or n in _norm(key):
            return did
    try:
        return int(division)
    except Exception:
        return None


def _markets_for_division(division: str | None) -> list[str] | None:
    did = _division_id(division)
    if did is None:
        return None
    df = load_data()
    return sorted(df[df["division_id"] == did]["market"].dropna().unique().tolist())


def _catalog() -> pd.DataFrame:
    df = load_data()
    return df[["standard_key", "product_en", "product_bn"]].dropna(subset=["standard_key"]).drop_duplicates("standard_key")


def resolve_product(product: str) -> str | None:
    if not product:
        return None
    raw = str(product).strip()
    n = _norm(raw)

    for alias, key in PRODUCT_ALIASES.items():
        if _norm(alias) == n or _norm(alias) in n:
            return key

    cat = _catalog()
    keys = cat["standard_key"].astype(str).tolist()
    for key in keys:
        if _norm(key) == n:
            return key

    # Strong substring match against English/Bangla labels and standard_key.
    for _, row in cat.iterrows():
        hay = " ".join(str(row.get(c, "")) for c in ["standard_key", "product_en", "product_bn"])
        if n and n in _norm(hay):
            return str(row["standard_key"])

    # Fuzzy match against ASCII standard_key AND against Bangla/English display
    # names and known aliases. This matters because the LLM sometimes writes
    # the Bangla product name with a single corrupted character (e.g. a stray
    # digit swapped in for a diacritic) — the exact/substring matches above
    # miss that, but a close-match comparison against the real Bangla label
    # still catches it.
    candidates: dict[str, str] = {}
    for key in keys:
        candidates[_norm(key)] = key
    for _, row in cat.iterrows():
        key = str(row["standard_key"])
        for col in ("product_en", "product_bn"):
            val = row.get(col)
            if val:
                candidates.setdefault(_norm(val), key)
    for alias, key in PRODUCT_ALIASES.items():
        candidates.setdefault(_norm(alias), key)

    close = get_close_matches(n, list(candidates.keys()), n=1, cutoff=0.74)
    if close:
        return candidates[close[0]]
    return None


def _product_display(product_key: str) -> dict:
    cat = _catalog()
    row = cat[cat["standard_key"] == product_key]
    if row.empty:
        return {"product": product_key, "product_en": product_key, "product_bn": product_key}
    r = row.iloc[0]
    return {
        "product": product_key,
        "product_en": str(r.get("product_en") or product_key),
        "product_bn": str(r.get("product_bn") or r.get("product_en") or product_key),
    }


def resolve_market(market: str | None, product_key: str | None = None, division: str | None = None) -> str | None:
    df = load_data()
    markets = df["market"].dropna().unique().tolist()
    division_markets = _markets_for_division(division)
    if division_markets:
        markets = [m for m in markets if m in division_markets]

    if market:
        n = _norm(market)
        for alias, key in MARKET_ALIASES.items():
            if _norm(alias) in n and key in markets:
                return key
        for m in markets:
            if _norm(m) == n or n in _norm(m):
                return m
        close = get_close_matches(n, [_norm(m) for m in markets], n=1, cutoff=0.72)
        if close:
            for m in markets:
                if _norm(m) == close[0]:
                    return m

    if product_key:
        # Choose the freshest market for this product, optionally restricted by division.
        sub = df[df["standard_key"] == product_key]
        if division_markets:
            sub = sub[sub["market"].isin(division_markets)]
        if not sub.empty:
            latest = sub["date"].max()
            latest_markets = sub[sub["date"] == latest]["market"].dropna().unique().tolist()
            if latest_markets:
                counts = sub[sub["market"].isin(latest_markets)]["market"].value_counts()
                return str(counts.idxmax())

    return get_default_market(product_key) if product_key else None


def _latest_rows_for_product(product_key: str, division: str | None = None) -> pd.DataFrame:
    df = load_data()
    sub = df[df["standard_key"] == product_key].copy()
    markets = _markets_for_division(division)
    if markets:
        sub = sub[sub["market"].isin(markets)]
    if sub.empty:
        return sub
    latest_per_market = sub.groupby("market")["date"].transform("max")
    return sub[sub["date"] == latest_per_market].copy()


def tool_get_forecast(product: str, market: str | None = None, division: str | None = None, days: int = 7) -> dict:
    product_key = resolve_product(product)
    if not product_key:
        return {"ok": False, "error": f"Product not found: {product}"}
    days = 5 if int(days or 7) == 5 else 7
    market_key = resolve_market(market, product_key=product_key, division=division)
    if not market_key:
        return {"ok": False, "error": f"No market found for {product_key}"}

    result = predict_range(product_key, market_key, days=days)
    if "error" in result:
        return {"ok": False, **result, **_product_display(product_key), "market": market_key}
    return _sanitize({"ok": True, **_product_display(product_key), **result})


def tool_get_market_comparison(product: str, division: str | None = None, max_markets: int = 6) -> dict:
    product_key = resolve_product(product)
    if not product_key:
        return {"ok": False, "error": f"Product not found: {product}"}
    rows = _latest_rows_for_product(product_key, division=division)
    if rows.empty:
        return {"ok": False, **_product_display(product_key), "error": "No latest market data found for this product/division."}
    rows = rows[["market", "date", "min_price", "max_price", "avg_price"]].sort_values("avg_price")
    records = rows.head(max(1, min(int(max_markets or 6), 10))).round(2).to_dict(orient="records")
    return _sanitize({
        "ok": True,
        **_product_display(product_key),
        "division": division,
        "markets": records,
        "cheapest_market": records[0] if records else None,
    })


def tool_optimize_basket(items: list[dict], division: str | None = None) -> dict:
    resolved = []
    unresolved = []
    for item in items or []:
        product_key = resolve_product(item.get("product", ""))
        qty = _safe_float(item.get("qty", 1)) or 1
        if product_key:
            resolved.append({"product": product_key, "qty": max(qty, 0.01)})
        else:
            unresolved.append(item.get("product"))

    if not resolved:
        return {"ok": False, "error": "No valid basket products found.", "unresolved_input": unresolved}

    markets = _markets_for_division(division)
    plan = run_optimize_basket(resolved, markets=markets)
    return _sanitize({
        "ok": True,
        "division": division,
        "resolved_items": [_product_display(i["product"]) | {"qty": i["qty"]} for i in resolved],
        "unresolved_input": unresolved,
        **plan,
    })


def tool_fair_price_check(product: str, paid_price: float, division: str | None = None) -> dict:
    product_key = resolve_product(product)
    if not product_key:
        return {"ok": False, "error": f"Product not found: {product}"}
    rows = _latest_rows_for_product(product_key, division=division)
    if rows.empty:
        return {"ok": False, **_product_display(product_key), "error": "No official price range found."}

    official_min = float(rows["min_price"].mean())
    official_max = float(rows["max_price"].mean())
    paid = float(paid_price)
    verdict = fair_price_check(paid, official_min, official_max)
    return _sanitize({
        "ok": True,
        **_product_display(product_key),
        "paid_price": round(paid, 2),
        "official_min": round(official_min, 2),
        "official_max": round(official_max, 2),
        "division": division,
        **verdict,
    })


def tool_get_price_history(product: str, days: int = 90) -> dict:
    product_key = resolve_product(product)
    if not product_key:
        return {"ok": False, "error": f"Product not found: {product}"}
    days = max(7, min(int(days or 90), 180))
    history = get_price_history(product_key, days=days)
    return _sanitize({"ok": True, **_product_display(product_key), "days": days, "history": history[-30:]})


TOOL_IMPL = {
    "get_forecast": tool_get_forecast,
    "get_market_comparison": tool_get_market_comparison,
    "optimize_basket": tool_optimize_basket,
    "fair_price_check": tool_fair_price_check,
    "get_price_history": tool_get_price_history,
}


def _tool_message(tool_call: Any, result: dict) -> dict:
    return {
        "role": "tool",
        "tool_call_id": getattr(tool_call, "id", None) or tool_call.get("id"),
        "content": json.dumps(result, ensure_ascii=False),
    }


def _assistant_message_dict(message: Any) -> dict:
    if hasattr(message, "model_dump"):
        return message.model_dump(exclude_none=True)
    if isinstance(message, dict):
        return {k: v for k, v in message.items() if v is not None}
    data = {"role": "assistant", "content": getattr(message, "content", None)}
    tool_calls = getattr(message, "tool_calls", None)
    if tool_calls:
        data["tool_calls"] = tool_calls
    return {k: v for k, v in data.items() if v is not None}


def _fallback_no_llm(user_message: str) -> dict:
    return {
        "answer": "AI সহকারী চালু করতে backend/.env ফাইলে GROQ_API_KEY দিতে হবে। এদিকে ফোরকাস্ট, বাজার তালিকা, ঠিক দাম পেজগুলো তবুও কাজ করবে।",
        "tool_results": [],
        "model": None,
    }


def _fallback_runtime_error(error: Exception, tool_results: list[dict] | None = None) -> dict:
    return {
        "answer": (
            "AI সহকারীর সাথে সংযোগে সাময়িক সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন, অথবা সার্ভারের GROQ_AGENT_MODEL সেটিং ঠিক আছে কি না দেখুন।"
        ),
        "tool_results": tool_results or [],
        "model": AGENT_MODEL,
    }


def chat_with_agent(user_message: str, history: list[dict] | None = None) -> dict:
    quick_reply = _non_tool_reply(user_message)
    if quick_reply is not None:
        return {
            "answer": quick_reply,
            "tool_results": [],
            "model": None,
        }

    direct = _direct_tool_reply(user_message)
    if direct is not None:
        return direct

    client = _get_client()
    if client is None:
        return _fallback_no_llm(user_message)

    safe_history = []
    for msg in (history or [])[-8:]:
        role = msg.get("role")
        content = str(msg.get("content", ""))[:1200]
        if role in {"user", "assistant"} and content:
            safe_history.append({"role": role, "content": content})

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}, *safe_history, {"role": "user", "content": user_message}]
    tool_results: list[dict] = []

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = client.chat.completions.create(
                model=AGENT_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=450,
            )
        except Exception as e:
            # The model occasionally emits a malformed tool call (e.g. a
            # numeric argument as the wrong JSON type), which Groq rejects
            # with a 400 before we ever see the tool_calls. This is usually
            # a one-off stochastic slip, not a persistent failure, so retry
            # once before giving up and surfacing an error to the user.
            try:
                response = client.chat.completions.create(
                    model=AGENT_MODEL,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    temperature=0.1,
                    max_tokens=450,
                )
            except Exception:
                return _fallback_runtime_error(e, tool_results)
        message = response.choices[0].message
        tool_calls = getattr(message, "tool_calls", None)

        if not tool_calls:
            return {
                "answer": (message.content or "").strip(),
                "tool_results": tool_results,
                "model": AGENT_MODEL,
            }

        messages.append(_assistant_message_dict(message))
        for call in tool_calls:
            fn = getattr(call, "function", None)
            name = getattr(fn, "name", None) if fn else None
            raw_args = getattr(fn, "arguments", "{}") if fn else "{}"
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except Exception:
                args = {}

            impl = TOOL_IMPL.get(name)
            if not impl:
                result = {"ok": False, "error": f"Unknown tool: {name}"}
            else:
                try:
                    result = impl(**args)
                except Exception as e:
                    result = {"ok": False, "error": f"Tool failed: {name}: {e}"}

            tool_results.append({"tool": name, "args": args, "result": result})
            messages.append(_tool_message(call, result))

        if SAFE_DETERMINISTIC_FINALS:
            final = _safe_final_answer(user_message, tool_results)
            if final:
                return {
                    "answer": final,
                    "tool_results": tool_results,
                    "model": AGENT_MODEL,
                }

    # Last chance: force final synthesis from gathered tool results.
    messages.append({
        "role": "user",
        "content": "এখন আর tool call করো না। আগের tool result ব্যবহার করে চূড়ান্ত উত্তর বাংলায় দাও, সংখ্যা বাংলা অঙ্কে লিখো।",
    })
    try:
        response = client.chat.completions.create(
            model=AGENT_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=450,
        )
        final_answer = (response.choices[0].message.content or "").strip()
    except Exception as e:
        return _fallback_runtime_error(e, tool_results)

    return {
        "answer": final_answer,
        "tool_results": tool_results,
        "model": AGENT_MODEL,
    }