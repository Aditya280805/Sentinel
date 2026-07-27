import sqlite3
import sys
import pandas as pd
import numpy as np
from datetime import datetime
from config import DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

print("📊 Booting up the Technical Signal Engine (Daily Edition)...\n")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# >>> HOTFIX 1: Auto-build Room 3 if it was accidentally deleted
cursor.execute("""
CREATE TABLE IF NOT EXISTS technical_signals (
    ticker TEXT PRIMARY KEY,
    latest_close REAL,
    sma_value REAL,
    indicator_used TEXT,
    signal TEXT,
    last_updated TEXT
)
""")
conn.commit()

cursor.execute("SELECT DISTINCT ticker FROM stock_history")
tickers = [row[0] for row in cursor.fetchall()]

for ticker in tickers:
    # >>> FIX: Parameterized query instead of f-string SQL injection
    df = pd.read_sql_query("SELECT close_price FROM stock_history WHERE ticker = ? ORDER BY date ASC", conn, params=(ticker,))
    
    # >>> HOTFIX 2: The NaN Virus Filter. Instantly drop corrupted/blank daily rows.
    df = df.dropna(subset=['close_price'])
    
    if len(df) == 0:
        print(f"  ⚠️ [ {ticker} ] No valid price data found.")
        continue
        
    current_price = df['close_price'].iloc[-1]
    
    # 200-Day SMA Math
    if len(df) >= 200:
        sma = df['close_price'].rolling(window=200).mean().iloc[-1]
        indicator = "200-Day SMA"
    elif len(df) >= 50:
        sma = df['close_price'].rolling(window=50).mean().iloc[-1]
        indicator = "50-Day SMA (Fallback)"
    else:
        print(f"  ⚠️ [ {ticker} ] Brand new listing. Not enough daily data.")
        sma = current_price
        indicator = "New Listing (<50 Days)"

    # Generate the Signal
    if indicator == "New Listing (<50 Days)":
        signal = "🟡 HOLD (Insufficient History)"
    elif current_price < sma:
        signal = "🟢 DISCOUNT (Below SMA)"
    else:
        signal = "🔴 PREMIUM (Above SMA)"
        
    print(f"  -> {ticker}: Price ₹{current_price:.2f} | {indicator}: ₹{sma:.2f} | Signal: {signal}")

    # Save to Vault
    cursor.execute("""
        INSERT OR REPLACE INTO technical_signals (ticker, latest_close, sma_value, indicator_used, signal, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (ticker, current_price, sma, indicator, signal, datetime.now().strftime("%Y-%m-%d")))

conn.commit()
conn.close()
print("\n✅ Daily Technical Signals Compiled & Locked!")