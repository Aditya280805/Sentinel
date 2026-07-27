/**
 * Sentinel Dashboard — Frontend Application Logic
 * Handles: Data fetching, search, stock grid, detail modal, charts, recommendations
 */

// ==========================================
// PLAIN ENGLISH DEFINITIONS
// A non-technical person should understand every metric
// ==========================================
const METRIC_DICTIONARY = {
    pe_ratio: {
        label: "P/E Ratio",
        short: "Price-to-Earnings",
        explain: "This tells you how much investors are paying for every ₹1 of the company's profit. A low P/E (under 20) means the stock might be cheap. A very high P/E (over 50) means people are paying a premium — it could be overvalued, or they expect massive future growth."
    },
    eps: {
        label: "EPS",
        short: "Earnings Per Share",
        explain: "If the company divided all its annual profit equally among every share, this is how much each share earned. Higher EPS = more profitable company. Think of it as the 'salary' each share of stock generates."
    },
    roe: {
        label: "ROE",
        short: "Return on Equity",
        explain: "This shows how efficiently the company uses shareholders' money to generate profit. An ROE above 15% is considered good — it means for every ₹100 invested by shareholders, the company made ₹15+ in profit.",
        suffix: "%"
    },
    dividend_yield: {
        label: "Dividend Yield",
        short: "Annual Dividend Return",
        explain: "This is the yearly cash payout you receive just for holding the stock, expressed as a % of the stock price. A 2% yield means if you hold ₹10,000 worth: you get ~₹200/year in dividends — like rent from your investment.",
        suffix: "%"
    },
    current_ratio: {
        label: "Current Ratio",
        short: "Short-term Health Check",
        explain: "Can the company pay its bills due this year? A ratio above 1.0 means YES — it has more short-term assets than debts. Below 1.0 is a warning sign. Think of it like checking if someone's bank balance covers their upcoming EMIs."
    },
    debt_to_equity: {
        label: "D/E Ratio",
        short: "Debt vs Own Money",
        explain: "How much debt the company has compared to the money invested by shareholders. A D/E under 1.0 means the company isn't heavily reliant on borrowed money — that's generally safer. Banks naturally have higher D/E."
    },
    price_to_book: {
        label: "P/B Ratio",
        short: "Price-to-Book Value",
        explain: "Compares the stock price to the company's actual net assets (what it owns minus what it owes). A P/B under 1 could mean the stock is trading below its 'break-up' value — potentially a bargain. Most quality companies trade above 1."
    },
    market_cap: {
        label: "Market Cap",
        short: "Total Company Value",
        explain: "The total market value of the company — calculated as share price × total shares. It tells you how 'big' a company is. Large-cap companies (₹1 lakh crore+) are generally more stable.",
        format: "currency_cr"
    }
};

// Global state
let allStocks = [];
let totalMarketCap = 0;
let priceChartInstance = null;
let pieChartInstance = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchStocks();
    setupSearch();
    setupFilters();
    setupModal();
});

async function fetchStocks() {
    try {
        const res = await fetch('/api/stocks');
        const data = await res.json();
        allStocks = data.stocks;
        totalMarketCap = data.total_market_cap;
        document.getElementById('stock-count-pill').textContent = `${data.count} stocks`;
        renderGrid(allStocks);
    } catch (err) {
        console.error('Failed to fetch stocks:', err);
        document.getElementById('stock-grid').innerHTML = `
            <div class="loading-state">
                <p style="color: var(--accent-rose);">⚠ Failed to load data. Make sure the Flask server is running.</p>
            </div>`;
    }
}

