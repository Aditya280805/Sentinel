"""
app.py — Flask API Server for the Nifty 50 Stock Dashboard.

Serves the frontend static files and provides a JSON API
to read compiled stock data from sentinel.db.
"""

import sqlite3
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import DB_PATH

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)


def get_db():
    """Get a database connection with row factory for dict-style access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================
# FRONTEND ROUTES
# ==========================================

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


# ==========================================
# API ROUTES
# ==========================================

@app.route('/api/stocks')
def get_all_stocks():
    """Return all stocks from frontend_display as a JSON array."""
    conn = get_db()
    cursor = conn.cursor()
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
    
    # Calculate total Nifty 50 market cap for pie chart
    total_market_cap = sum(s['market_cap'] for s in stocks if s['market_cap'])
    
    conn.close()
    return jsonify({
        'stocks': stocks,
        'total_market_cap': total_market_cap,
        'count': len(stocks)
    })


@app.route('/api/stock/<ticker>/history')
def get_stock_history(ticker):
    """Return the last 90 days of price history for a given stock ticker."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT date, close_price, volume 
        FROM stock_history 
        WHERE ticker = ? 
        ORDER BY date DESC 
        LIMIT 90
    """, (ticker,))
    rows = cursor.fetchall()
    
    history = [{'date': row['date'], 'close': row['close_price'], 'volume': row['volume']} for row in rows]
    history.reverse()  # chronological order
    
    conn.close()
    return jsonify({'ticker': ticker, 'history': history})


if __name__ == '__main__':
    print("\n>>> Sentinel Dashboard launching on http://localhost:8080")
    print("    Press Ctrl+C to stop\n")
    app.run(debug=True, port=8080)
