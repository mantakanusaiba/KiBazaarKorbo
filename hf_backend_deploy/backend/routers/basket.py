from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.basket_optimizer import optimize_basket
from services.llm_service import explain_basket_plan

router = APIRouter(tags=["basket"])


class BasketItem(BaseModel):
    product: str
    qty: float = Field(gt=0)


class BasketRequest(BaseModel):
    items: list[BasketItem]
    # Optional allow-list of market keys (e.g. all markets in the user's
    # selected division). When omitted, every market nationwide is
    # considered, same as before.
    markets: list[str] | None = None


@router.post("/basket/optimize")
def optimize(payload: BasketRequest):
    items = [item.model_dump() for item in payload.items]
    plan = optimize_basket(items, markets=payload.markets)

    if plan["items"]:
        try:
            plan["ai_summary"] = explain_basket_plan(
                items=plan["items"],
                multi_market_total=plan["multi_market_total"],
                single_market=plan["best_single_market"],
                savings_vs_blind=plan["savings_vs_shopping_blind"],
                wait_products=plan["wait_recommended_for"],
            )
        except Exception:
            plan["ai_summary"] = None

    return plan