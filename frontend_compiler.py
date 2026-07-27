import sqlite3
import sys
import pandas as pd
import numpy as np
from config import DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

print("⚙️ Booting up the Dynamic Frontend API Compiler (2-Year Daily)...\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# >>> HOTFIX 1: Ensure Room 4 exists and has all columns
cursor.execute("""
CREATE TABLE IF NOT EXISTS frontend_display (
    ticker TEXT PRIMARY KEY,
    current_price REAL,
    cagr_percentage REAL,
    support_stop_loss REAL,
    valuation_verdict TEXT,
    risk_profile TEXT,
    roe REAL,
    dividend_yield REAL,
    eps REAL,
    current_ratio REAL,
    market_cap REAL,
    pe_ratio REAL,
    debt_to_equity REAL,
    price_to_book REAL,
    sector TEXT,
    ai_sentiment TEXT,
    forecast_macro TEXT
)
""")

frontend_columns = [
    ("market_cap", "REAL"),
    ("pe_ratio", "REAL"),
    ("debt_to_equity", "REAL"),
    ("price_to_book", "REAL"),
    ("sector", "TEXT DEFAULT 'Unknown'")
]
for col_name, col_type in frontend_columns:
    try:
        cursor.execute(f"ALTER TABLE frontend_display ADD COLUMN {col_name} {col_type}")
    except sqlite3.OperationalError:
        pass

# >>> HOTFIX 2: Ensure Room 2 has all the columns we need
new_columns = [
    ("sector", "TEXT DEFAULT 'Unknown'"),
    ("roe", "REAL"),
    ("dividend_yield", "REAL"),
    ("eps", "REAL"),
    ("current_ratio", "REAL"),
]
for col_name, col_type in new_columns:
    try:
        cursor.execute(f"ALTER TABLE fundamental_health ADD COLUMN {col_name} {col_type}")
    except sqlite3.OperationalError:
        pass  # Column already exists

conn.commit()

cursor.execute("SELECT DISTINCT ticker FROM stock_history")
tickers = [row[0] for row in cursor.fetchall()]

for ticker in tickers:
    print(f"⚙️ Compiling metrics for {ticker}...")
    
    # >>> FIX: Parameterized query instead of f-string SQL injection
    df = pd.read_sql_query("SELECT close_price FROM stock_history WHERE ticker = ? ORDER BY date ASC", conn, params=(ticker,))
    df = df.dropna()  # Filter any NaN values
    
    if len(df) < 5:
        print(f"  ⚠️ Not enough valid daily data. Skipping.")
        continue
        
    current_price = df['close_price'].iloc[-1]
    
    # 1. 90-Day Daily Support Floor
    if len(df) >= 90:
        support_stop_loss = df['close_price'].rolling(window=90).min().iloc[-1]
    else:
        support_stop_loss = df['close_price'].min()

    # 2. Daily CAGR (252 Trading Days per Year)
    if len(df) >= 252:
        oldest_price = df['close_price'].iloc[0]
        years = len(df) / 252.0
        cagr = ((current_price / oldest_price) ** (1 / years) - 1) * 100
    else:
        oldest_price = df['close_price'].iloc[0]
        # Annualize the short-period return instead of showing raw % change
        trading_days = len(df)
        years = trading_days / 252.0 if trading_days > 0 else 1.0
        if years > 0 and oldest_price > 0:
            cagr = ((current_price / oldest_price) ** (1 / years) - 1) * 100
        else:
            cagr = 0.0

    # 3. Dynamic Extraction from Fundamental Room (all metrics)
    cursor.execute("""
        SELECT pe_ratio, debt_to_equity, sector, roe, dividend_yield, eps, current_ratio, market_cap, price_to_book 
        FROM fundamental_health WHERE ticker = ?
    """, (ticker,))
    fund_data = cursor.fetchone()
    
    valuation = "⚪ N/A"
    risk = "⚪ N/A"
    roe_val = 0.0
    div_yield_val = 0.0
    eps_val = 0.0
    current_ratio_val = 0.0
    market_cap_val = 0.0
    pe_ratio_val = 0.0
    de_ratio_val = 0.0
    pb_ratio_val = 0.0
    sector_val = "Unknown"
    
    if fund_data:
        raw_pe = fund_data[0]
        raw_de = fund_data[1]
        sector = fund_data[2] if fund_data[2] else "Unknown"
        roe_val = fund_data[3] if fund_data[3] is not None else 0.0
        div_yield_val = fund_data[4] if fund_data[4] is not None else 0.0
        
        # ---------------------------------------------------------
        # DIVIDEND SANITY CAP (Filter out API glitches > 20%)
        # ---------------------------------------------------------
        if div_yield_val > 20.0:
            div_yield_val = 0.0
            
        eps_val = fund_data[5] if fund_data[5] is not None else 0.0
        current_ratio_val = fund_data[6] if fund_data[6] is not None else 0.0
        market_cap_val = fund_data[7] if fund_data[7] is not None else 0.0
        pb_ratio_val = fund_data[8] if fund_data[8] is not None else 0.0
        pe_ratio_val = float(raw_pe) if raw_pe is not None else 0.0
        de_ratio_val = float(raw_de) if raw_de is not None else 0.0
        sector_val = sector
        
        # Valuation Logic (treat 0 as missing data, not negative earnings)
        try:
            pe_ratio = float(raw_pe) if raw_pe is not None else None
            if pe_ratio is not None and pe_ratio != 0:
                if pe_ratio < 0: valuation = "🔴 High Risk (Negative Earnings)"
                elif pe_ratio < 20: valuation = "🟢 Undervalued (Cheap)"
                elif pe_ratio > 50: valuation = "🔴 Overvalued (Expensive)"
                else: valuation = "🟡 Fairly Valued"
            elif pe_ratio == 0:
                valuation = "⚪ N/A (Data Unavailable)"
        except (ValueError, TypeError): pass

        # Smart Risk Logic (Handling Sector-specific Leverage)
        try:
            de_float = float(raw_de) if raw_de is not None else None
            if de_float is not None and de_float != 0:
                # Normalize (Handle % vs ratio)
                actual_de_ratio = de_float / 100.0 if de_float > 10 else de_float
                
                if actual_de_ratio > 1000:  # Filter billion-dollar raw debt glitches
                    risk = "⚪ N/A (Data Glitch)"
                elif sector == "Financial Services":
                    risk = "🔴 High Risk" if actual_de_ratio > 15.0 else "🟢 Low Risk (Safe Bank)"
                else:
                    risk = "🔴 High Risk" if actual_de_ratio > 1.5 else "🟢 Low Risk (Safe Balance Sheet)"
            elif de_float == 0:
                if sector == "Financial Services":
                    risk = "⚪ N/A (Bank D/E Unavailable)"
                else:
                    risk = "⚪ N/A (D/E Unavailable)"
        except (ValueError, TypeError): pass

    # ---------------------------------------------------------
    # APEX CONGLOMERATE OVERRIDE (For Reliance Industries)
    # ---------------------------------------------------------
    if ticker == 'RELIANCE.NS':
        # 1. Adjusted Valuation Logic (Reliance commands a premium)
        if pe_ratio_val <= 35:
            valuation = "🟢 Fairly Valued (Conglomerate Premium)"
        else:
            valuation = "🔴 Overvalued (Expensive)"
            
        # 2. Adjusted Risk & Efficiency Logic (Heavy Capex lowers ROE naturally)
        if roe_val >= 8.0 and de_ratio_val < 1.0:
            risk = "🟢 Low Risk (Safe Balance Sheet)"
        else:
            risk = "🔴 High Risk"
            
        # 3. Sector Override
        sector_val = "Apex Conglomerate"

    # 4. Compute a fundamental-based sentiment fallback (used when FinBERT has not been run)
    fundamental_sentiment = "🟡 Neutral (Awaiting AI Scan)"
    if "Undervalued" in valuation or "cheap" in valuation.lower():
        if "Low Risk" in risk:
            fundamental_sentiment = "🟢 Bullish (Strong Fundamentals)"
        else:
            fundamental_sentiment = "🟢 Bullish (Undervalued)"
    elif "Overvalued" in valuation or "Expensive" in valuation.lower():
        if "High Risk" in risk:
            fundamental_sentiment = "🔴 Bearish (Weak Fundamentals)"
        else:
            fundamental_sentiment = "🔴 Bearish (Overvalued)"
    elif "Negative Earnings" in valuation:
        fundamental_sentiment = "🔴 Bearish (Negative Earnings)"
    elif "Low Risk" in risk and cagr > 15:
        fundamental_sentiment = "🟢 Bullish (Strong Growth)"
    elif "High Risk" in risk and cagr < 0:
        fundamental_sentiment = "🔴 Bearish (Declining + High Risk)"

    # 5. Save/Update Frontend Cache (with real metrics from fundamental_health)
    # Use INSERT ON CONFLICT to preserve FinBERT AI sentiment and forecast_macro
    # NOTE: INSERT OR REPLACE deletes the row first, causing subqueries to return NULL.
    # ON CONFLICT DO UPDATE avoids this by updating in-place.
    cursor.execute("""
        INSERT INTO frontend_display 
        (ticker, current_price, cagr_percentage, support_stop_loss, valuation_verdict, risk_profile, 
         roe, dividend_yield, eps, current_ratio, market_cap, pe_ratio, debt_to_equity, price_to_book, sector,
         ai_sentiment, forecast_macro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'N/A')
        ON CONFLICT(ticker) DO UPDATE SET
            current_price = excluded.current_price,
            cagr_percentage = excluded.cagr_percentage,
            support_stop_loss = excluded.support_stop_loss,
            valuation_verdict = excluded.valuation_verdict,
            risk_profile = excluded.risk_profile,
            roe = excluded.roe,
            dividend_yield = excluded.dividend_yield,
            eps = excluded.eps,
            current_ratio = excluded.current_ratio,
            market_cap = excluded.market_cap,
            pe_ratio = excluded.pe_ratio,
            debt_to_equity = excluded.debt_to_equity,
            price_to_book = excluded.price_to_book,
            sector = excluded.sector,
            ai_sentiment = CASE
                WHEN frontend_display.ai_sentiment IS NOT NULL 
                     AND frontend_display.ai_sentiment != 'Pending'
                THEN frontend_display.ai_sentiment
                ELSE excluded.ai_sentiment
            END,
            forecast_macro = COALESCE(frontend_display.forecast_macro, 'N/A')
    """, (ticker, current_price, cagr, support_stop_loss, valuation, risk, 
          roe_val, div_yield_val, eps_val, current_ratio_val, market_cap_val, 
          pe_ratio_val, de_ratio_val, pb_ratio_val, sector_val, 
          fundamental_sentiment))

conn.commit()
conn.close()
print("\n✅ 2-Year Daily Frontend Cache Compiled Successfully!")