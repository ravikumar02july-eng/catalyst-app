import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from breeze_connect import BreezeConnect
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Catalyst Breeze Read-only Market Data API", version="0.1.0")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Breeze credentials belong only on this server, never in the Expo bundle.
BREEZE_API_KEY = os.getenv("BREEZE_API_KEY", "").strip()
BREEZE_API_SECRET = os.getenv("BREEZE_API_SECRET", "").strip()
BREEZE_SESSION_TOKEN = os.getenv("BREEZE_SESSION_TOKEN", "").strip()

# These are NSE cash-market symbols from the app's starter watchlist.
SYMBOL_NAMES = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy Services",
    "INFY": "Infosys",
    "HDFCBANK": "HDFC Bank",
}


def number(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if parsed == parsed else default
    except (TypeError, ValueError):
        return default


@lru_cache(maxsize=1)
def breeze_client() -> BreezeConnect:
    missing = [
        name for name, value in (
            ("BREEZE_API_KEY", BREEZE_API_KEY),
            ("BREEZE_API_SECRET", BREEZE_API_SECRET),
            ("BREEZE_SESSION_TOKEN", BREEZE_SESSION_TOKEN),
        ) if not value
    ]
    if missing:
        raise HTTPException(status_code=503, detail=f"Backend is missing configuration: {', '.join(missing)}")

    client = BreezeConnect(api_key=BREEZE_API_KEY)
    try:
        client.generate_session(api_secret=BREEZE_API_SECRET, session_token=BREEZE_SESSION_TOKEN)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Breeze session initialization failed. Check server credentials/session token.") from exc
    return client


def success_rows(response: Any) -> list[dict[str, Any]]:
    if not isinstance(response, dict):
        return []
    rows = response.get("Success") or response.get("success") or []
    return rows if isinstance(rows, list) else []


def fetch_symbol(client: BreezeConnect, symbol: str) -> dict[str, Any]:
    quote_response = client.get_quotes(
        stock_code=symbol,
        exchange_code="NSE",
        product_type="cash",
    )
    quotes = success_rows(quote_response)
    if not quotes:
        raise ValueError(f"No quote returned for {symbol}")
    quote = quotes[0]

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=60)
    candles_response = client.get_historical_data(
        interval="1day",
        from_date=start.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        to_date=now.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        stock_code=symbol,
        exchange_code="NSE",
        product_type="cash",
    )
    candle_rows = success_rows(candles_response)
    closes = [number(row.get("close")) for row in candle_rows]
    closes = [close for close in closes if close > 0][-30:]

    price = number(quote.get("ltp") or quote.get("last_price") or quote.get("close"))
    if price <= 0 and closes:
        price = closes[-1]
    if price <= 0:
        raise ValueError(f"No valid last price returned for {symbol}")

    change = number(quote.get("change"))
    change_percent = number(quote.get("percentage_change") or quote.get("change_percent"))
    if change_percent == 0 and change != 0:
        previous_close = number(quote.get("previous_close") or quote.get("prev_close"))
        if previous_close > 0:
            change_percent = (change / previous_close) * 100

    return {
        "symbol": symbol,
        "name": SYMBOL_NAMES.get(symbol, symbol),
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "volume": number(quote.get("volume")),
        "candles": closes,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "breeze"}


@app.get("/api/scanner")
def scanner(symbols: str = Query(default="RELIANCE,TCS,INFY,HDFCBANK", max_length=200)) -> dict[str, list[dict[str, Any]]]:
    requested = [part.strip().upper() for part in symbols.split(",") if part.strip()]
    requested = list(dict.fromkeys(requested))
    if not requested or len(requested) > 10:
        raise HTTPException(status_code=400, detail="Provide between 1 and 10 comma-separated NSE symbols.")
    unknown = [symbol for symbol in requested if symbol not in SYMBOL_NAMES]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported scanner symbols: {', '.join(unknown)}")

    client = breeze_client()
    results = []
    for symbol in requested:
        try:
            results.append(fetch_symbol(client, symbol))
        except HTTPException:
            raise
        except Exception as exc:
            # Keep per-symbol failures visible without failing all symbols in the scan.
            results.append({"symbol": symbol, "error": "Market data unavailable for this symbol."})
            print(f"Breeze request failed for {symbol}: {exc}")
    return {"results": results}
