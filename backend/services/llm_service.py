import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are MarketMind AI, a grocery price advisor for Bangladesh.
Your job is to explain price forecasts simply and honestly to ordinary citizens.
Always write 2-3 sentences in English, then the same in Bangla.
Never guarantee a specific price. Use words like "likely", "expected", "may".
Be specific — mention the product name and the actual price numbers."""

def explain_forecast(
    product_en: str,
    current_price: float,
    predicted_price: float,
    direction: str,
    advice: str
) -> str:
    prompt = f"""
Product: {product_en}
Today's average price: {current_price} BDT
Tomorrow's predicted price: {predicted_price} BDT
Expected direction: {direction}
Shopping advice: {advice}

Please explain this forecast simply in 2-3 sentences in English, then repeat in Bangla.
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt}
            ],
            max_tokens=300,
            temperature=0.4
        )
        return resp.choices[0].message.content
    except Exception as e:
        # Fallback rule-based explanation if Groq is unavailable
        change = abs(round(predicted_price - current_price, 2))
        if direction == "increase":
            return (
                f"{product_en} prices are expected to increase by about {change} BDT tomorrow "
                f"based on recent price trends. Consider buying today to avoid a higher price."
            )
        elif direction == "decrease":
            return (
                f"{product_en} prices may decrease slightly tomorrow. "
                f"You could wait 1-2 days to get a better price."
            )
        else:
            return (
                f"{product_en} prices are expected to remain stable around {current_price} BDT. "
                f"No urgency to buy or wait."
            )
