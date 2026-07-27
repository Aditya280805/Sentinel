import yfinance as yf
import sqlite3
import sys
import math
import time
import pandas as pd
from datetime import datetime
from config import PORTFOLIO, DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

print("🔒 Opening the Sentinel Vault...")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. Create Staging Table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_history_staging (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        ticker TEXT,
        open_price REAL,
        high_price REAL,
        low_price REAL,
        close_price REAL,
        volume INTEGER,
        ai_score REAL
    )
""")
cursor.execute("DELETE FROM stock_history_staging") # Clear staging
conn.commit()

total_rows_inserted = 0

for ticker in PORTFOLIO:
    print(f"📡 Fetching 2 Years of DAILY history for {ticker}...")
    
    # Retry logic
    max_retries = 3
    stock_data = pd.DataFrame()
    
    for attempt in range(max_retries):
        try:
            stock_data = yf.download(ticker, period="2y", interval="1d", progress=False)
            if not stock_data.empty:
                break
        except Exception as e:
            print(f"  ⚠️ Attempt {attempt+1} failed for {ticker}: {e}")
            time.sleep(2 ** attempt) # Exponential backoff
            
    if stock_data.empty:
        print(f"  ⚠️ No data found for {ticker} after {max_retries} attempts.")
        continue

    # Flatten MultiIndex columns if present
    if isinstance(stock_data.columns, pd.MultiIndex):
        stock_data.columns = stock_data.columns.get_level_values(0)

    rows_inserted = 0
    rows_skipped = 0

    for index, row in stock_data.iterrows():
        date_str = index.strftime('%Y-%m-%d')
        
        try:
            # Safely get scalar values regardless of pandas version
            open_p = float(row['Open'])
            high_p = float(row['High'])
            low_p = float(row['Low'])
            close_p = float(row['Close'])
            vol = int(row['Volume'])
            
            # Skip rows with NaN/invalid prices
            if any(math.isnan(v) for v in [open_p, high_p, low_p, close_p]):
                rows_skipped += 1
                continue

            cursor.execute("""
                INSERT INTO stock_history_staging (date, ticker, open_price, high_price, low_price, close_price, volume, ai_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (date_str, ticker, open_p, high_p, low_p, close_p, vol, 0.0))
            rows_inserted += 1
        except Exception as e:
            rows_skipped += 1
            print(f"  ⚠️ Skipped row {date_str}: {e}")

    print(f"  ✅ {ticker}: {rows_inserted} rows inserted, {rows_skipped} skipped")
    total_rows_inserted += rows_inserted
    
    # Rate limiting sleep
    time.sleep(0.5)

# If we got substantial data, swap the tables
if total_rows_inserted > 0:
    print("\n🔄 Swapping staging table with production table...")
    cursor.execute("DELETE FROM stock_history")
    cursor.execute("""
        INSERT INTO stock_history (date, ticker, open_price, high_price, low_price, close_price, volume, ai_score)
        SELECT date, ticker, open_price, high_price, low_price, close_price, volume, ai_score 
        FROM stock_history_staging
    """)
    cursor.execute("DELETE FROM stock_history_staging")
    
    # Update Metadata
    cursor.execute("""
        INSERT OR REPLACE INTO pipeline_metadata (step_name, last_run, status, records_processed)
        VALUES (?, ?, ?, ?)
    """, ("data_foundation", datetime.now().isoformat(), "SUCCESS", total_rows_inserted))
    
    conn.commit()
    print("✅ 2-Year Daily data successfully locked in the vault!")
else:
    print("❌ Failed to download enough data. Keeping old historical data.")

conn.close()