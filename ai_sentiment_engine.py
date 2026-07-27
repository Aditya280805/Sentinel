import sqlite3
import sys
import time
import yfinance as yf
from transformers import pipeline
from config import PORTFOLIO, DB_PATH

sys.stdout.reconfigure(encoding='utf-8')

print("🧠 Booting up the FinBERT AI Sentiment Engine (yfinance Edition)...\n")

# 1. Load the pre-trained Financial NLP Model
print("📥 Loading AI Model (ProsusAI/finbert)...")
sentiment_analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert")

# 2. Connect to the Sentinel Vault
conn = sqlite3.connect(DB_PATH, timeout=30.0)
cursor = conn.cursor()

# 3. Add AI Sentiment column safely
try:
    cursor.execute("ALTER TABLE frontend_display ADD COLUMN ai_sentiment TEXT DEFAULT 'Neutral'")
except sqlite3.OperationalError:
    pass

def get_news_headlines(ticker):
    """Fetches news titles and summaries using yfinance directly (highly reliable)."""
    headlines = []
    try:
        stock = yf.Ticker(ticker)
        news_items = stock.news
        if news_items:
            for item in news_items[:5]:
                # yfinance returns nested 'content' dict
                content = item.get('content', {})
                title = content.get('title', '')
                summary = content.get('summary', '')
                
                text_to_analyze = f"{title}. {summary}".strip()
                if text_to_analyze and text_to_analyze != ".":
                    headlines.append(text_to_analyze)
    except Exception as e:
        print(f"  ⚠️ Failed to fetch news for {ticker}: {e}")
    return headlines

# 4. Run the Engine across the Universe
for ticker in PORTFOLIO:
    print(f"\n📰 Fetching news for {ticker}...")
    headlines = get_news_headlines(ticker)
    
    if not headlines:
        print(f"  ⚠️ Could not fetch headlines for {ticker}.")
        continue
        
    bullish_score = 0.0
    bearish_score = 0.0
    
    # Feed headlines to FinBERT
    for headline in headlines:
        truncated_headline = headline[:512] 
        result = sentiment_analyzer(truncated_headline)[0]
        label = result['label']  # 'positive', 'negative', or 'neutral'
        confidence = result['score'] # 0.0 to 1.0
        
        if label == 'positive':
            bullish_score += confidence
        elif label == 'negative':
            bearish_score += confidence
            
        print(f"  -> [{label.upper()}] (Conf: {confidence:.2f}) {headline[:80]}...")
        
    # Determine Final AI Verdict based on weighted scores
    if bullish_score > bearish_score and bullish_score > 0.5:
        final_sentiment = "🟢 Bullish (Positive News)"
    elif bearish_score > bullish_score and bearish_score > 0.5:
        final_sentiment = "🔴 Bearish (Negative News)"
    else:
        final_sentiment = "🟡 Neutral (Mixed News)"
        
    print(f"  🤖 AI Verdict: {final_sentiment} (Bull: {bullish_score:.2f}, Bear: {bearish_score:.2f})")
    
    # 5. Lock the AI verdict into the vault
    cursor.execute("""
        UPDATE frontend_display 
        SET ai_sentiment = ? 
        WHERE ticker = ?
    """, (final_sentiment, ticker))
    conn.commit()
    
    # Rate limit between Yahoo Finance news calls
    time.sleep(0.5)

conn.commit()
conn.close()
print("\n✅ AI Sentiment Scan Complete & Locked in Vault!")