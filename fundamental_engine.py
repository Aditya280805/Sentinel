import yfinance as yf
import sqlite3
import sys
import time
from datetime import date, datetime
from config import PORTFOLIO, DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

print("🏦 Booting up the Fundamental Gatekeeper...\n")

# 1. Connect to the Sentinel Vault
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 2. Ensure the fundamental_health table has all required columns
cursor.execute("""
    CREATE TABLE IF NOT EXISTS fundamental_health (
        ticker TEXT PRIMARY KEY,
        pe_ratio REAL,
        debt_to_equity REAL,
        price_to_book REAL,
        roe REAL,
        dividend_yield REAL,
        eps REAL,
        current_ratio REAL,
        market_cap REAL,
        sector TEXT DEFAULT 'Unknown',
        last_updated TEXT
    )
""")

new_columns = [
    ("roe", "REAL"),
    ("dividend_yield", "REAL"),
    ("eps", "REAL"),
    ("current_ratio", "REAL"),
    ("market_cap", "REAL"),
    ("sector", "TEXT DEFAULT 'Unknown'"),
]
for col_name, col_type in new_columns:
    try:
        cursor.execute(f"ALTER TABLE fundamental_health ADD COLUMN {col_name} {col_type}")
    except sqlite3.OperationalError:
        pass  # Column already exists

conn.commit()

# 3. Fetch the financial data for each company
processed_count = 0

for ticker in PORTFOLIO:
    print(f"Scraping balance sheet for {ticker}...")
    
    max_retries = 3
    info = {}
    
    for attempt in range(max_retries):
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            if info:
                break
        except Exception as e:
            print(f"  ⚠️ Attempt {attempt+1} failed for {ticker}: {e}")
            time.sleep(2 ** attempt)

    if not info:
        print(f"  ⚠️ Could not fetch info for {ticker} after retries.")
        continue
        
    try:
        pe = info.get('trailingPE', None)
        debt_eq = info.get('debtToEquity', None)
        pb = info.get('priceToBook', None)
        roe = info.get('returnOnEquity', None)
        div_yield = info.get('dividendYield', None)
        eps = info.get('trailingEps', None)
        current_ratio_val = info.get('currentRatio', None)
        market_cap = info.get('marketCap', None)
        sector = info.get('sector', 'Unknown')

        if roe is not None:
            roe = round(roe * 100, 2)
            
        if div_yield is not None:
            div_yield = round(div_yield * 100, 2)
            if div_yield > 20.0:
                print(f"  ⚠️ Warning: Impossible dividend yield detected ({div_yield}%). Resetting to 0.0.")
                div_yield = 0.0

        # 4. Save all metrics into the database
        cursor.execute("""
            INSERT OR REPLACE INTO fundamental_health 
            (ticker, pe_ratio, debt_to_equity, price_to_book, roe, dividend_yield, eps, current_ratio, market_cap, sector, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (ticker, pe, debt_eq, pb, roe, div_yield, eps, current_ratio_val, market_cap, sector, date.today()))
        
        print(f"  ✅ Saved -> P/E: {pe} | D/E: {debt_eq} | P/B: {pb} | ROE: {roe}% | Div: {div_yield}%")
        processed_count += 1
        
    except Exception as e:
        print(f"  ⚠️ Failed to save {ticker}: {e}")

    # Rate limiting sleep
    time.sleep(0.5)

# Update Metadata
if processed_count > 0:
    cursor.execute("""
        INSERT OR REPLACE INTO pipeline_metadata (step_name, last_run, status, records_processed)
        VALUES (?, ?, ?, ?)
    """, ("fundamental_engine", datetime.now().isoformat(), "SUCCESS", processed_count))

conn.commit()
conn.close()

print("\n✅ Fundamental data locked in the Vault!")