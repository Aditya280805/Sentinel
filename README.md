# Nifty Alpha: Prime 2026

A comprehensive stock market analysis dashboard specifically tailored for the Nifty 50 index. This project combines fundamental financial data, AI-driven sentiment analysis, and machine learning macro forecasts to provide a clear, actionable overview of the top Indian equities.

## Features

- **Live Dashboard**: A beautiful, responsive React frontend (built with Vite) that displays key metrics for Nifty 50 stocks.
- **Fundamental Analysis**: Calculates and displays crucial financial metrics like CAGR, P/E Ratio, EPS, ROE, Dividend Yield, and Debt-to-Equity.
- **AI Sentiment Analysis**: Leverages FinBERT to analyze recent financial news headlines and gauge market sentiment for each stock.
- **Machine Learning Macro Forecasts**: Integrates Google DeepMind's TimesFM 2.5 zero-shot time-series foundation model to project a 1-year macro trajectory based on 2 years of historical data.
- **Automated Data Pipeline**: Python scripts seamlessly fetch stock data via Yahoo Finance, process the indicators, and prepare the data for the frontend.
- **Serverless Ready**: The project utilizes a static JSON export workflow, making it incredibly easy to host the frontend on platforms like Vercel or Netlify without needing to run a persistent backend server.

## Architecture

- **Frontend**: React, Vite, Chart.js (for beautiful charting), and Vanilla CSS.
- **Backend / Data Pipeline**: Python (Pandas, yfinance, SQLite3).
- **Database**: SQLite (`sentinel.db`) acts as the local data warehouse during the processing phase.

## Getting Started

### Prerequisites
- Node.js (for the frontend)
- Python 3.8+ (for the data pipeline)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. **Setup the Python Environment:**
   Install the required Python dependencies for the data pipeline:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Data Pipeline:**
   This will initialize the database, fetch the latest stock data, run the analysis engines, and export the static JSON files required by the frontend:
   ```bash
   python run_pipeline.py
   python export_static_data.py
   ```

4. **Run the Frontend (Development Server):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open your browser to `http://localhost:5173` to view the dashboard!

## Deployment (Vercel)

This project is optimized for deployment on Vercel as a static site. 

1. Push your code to GitHub.
2. In Vercel, import your GitHub repository.
3. Set the **Framework Preset** to `Vite` (if it isn't automatically detected).
4. Set the **Root Directory** to `frontend/`.
5. Click **Deploy**!

To update the data on your live site, simply run `python run_pipeline.py` and `python export_static_data.py` locally to update the JSON files in `frontend/public/api/`, then commit and push the changes to GitHub. Vercel will automatically rebuild and serve the fresh data.

## Disclaimer

This project is for educational and informational purposes only. It is not financial advice. Always do your own research before making investment decisions.
