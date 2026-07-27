import sqlite3
import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

from config import DB_PATH

print("📦 Starting Static JSON Export for Vercel...")

# Connect to database
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Create output directories
base_dir = os.path.dirname(os.path.abspath(__file__))
public_api_dir = os.path.join(base_dir, 'frontend', 'public', 'api')
history_dir = os.path.join(public_api_dir, 'stock')

os.makedirs(public_api_dir, exist_ok=True)
os.makedirs(history_dir, exist_ok=True)

# 1. Export all stocks
print("  -> Exporting stocks.json...")
cursor.execute("SELECT * FROM frontend_display ORDER BY ticker ASC")
rows = cursor.fetchall()

stocks = []
for row in rows:
    stocks.append({
        'ticker': row['ticker'],
        'current_price': row['current_price'],
        'cagr_percentage': row['cagr_percentage'],
        'support_stop_loss': row['support_stop_loss'],
        'valuation_verdict': row['valuation_verdict'],
        'risk_profile': row['risk_profile'],
        'roe': row['roe'],
        'dividend_yield': row['dividend_yield'],
        'eps': row['eps'],
        'current_ratio': row['current_ratio'],
        'market_cap': row['market_cap'] if 'market_cap' in row.keys() else 0,
        'pe_ratio': row['pe_ratio'] if 'pe_ratio' in row.keys() else 0,
        'debt_to_equity': row['debt_to_equity'] if 'debt_to_equity' in row.keys() else 0,
        'price_to_book': row['price_to_book'] if 'price_to_book' in row.keys() else 0,
        'sector': row['sector'] if 'sector' in row.keys() else 'Unknown',
        'ai_sentiment': row['ai_sentiment'],
        'forecast_macro': row['forecast_macro'],
    })

total_market_cap = sum(s['market_cap'] for s in stocks if s['market_cap'])

stocks_payload = {
    'stocks': stocks,
    'total_market_cap': total_market_cap,
    'count': len(stocks)
}

with open(os.path.join(public_api_dir, 'stocks.json'), 'w', encoding='utf-8') as f:
    json.dump(stocks_payload, f)

# 2. Export history for each stock
print("  -> Exporting individual history JSON files...")
for stock in stocks:
    ticker = stock['ticker']
    cursor.execute("""
        SELECT date, close_price, volume 
        FROM stock_history 
        WHERE ticker = ? 
        ORDER BY date DESC 
        LIMIT 90
    """, (ticker,))
    hist_rows = cursor.fetchall()
    
    history = [{'date': r['date'], 'close': r['close_price'], 'volume': r['volume']} for r in hist_rows]
    history.reverse()
    
    hist_payload = {
        'ticker': ticker,
        'history': history
    }
    
    # Create a directory for this ticker to match the route /api/stock/<ticker>/history.json
    # Or we can just save it as /api/stock/<ticker>_history.json, but the frontend route is:
    # /api/stock/${ticker}/history
    # Let's create the folder for the ticker so it matches the path structure as closely as possible.
    ticker_dir = os.path.join(history_dir, ticker)
    os.makedirs(ticker_dir, exist_ok=True)
    
    with open(os.path.join(ticker_dir, 'history.json'), 'w', encoding='utf-8') as f:
        json.dump(hist_payload, f)

conn.close()
print("✅ Export complete! The frontend/public/api folder now contains the static data.")
