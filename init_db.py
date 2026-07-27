import sqlite3
import sys
from config import DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

# 1. Create/Connect to the database (using absolute path from config)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 2. Room 1: Stock History (OHLCV)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_history (
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

# 3. Room 2: Fundamental Health
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

# 4. Room 3: Technical Signals
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

# 5. Room 4: Frontend Display Cache
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

# 6. Room 5: Pipeline Metadata
cursor.execute("""
    CREATE TABLE IF NOT EXISTS pipeline_metadata (
        step_name TEXT PRIMARY KEY,
        last_run TEXT,
        status TEXT,
        records_processed INTEGER
    )
""")

conn.commit()
conn.close()
print("🚀 Vault upgraded! All 5 rooms are ready.")