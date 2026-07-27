"""
config.py — Single Source of Truth for the Sentinel Vault Project.

All shared constants (ticker universe, database path) live here.
Every other module imports from this file to stay DRY.
"""

import os

# ==========================================
# DATABASE PATH (always resolves correctly)
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'sentinel.db')

# ==========================================
# NIFTY 50 + DEMERGER TICKERS (51 Total)
# ==========================================
# Note: TMCV.NS and TMPV.NS are Tata Motors Commercial Vehicles
# and Tata Motors Passenger Vehicles (post-demerger, late 2025).
# They have limited historical data (~100-117 days).
PORTFOLIO = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJAJFINSV.NS", "BAJFINANCE.NS", "BEL.NS", "BHARTIARTL.NS",
    "BPCL.NS", "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DIVISLAB.NS",
    "DRREDDY.NS", "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS",
    "HDFCLIFE.NS", "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS",
    "INDUSINDBK.NS", "INFY.NS", "ITC.NS", "JSWSTEEL.NS", "KOTAKBANK.NS",
    "LT.NS", "LTIM.NS", "M&M.NS", "MARUTI.NS", "NESTLEIND.NS",
    "NTPC.NS", "ONGC.NS", "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS",
    "SBIN.NS", "SUNPHARMA.NS", "TATACONSUM.NS", "TATASTEEL.NS", "TCS.NS",
    "TECHM.NS", "TITAN.NS", "TMCV.NS", "TMPV.NS", "ULTRACEMCO.NS", "WIPRO.NS"
]
