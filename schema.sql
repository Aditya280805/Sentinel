-- ==========================================
-- ROOM 1: The Technical & Price Data Vault
-- ==========================================
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
);

-- ==========================================
-- ROOM 2: The Fundamental Gatekeeper
-- ==========================================
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
);

-- ==========================================
-- ROOM 3: The Signal Room
-- ==========================================
CREATE TABLE IF NOT EXISTS technical_signals (
    ticker TEXT PRIMARY KEY,
    latest_close REAL,
    sma_value REAL,
    indicator_used TEXT,
    signal TEXT,
    last_updated TEXT
);

-- ==========================================
-- ROOM 4: The Frontend Display API Cache
-- ==========================================
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
);