// ==========================================
// STOCK GRID
// ==========================================
function renderGrid(stocks) {
    const grid = document.getElementById('stock-grid');
    if (!stocks.length) {
        grid.innerHTML = '<div class="loading-state"><p>No stocks match your filter.</p></div>';
        return;
    }
    grid.innerHTML = stocks.map(s => {
        const verdictClass = getVerdictClass(s.valuation_verdict);
        const cagrClass = s.cagr_percentage >= 0 ? 'positive' : 'negative';
        const cagrSign = s.cagr_percentage >= 0 ? '+' : '';
        const displayName = s.ticker.replace('.NS', '');
        
        return `
        <div class="stock-card" data-ticker="${s.ticker}" onclick="openStockModal('${s.ticker}')">
            <div class="card-top">
                <div>
                    <div class="card-ticker">${displayName}</div>
                    <div class="card-sector">${s.sector || 'Unknown'}</div>
                </div>
                <div class="card-verdict-pip ${verdictClass}" title="${s.valuation_verdict}"></div>
            </div>
            <div class="card-middle">
                <div class="card-price">₹${formatNum(s.current_price)}</div>
                <div class="card-cagr ${cagrClass}">${cagrSign}${s.cagr_percentage?.toFixed(2) ?? '0'}% CAGR</div>
            </div>
            <div class="card-bottom">
                <div class="card-metric">
                    <div class="card-metric-label">P/E</div>
                    <div class="card-metric-value">${s.pe_ratio ? s.pe_ratio.toFixed(1) : 'N/A'}</div>
                </div>
                <div class="card-metric">
                    <div class="card-metric-label">ROE</div>
                    <div class="card-metric-value">${s.roe ? s.roe.toFixed(1) + '%' : 'N/A'}</div>
                </div>
                <div class="card-metric">
                    <div class="card-metric-label">EPS</div>
                    <div class="card-metric-value">₹${s.eps ? s.eps.toFixed(1) : '0'}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// SEARCH
// ==========================================
function setupSearch() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');

    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            resultsEl.classList.add('hidden');
            return;
        }
        const matches = allStocks.filter(s =>
            s.ticker.toLowerCase().includes(q) ||
            (s.sector && s.sector.toLowerCase().includes(q))
        ).slice(0, 8);

        if (!matches.length) {
            resultsEl.innerHTML = '<div class="search-result-item"><span class="sr-ticker">No results found</span></div>';
        } else {
            resultsEl.innerHTML = matches.map(s => `
                <div class="search-result-item" onclick="openStockModal('${s.ticker}'); document.getElementById('search-results').classList.add('hidden'); document.getElementById('search-input').value='';">
                    <span class="sr-ticker">${s.ticker.replace('.NS', '')} <span style="color:var(--text-muted);font-weight:400;font-size:12px">${s.sector || ''}</span></span>
                    <span class="sr-price">₹${formatNum(s.current_price)}</span>
                </div>
            `).join('');
        }
        resultsEl.classList.remove('hidden');
    });

    // Close search results on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            resultsEl.classList.add('hidden');
        }
    });
}

// ==========================================
// FILTER PILLS
// ==========================================
function setupFilters() {
    document.querySelectorAll('.filter-pills .pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-pills .pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            if (filter === 'all') {
                renderGrid(allStocks);
            } else {
                const filtered = allStocks.filter(s => getVerdictClass(s.valuation_verdict) === filter);
                renderGrid(filtered);
            }
        });
    });
}

// ==========================================
// STOCK DETAIL MODAL
// ==========================================
function setupModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('stock-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
    document.body.style.overflow = '';
    if (priceChartInstance) { priceChartInstance.destroy(); priceChartInstance = null; }
    if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
}

async function openStockModal(ticker) {
    const stock = allStocks.find(s => s.ticker === ticker);
    if (!stock) return;

    const modal = document.getElementById('stock-modal');
    document.body.style.overflow = 'hidden';

    // Header
    document.getElementById('modal-ticker').textContent = ticker.replace('.NS', '');
    document.getElementById('modal-sector').textContent = stock.sector || 'Unknown';
    document.getElementById('modal-price').textContent = `₹${formatNum(stock.current_price)}`;

    // Verdict badge
    const verdictClass = getVerdictClass(stock.valuation_verdict);
    const badge = document.getElementById('modal-verdict-badge');
    badge.textContent = stock.valuation_verdict || 'N/A';
    badge.className = 'verdict-badge ' + verdictClass;

    // Recommendation banner
    buildRecommendation(stock);

    // Fundamentals grid
    buildFundamentals(stock);

    // CAGR
    const cagrEl = document.getElementById('cagr-value');
    const cagrVal = stock.cagr_percentage ?? 0;
    cagrEl.textContent = `${cagrVal >= 0 ? '+' : ''}${cagrVal.toFixed(2)}%`;
    cagrEl.className = 'cagr-value ' + (cagrVal >= 0 ? 'positive' : 'negative');

    // Valuation & Risk
    buildAssessment(stock);

    // Show modal
    modal.classList.remove('hidden');

    // Charts (async)
    buildPieChart(stock);
    await buildPriceChart(ticker);
}

// ==========================================
// RECOMMENDATION ENGINE
// ==========================================
function buildRecommendation(stock) {
    const banner = document.getElementById('recommendation-banner');
    const iconEl = document.getElementById('rec-icon');
    const actionEl = document.getElementById('rec-action');
    const reasonEl = document.getElementById('rec-reason');

    // Score-based recommendation
    let score = 0;
    let reasons = [];

    // Valuation
    const val = (stock.valuation_verdict || '').toLowerCase();
    if (val.includes('undervalued')) { score += 2; reasons.push('stock appears undervalued (low P/E)'); }
    else if (val.includes('overvalued')) { score -= 2; reasons.push('stock appears overvalued (high P/E)'); }
    else if (val.includes('negative earnings')) { score -= 1; reasons.push('company has negative earnings'); }
    
    // Risk
    const risk = (stock.risk_profile || '').toLowerCase();
    if (risk.includes('low risk')) { score += 1; reasons.push('healthy debt levels'); }
    else if (risk.includes('high risk')) { score -= 1; reasons.push('high debt burden'); }

    // CAGR
    if (stock.cagr_percentage > 15) { score += 1; reasons.push('strong CAGR above 15%'); }
    else if (stock.cagr_percentage < 0) { score -= 1; reasons.push('negative growth trend'); }

    // ROE
    if (stock.roe > 15) { score += 1; reasons.push('excellent return on equity'); }
    
    // Current ratio
    if (stock.current_ratio && stock.current_ratio > 1.5) { score += 1; reasons.push('strong short-term financial health'); }

    let action, className, icon;
    if (score >= 3) {
        action = 'STRONG BUY';
        className = 'buy';
        icon = '🟢';
    } else if (score >= 1) {
        action = 'BUY';
        className = 'buy';
        icon = '🟢';
    } else if (score <= -2) {
        action = 'SELL';
        className = 'sell';
        icon = '🔴';
    } else if (score <= -1) {
        action = 'REDUCE / AVOID';
        className = 'sell';
        icon = '🔴';
    } else {
        action = 'HOLD';
        className = 'hold';
        icon = '🟡';
    }

    banner.className = 'recommendation-banner ' + className;
    iconEl.textContent = icon;
    actionEl.textContent = action;
    reasonEl.textContent = reasons.length 
        ? `Based on our analysis: ${reasons.join(', ')}.` 
        : 'Insufficient data for a detailed recommendation.';
}

// ==========================================
// FUNDAMENTALS
// ==========================================
function buildFundamentals(stock) {
    const grid = document.getElementById('fundamentals-grid');
    const metrics = ['pe_ratio', 'eps', 'roe', 'dividend_yield', 'current_ratio', 'debt_to_equity', 'price_to_book', 'market_cap'];
    
    grid.innerHTML = metrics.map(key => {
        const def = METRIC_DICTIONARY[key];
        if (!def) return '';
        let value = stock[key];
        let displayVal;

        if (def.format === 'currency_cr' && value) {
            displayVal = '₹' + formatMarketCap(value);
        } else if (value !== null && value !== undefined && value !== 0) {
            displayVal = typeof value === 'number' ? value.toFixed(2) : value;
            if (def.suffix) displayVal += def.suffix;
        } else {
            displayVal = 'N/A';
        }

        return `
        <div class="fund-card">
            <div class="fund-label">${def.label} <span style="color:var(--text-muted);font-weight:400">(${def.short})</span></div>
            <div class="fund-value">${displayVal}</div>
            <div class="fund-explain">${def.explain}</div>
        </div>`;
    }).join('');
}

// ==========================================
// ASSESSMENT
// ==========================================
function buildAssessment(stock) {
    // Valuation
    const valVerdict = document.getElementById('val-verdict');
    const valExplain = document.getElementById('val-explain');
    valVerdict.textContent = stock.valuation_verdict || 'N/A';
    
    const v = (stock.valuation_verdict || '').toLowerCase();
    if (v.includes('undervalued')) {
        valExplain.textContent = 'The stock is currently trading at a low price relative to its earnings. This is like getting a product on sale — you\'re paying less than what it\'s arguably worth. This could be a good entry point, but always check why it\'s cheap.';
    } else if (v.includes('overvalued')) {
        valExplain.textContent = 'Investors are paying a very high premium for this stock. It\'s like buying a ₹500 item for ₹2000 — the market expects extraordinary future performance. If those expectations aren\'t met, the price could fall significantly.';
    } else if (v.includes('fairly')) {
        valExplain.textContent = 'The stock is trading at a reasonable price compared to its earnings. It\'s neither a steal nor overpriced. This is like paying MRP — fair value. Good for steady, long-term investors.';
    } else if (v.includes('negative')) {
        valExplain.textContent = 'The company is currently making losses — it\'s spending more than it earns. This makes valuation tricky and adds extra risk. Proceed with extreme caution.';
    } else {
        valExplain.textContent = 'Valuation data is currently unavailable for this stock.';
    }

    // Risk
    const riskVerdict = document.getElementById('risk-verdict');
    const riskExplain = document.getElementById('risk-explain');
    riskVerdict.textContent = stock.risk_profile || 'N/A';
    
    const r = (stock.risk_profile || '').toLowerCase();
    if (r.includes('low risk')) {
        riskExplain.textContent = 'This company has manageable debt levels and a strong balance sheet. It\'s like someone who has a small, easily payable EMI compared to their salary — financially comfortable and less likely to run into trouble.';
    } else if (r.includes('high risk')) {
        riskExplain.textContent = 'This company carries a significant amount of debt relative to its own funds. It\'s like someone whose EMIs eat up most of their salary — if income drops even slightly, it could lead to serious financial stress.';
    } else {
        riskExplain.textContent = 'Risk data is currently unavailable for this stock.';
    }
}

// ==========================================
// CHARTS
// ==========================================
async function buildPriceChart(ticker) {
    try {
        const res = await fetch(`/api/stock/${ticker}/history`);
        const data = await res.json();
        const history = data.history;
        if (!history || !history.length) return;

        if (priceChartInstance) priceChartInstance.destroy();

        const ctx = document.getElementById('price-chart').getContext('2d');
        const labels = history.map(h => h.date);
        const prices = history.map(h => h.close);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(129, 140, 248, 0.3)');
        gradient.addColorStop(1, 'rgba(129, 140, 248, 0.0)');

        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Close Price (₹)',
                    data: prices,
                    borderColor: '#818cf8',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHitRadius: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1f2e',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: (ctx) => `₹${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: { color: '#64748b', maxTicksLimit: 6, font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    },
                    y: {
                        display: true,
                        suggestedMin: minP * 0.98,
                        suggestedMax: maxP * 1.02,
                        ticks: { color: '#64748b', font: { size: 10 }, callback: v => '₹' + v.toFixed(0) },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    } catch (err) {
        console.error('Price chart error:', err);
    }
}

function buildPieChart(stock) {
    if (pieChartInstance) pieChartInstance.destroy();

    const ctx = document.getElementById('market-pie').getContext('2d');
    const stockCap = stock.market_cap || 0;
    const restCap = totalMarketCap - stockCap;
    const pct = totalMarketCap > 0 ? ((stockCap / totalMarketCap) * 100).toFixed(2) : 0;
    const displayName = stock.ticker.replace('.NS', '');

    document.getElementById('pie-label').textContent = `${displayName} holds ${pct}% of the total Nifty 50 market cap`;

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [displayName, 'Rest of Nifty 50'],
            datasets: [{
                data: [stockCap, restCap],
                backgroundColor: ['#818cf8', 'rgba(255,255,255,0.08)'],
                borderColor: ['#6366f1', 'rgba(255,255,255,0.04)'],
                borderWidth: 2,
                hoverBackgroundColor: ['#a5b4fc', 'rgba(255,255,255,0.12)'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11, family: 'Inter' },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1f2e',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.parsed;
                            return ` ₹${formatMarketCap(val)} (${((val/totalMarketCap)*100).toFixed(2)}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// UTILITIES
// ==========================================
function formatNum(n) {
    if (n === null || n === undefined) return '0';
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMarketCap(val) {
    if (!val) return 'N/A';
    if (val >= 1e12) return (val / 1e12).toFixed(2) + ' Lakh Cr';
    if (val >= 1e10) return (val / 1e10).toFixed(2) + ' K Cr';  
    if (val >= 1e7) return (val / 1e7).toFixed(2) + ' Cr';
    return val.toLocaleString('en-IN');
}

function getVerdictClass(verdict) {
    if (!verdict) return 'na';
    const v = verdict.toLowerCase();
    if (v.includes('undervalued') || v.includes('cheap')) return 'buy';
    if (v.includes('overvalued') || v.includes('expensive') || v.includes('negative') || v.includes('high risk')) return 'sell';
    if (v.includes('fairly')) return 'hold';
    return 'na';
}
