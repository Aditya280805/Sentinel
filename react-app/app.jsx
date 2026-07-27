const { useState, useEffect, useRef, useMemo } = React;

// ========================================================
// CONFIGURATION
// ========================================================
const API_BASE = 'http://localhost:5000';

// ========================================================
// METRIC DEFINITIONS — Plain English for Non-Technical Users
// ========================================================
const METRICS = {
    peRatio: {
        label: "P/E Ratio",
        full: "Price-to-Earnings Ratio",
        icon: "📊",
        explain: "This tells you how much investors are paying for every ₹1 of the company's profit. Think of it like this: if a tea stall makes ₹1 lakh profit and someone offers to buy it for ₹10 lakhs, the P/E is 10. A lower P/E (under 20) can mean the stock is a bargain. A very high P/E (over 50) means people expect huge future growth.",
        good: "Below 20 is generally considered cheap",
        bad: "Above 50 means the stock might be expensive"
    },
    eps: {
        label: "EPS",
        full: "Earnings Per Share",
        icon: "💰",
        explain: "If the company divided ALL its annual profit equally among every single share of stock, this is how much profit each share earned. Higher EPS means the company is more profitable. It's like the 'salary' each share generates for you every year.",
        good: "Higher is better — more profit per share",
        bad: "Negative EPS means the company is making losses",
        prefix: "₹"
    },
    roe: {
        label: "ROE",
        full: "Return on Equity",
        icon: "🎯",
        explain: "How efficiently does this company use the money shareholders invested to generate profit? If ROE is 20%, it means for every ₹100 of shareholder money, the company generated ₹20 in profit. Think of it as the company's 'talent' for making money with what it's given.",
        good: "Above 15% is considered excellent",
        bad: "Below 10% might indicate poor capital efficiency",
        suffix: "%"
    },
    dividendYield: {
        label: "Dividend Yield",
        full: "Annual Cash Return to Investors",
        icon: "🏦",
        explain: "This is the yearly cash payout you receive JUST for holding the stock, as a percentage of the stock price. If you hold ₹1,00,000 worth of a stock with 2% dividend yield, you get ₹2,000/year in cash — like rent from your investment, even if the stock price doesn't move.",
        good: "2-4% is a healthy dividend yield",
        bad: "0% means no cash payouts to shareholders",
        suffix: "%"
    },
    currentRatio: {
        label: "Current Ratio",
        full: "Short-Term Financial Health",
        icon: "🏥",
        explain: "Can this company pay its bills that are due THIS year? A ratio above 1.0 means YES — it has more short-term assets (cash, receivables) than short-term debts. Think of it like checking if someone's bank balance can cover their upcoming EMIs and credit card bills.",
        good: "Above 1.5 is financially comfortable",
        bad: "Below 1.0 is a red flag — the company may struggle to pay bills"
    },
    debtToEquity: {
        label: "D/E Ratio",
        full: "Debt vs Shareholders' Money",
        icon: "⚖️",
        explain: "How much has the company borrowed compared to the money put in by shareholders? A D/E of 0.5 means for every ₹100 of shareholder money, the company has ₹50 in debt. It's like comparing a person's loans to their savings — the smaller the ratio, the safer.",
        good: "Below 1.0 means the company isn't heavily in debt",
        bad: "Above 2.0 means heavy reliance on borrowed money"
    },
    priceToBook: {
        label: "P/B Ratio",
        full: "Price vs Actual Net Assets",
        icon: "📖",
        explain: "Compares the stock price to the company's actual net worth (what it owns minus what it owes). A P/B under 1 means you can buy the company for less than what its assets are worth — like buying a house for less than the land value. Most quality companies trade above 1.",
        good: "Under 3 is reasonable for most sectors",
        bad: "Very high P/B may mean you're paying a huge premium"
    },
    marketCap: {
        label: "Market Cap",
        full: "Total Company Value",
        icon: "🏢",
        explain: "The total market value of the company — share price × total number of shares. This tells you how 'big' the company is. Large companies (₹1 lakh crore+) are generally more stable. Small companies are riskier but can grow faster.",
        good: "Large-cap (₹1L Cr+) = more stable",
        bad: "Doesn't indicate if stock is cheap or expensive",
        format: "marketcap"
    }
};

// ========================================================
// FORMATTERS
// ========================================================
const formatINR = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return "₹" + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

const formatPercent = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    const sign = num > 0 ? '+' : '';
    return sign + Number(num).toFixed(2) + "%";
};

const formatMarketCap = (val) => {
    if (!val) return '—';
    if (val >= 1e12) return '₹' + (val / 1e12).toFixed(2) + ' Lakh Cr';
    if (val >= 1e10) return '₹' + (val / 1e10).toFixed(2) + 'K Cr';
    if (val >= 1e7) return '₹' + (val / 1e7).toFixed(2) + ' Cr';
    return '₹' + val.toLocaleString('en-IN');
};

const getMetricValue = (stock, key) => {
    const def = METRICS[key];
    const val = stock[key];
    if (val === null || val === undefined || val === 0) return '—';
    if (def.format === 'marketcap') return formatMarketCap(val);
    let display = typeof val === 'number' ? val.toFixed(2) : val;
    if (def.prefix) display = def.prefix + display;
    if (def.suffix) display = display + def.suffix;
    return display;
};

// ========================================================
// RECOMMENDATION ENGINE
// ========================================================
const computeRecommendation = (stock) => {
    let score = 0;
    let reasons = [];

    const val = (stock.valuationVerdict || '').toLowerCase();
    if (val.includes('undervalued') || val.includes('cheap')) { score += 2; reasons.push('Stock appears undervalued (low P/E ratio)'); }
    else if (val.includes('overvalued') || val.includes('expensive')) { score -= 2; reasons.push('Stock appears overvalued (high P/E ratio)'); }
    else if (val.includes('negative earnings')) { score -= 1; reasons.push('Company is currently making losses'); }

    const risk = (stock.riskProfile || '').toLowerCase();
    if (risk.includes('low risk')) { score += 1; reasons.push('Healthy debt-to-equity levels'); }
    else if (risk.includes('high risk')) { score -= 1; reasons.push('High debt burden on the balance sheet'); }

    if (stock.cagrPercentage > 15) { score += 1; reasons.push('Strong 2-year CAGR above 15%'); }
    else if (stock.cagrPercentage < 0) { score -= 1; reasons.push('Price has declined over 2 years'); }

    if (stock.roe > 15) { score += 1; reasons.push('Excellent return on equity (ROE > 15%)'); }
    if (stock.currentRatio && stock.currentRatio > 1.5) { score += 1; reasons.push('Strong short-term financial health'); }
    if (stock.dividendYield && stock.dividendYield > 1) { score += 0.5; reasons.push('Pays regular dividends'); }

    // TimesFM AI Macro Forecast Integration
    const forecast = (stock.forecastMacro || '').toLowerCase();
    if (forecast.includes('strong accumulate')) { score += 2; reasons.push('AI projects strong 1-year upside (>15%)'); }
    else if (forecast.includes('moderate growth')) { score += 1; reasons.push('AI projects moderate 1-year growth (5-15%)'); }
    else if (forecast.includes('macro downtrend')) { score -= 2; reasons.push('AI projects 1-year decline (>5%)'); }
    else if (forecast.includes('flat') || forecast.includes('rangebound')) { /* neutral, no score change */ }

    let action, cls, icon, desc;
    if (score >= 5) { action = 'STRONG BUY'; cls = 'buy'; icon = '🟢'; desc = 'Our analysis shows strong fundamentals AND AI-projected upside across multiple parameters. This stock looks extremely attractive for long-term investors.'; }
    else if (score >= 3) { action = 'BUY'; cls = 'buy'; icon = '🟢'; desc = 'The stock has more positive signals than negative, including favorable AI projections. Consider adding this to a diversified portfolio.'; }
    else if (score <= -3) { action = 'SELL'; cls = 'sell'; icon = '🔴'; desc = 'Multiple warning signs detected including AI-projected weakness. Consider exiting or avoiding this stock.'; }
    else if (score <= -1) { action = 'AVOID'; cls = 'sell'; icon = '🔴'; desc = 'The risks outweigh the positives. Not recommended for new investment.'; }
    else { action = 'HOLD'; cls = 'hold'; icon = '🟡'; desc = 'Mixed signals. Hold if you already own it, but wait for clearer direction before buying.'; }

    return { action, cls, icon, desc, reasons, score };
};

// Forecast badge helper
const getForecastStyle = (forecast) => {
    const f = (forecast || '').toLowerCase();
    if (f.includes('strong accumulate')) return { bg: 'linear-gradient(135deg, #065f46, #047857)', border: 'rgba(45,212,160,0.3)', color: '#2DD4A0', icon: '🚀', label: 'Strong Accumulate' };
    if (f.includes('moderate growth')) return { bg: 'linear-gradient(135deg, #1a4731, #1e5a3a)', border: 'rgba(45,212,160,0.2)', color: '#6EE7B7', icon: '📈', label: 'Moderate Growth' };
    if (f.includes('macro downtrend')) return { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: 'rgba(255,94,94,0.3)', color: '#FF5E5E', icon: '📉', label: 'Macro Downtrend' };
    if (f.includes('flat') || f.includes('rangebound')) return { bg: 'linear-gradient(135deg, #78350f, #92400e)', border: 'rgba(232,169,48,0.3)', color: '#E8A930', icon: '➡️', label: 'Flat / Rangebound' };
    return { bg: 'linear-gradient(135deg, #1e293b, #334155)', border: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', icon: '🔮', label: 'Awaiting AI Forecast' };
};

// ========================================================
// STYLES (Inline style objects for React)
// ========================================================
const S = {
    // Layout
    app: { display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' },
    sidebar: { width: 240, flexShrink: 0, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    sidebarBrand: { padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' },
    sidebarBrandText: { fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: 'var(--text-primary)' },
    sidebarBrandSub: { fontSize: 10, fontWeight: 600, color: 'var(--amber)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
    sidebarSection: { padding: '16px 12px 8px 20px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase' },
    sidebarItem: (active) => ({
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px 10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? 'var(--amber)' : 'var(--text-secondary)',
        background: active ? 'rgba(232,169,48,0.08)' : 'transparent',
        borderLeft: active ? '3px solid var(--amber)' : '3px solid transparent',
        transition: 'all 0.2s ease',
    }),
    sidebarCount: { fontFamily: 'var(--font-data)', fontSize: 11, opacity: 0.5 },

    // Main area
    main: { marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' },
    topbar: { height: 56, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 40, gap: 16 },
    searchBox: { flex: 1, maxWidth: 420, position: 'relative' },
    searchInput: {
        width: '100%', padding: '9px 14px 9px 38px', background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
        outline: 'none', transition: 'border-color 0.2s',
    },
    searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' },
    searchDropdown: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, maxHeight: 320, overflowY: 'auto', zIndex: 100, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' },
    searchItem: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, transition: 'background 0.15s' },

    // Summary Chips
    summaryBar: { display: 'flex', gap: 12, padding: '16px 28px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
    chip: (color) => ({
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        background: `${color}10`, border: `1px solid ${color}25`,
        borderRadius: 8, fontSize: 12, fontWeight: 600, color: color,
        fontFamily: 'var(--font-data)',
    }),

    // Stock Grid
    gridArea: { padding: '24px 28px', flex: 1 },
    gridHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    gridTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.3 },
    sortPills: { display: 'flex', gap: 6 },
    sortPill: (active) => ({
        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
        background: active ? 'rgba(232,169,48,0.12)' : 'transparent',
        border: active ? '1px solid var(--amber)' : '1px solid var(--border)',
        color: active ? 'var(--amber)' : 'var(--text-secondary)',
        transition: 'all 0.2s',
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },

    // Card
    card: {
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
    },
    cardHover: { background: 'var(--bg-card-hover)', borderColor: 'rgba(232,169,48,0.2)', transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    cardTicker: { fontSize: 15, fontWeight: 700, letterSpacing: -0.3 },
    cardSector: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    cardPip: (cls) => ({
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
        background: cls === 'buy' ? 'var(--teal)' : cls === 'sell' ? 'var(--red)' : 'var(--amber)',
        boxShadow: `0 0 8px ${cls === 'buy' ? 'rgba(45,212,160,0.4)' : cls === 'sell' ? 'rgba(255,94,94,0.4)' : 'rgba(232,169,48,0.4)'}`,
    }),
    cardPrice: { fontSize: 26, fontWeight: 800, letterSpacing: -1, fontFamily: 'var(--font-data)', color: 'var(--amber)' },
    cardCagr: (pos) => ({ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-data)', color: pos ? 'var(--teal)' : 'var(--red)', marginTop: 4 }),
    cardBottom: { display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' },
    cardMetric: { textAlign: 'center', flex: 1 },
    cardMetricLabel: { fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    cardMetricVal: { fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-data)', color: 'var(--text-secondary)' },

    // Detail Overlay
    overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 16px', overflowY: 'auto' },
    detail: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 1000, width: '100%', padding: '32px 36px', boxShadow: '0 25px 80px rgba(0,0,0,0.6)', animation: 'slideUp 0.35s ease-out' },
    detailClose: { position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
    detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
    detailTicker: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
    detailSector: { fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 20, marginTop: 6, display: 'inline-block' },
    detailPrice: { fontSize: 34, fontWeight: 800, fontFamily: 'var(--font-data)', letterSpacing: -1, color: 'var(--amber)' },

    // Recommendation Banner
    recBanner: (cls) => ({
        display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 10, marginBottom: 24,
        border: '1px solid var(--border)',
        background: cls === 'buy' ? 'linear-gradient(135deg, #065f46, #064e3b)' :
                    cls === 'sell' ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' :
                    'linear-gradient(135deg, #78350f, #92400e)',
    }),
    recIcon: { fontSize: 32, flexShrink: 0 },
    recLabel: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 },
    recAction: { fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: 'var(--text-primary)' },
    recDesc: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 },
    recReasons: { marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 },
    recTag: { fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontWeight: 500 },

    // Charts Area
    chartsRow: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 },
    chartCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 },
    chartTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Fundamentals
    sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 },
    fundGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 28 },
    fundCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, transition: 'all 0.2s' },
    fundIcon: { fontSize: 18, marginBottom: 6 },
    fundLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    fundFull: { fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 4 },
    fundValue: { fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-data)' },
    fundExplain: { fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 },
    fundHint: (good) => ({ fontSize: 10, marginTop: 6, padding: '3px 8px', borderRadius: 4, display: 'inline-block', background: good ? 'rgba(45,212,160,0.1)' : 'rgba(255,94,94,0.1)', color: good ? 'var(--teal)' : 'var(--red)', fontWeight: 500 }),

    // CAGR Section
    cagrCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 28 },
    cagrValue: (pos) => ({ fontSize: 48, fontWeight: 900, letterSpacing: -2, fontFamily: 'var(--font-data)', color: pos ? 'var(--teal)' : 'var(--red)' }),
    cagrExplain: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 620, margin: '12px auto 0' },

    // Assessment
    assessGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 },
    assessCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 },
    assessLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    assessValue: { fontSize: 16, fontWeight: 700, marginBottom: 10 },
    assessExplain: { fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 },

    // Sentiment
    sentimentBar: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    sentimentLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 },
    sentimentValue: { fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-data)' },

    // Forecast Card Badge (for stock cards)
    forecastBadge: (style) => ({
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
        background: style.bg, border: `1px solid ${style.border}`,
        borderRadius: 6, fontSize: 10, fontWeight: 600, color: style.color,
        marginTop: 10, fontFamily: 'var(--font-data)', letterSpacing: 0.3,
    }),

    // Forecast Section (Detail Overlay)
    forecastSection: (style) => ({
        background: style.bg, border: `1px solid ${style.border}`,
        borderRadius: 12, padding: '24px 28px', marginBottom: 28,
        position: 'relative', overflow: 'hidden',
    }),
    forecastGlow: (style) => ({
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        borderRadius: '50%', background: `${style.color}08`, filter: 'blur(40px)',
        pointerEvents: 'none',
    }),
    forecastHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    forecastIcon: { fontSize: 36 },
    forecastLabel: (style) => ({ fontSize: 24, fontWeight: 900, color: style.color, fontFamily: 'var(--font-data)', letterSpacing: -0.5 }),
    forecastExplain: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 },
    forecastMeta: { display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' },
    forecastTag: { fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontWeight: 500 },

    // Support / Stop-Loss
    stopLossCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    stopLossValue: { fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-data)', color: 'var(--blue)', letterSpacing: -1 },
    stopLossPercent: (isNeg) => ({ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-data)', color: isNeg ? 'var(--red)' : 'var(--teal)', marginTop: 4 }),
};

// ========================================================
// PRICE CHART COMPONENT
// ========================================================
const PriceChart = ({ ticker }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        let active = true;
        fetch(`${API_BASE}/api/stock/${ticker}/history`)
            .then(r => r.json())
            .then(data => {
                if (!active || !data.history || !data.history.length) return;
                const labels = data.history.map(h => h.date);
                const prices = data.history.map(h => h.close);
                if (chartRef.current) chartRef.current.destroy();

                const ctx = canvasRef.current.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 240);
                gradient.addColorStop(0, 'rgba(89,160,235,0.25)');
                gradient.addColorStop(1, 'rgba(89,160,235,0.0)');

                chartRef.current = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Close',
                            data: prices,
                            borderColor: '#59A0EB',
                            backgroundColor: gradient,
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
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
                                backgroundColor: '#0C1118',
                                titleColor: 'rgba(255,255,255,0.4)',
                                titleFont: { family: 'IBM Plex Mono', size: 10 },
                                bodyColor: '#E8A930',
                                bodyFont: { family: 'IBM Plex Mono', size: 12, weight: 'bold' },
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                displayColors: false,
                                callbacks: { label: (ctx) => `₹${ctx.parsed.y.toFixed(2)}` }
                            }
                        },
                        scales: {
                            x: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: 'rgba(255,255,255,0.25)', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 6 } },
                            y: { position: 'right', grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { family: 'IBM Plex Mono', size: 10 }, callback: v => '₹' + v.toFixed(0) } }
                        },
                        interaction: { intersect: false, mode: 'index' },
                    }
                });
            }).catch(console.error);
        return () => { active = false; if (chartRef.current) chartRef.current.destroy(); };
    }, [ticker]);

    return <div style={{ height: 260 }}><canvas ref={canvasRef}></canvas></div>;
};

// ========================================================
// PIE CHART COMPONENT
// ========================================================
const MarketPie = ({ stock, totalMarketCap }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        const stockCap = stock.marketCap || 0;
        const restCap = totalMarketCap - stockCap;

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [stock.ticker.replace('.NS', ''), 'Rest of Nifty 50'],
                datasets: [{
                    data: [stockCap, restCap],
                    backgroundColor: ['#59A0EB', 'rgba(255,255,255,0.06)'],
                    borderColor: ['#4080C0', 'rgba(255,255,255,0.03)'],
                    borderWidth: 2,
                    hoverBackgroundColor: ['#79B8FF', 'rgba(255,255,255,0.1)'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '68%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: 'IBM Plex Mono' }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
                    tooltip: {
                        backgroundColor: '#0C1118', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                        callbacks: { label: (ctx) => { const val = ctx.parsed; return ` ${formatMarketCap(val)} (${((val / totalMarketCap) * 100).toFixed(2)}%)`; } }
                    }
                }
            }
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [stock.ticker, totalMarketCap]);

    const pct = totalMarketCap > 0 ? ((stock.marketCap || 0) / totalMarketCap * 100).toFixed(2) : '0';

    return (
        <div style={{ textAlign: 'center' }}>
            <canvas ref={canvasRef} style={{ maxWidth: 200, maxHeight: 200, margin: '0 auto' }}></canvas>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-data)' }}>
                {stock.ticker.replace('.NS', '')} holds <strong style={{ color: 'var(--blue)' }}>{pct}%</strong> of Nifty 50 market cap
            </p>
        </div>
    );
};

// ========================================================
// STOCK DETAIL OVERLAY
// ========================================================
const StockDetail = ({ stock, totalMarketCap, onClose }) => {
    if (!stock) return null;
    const rec = computeRecommendation(stock);
    const isPositive = stock.cagrPercentage >= 0;
    const displayName = stock.ticker.replace('.NS', '');

    const getValuationExplain = (v) => {
        v = (v || '').toLowerCase();
        if (v.includes('undervalued')) return "The stock is currently trading at a low price relative to its earnings. This is like getting a product on sale — you're paying less than what it's arguably worth. This could be a good entry point.";
        if (v.includes('overvalued')) return "Investors are paying a very high premium for this stock. It's like buying a ₹500 item for ₹2000 — the market expects extraordinary future performance. If those expectations aren't met, the price could drop.";
        if (v.includes('fairly')) return "The stock is trading at a reasonable price compared to its earnings. It's neither a steal nor overpriced — think of it as paying MRP. Good for steady, long-term investors.";
        if (v.includes('negative')) return "The company is currently making losses — it's spending more than it earns. This makes valuation tricky and adds extra risk.";
        return "Valuation data is currently unavailable for this stock.";
    };

    const getRiskExplain = (r) => {
        r = (r || '').toLowerCase();
        if (r.includes('low risk')) return "This company has manageable debt levels and a strong balance sheet. It's like someone who has a small, easily payable EMI compared to their salary — financially comfortable and unlikely to face trouble.";
        if (r.includes('high risk')) return "This company carries significant debt relative to its own funds. It's like someone whose EMIs eat up most of their salary — even a small income drop could lead to financial stress.";
        return "Risk data is currently unavailable for this stock.";
    };

    return (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ ...S.detail, position: 'relative' }}>
                <button style={S.detailClose} onClick={onClose} onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.target.style.background = 'none'}>✕</button>

                {/* Header */}
                <div style={S.detailHeader}>
                    <div>
                        <div style={S.detailTicker}>{displayName}</div>
                        <span style={S.detailSector}>{stock.sector || 'Equities'} · NSE</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={S.detailPrice}>{formatINR(stock.currentPrice)}</div>
                        <div style={{ fontSize: 14, fontFamily: 'var(--font-data)', fontWeight: 600, color: isPositive ? 'var(--teal)' : 'var(--red)', marginTop: 4 }}>
                            {formatPercent(stock.cagrPercentage)} CAGR (2-Year)
                        </div>
                    </div>
                </div>

                {/* Recommendation */}
                <div style={S.recBanner(rec.cls)}>
                    <span style={S.recIcon}>{rec.icon}</span>
                    <div style={{ flex: 1 }}>
                        <div style={S.recLabel}>Our Verdict</div>
                        <div style={S.recAction}>{rec.action}</div>
                        <div style={S.recDesc}>{rec.desc}</div>
                        <div style={S.recReasons}>{rec.reasons.map((r, i) => <span key={i} style={S.recTag}>✓ {r}</span>)}</div>
                    </div>
                </div>

                {/* Charts */}
                <div style={S.chartsRow}>
                    <div style={S.chartCard}>
                        <div style={S.chartTitle}>90-Day Price Trend</div>
                        <PriceChart ticker={stock.ticker} />
                    </div>
                    <div style={{ ...S.chartCard, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={S.chartTitle}>Nifty 50 Market Share</div>
                        <MarketPie stock={stock} totalMarketCap={totalMarketCap} />
                    </div>
                </div>

                {/* Fundamentals */}
                <div style={S.sectionTitle}>
                    <span>📋</span> Key Fundamentals
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>— What do these numbers actually mean?</span>
                </div>
                <div style={S.fundGrid}>
                    {Object.keys(METRICS).map(key => {
                        const def = METRICS[key];
                        const val = getMetricValue(stock, key);
                        return (
                            <div key={key} style={S.fundCard} onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(89,160,235,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                                <div style={S.fundIcon}>{def.icon}</div>
                                <div style={S.fundLabel}>{def.label} <span style={S.fundFull}>({def.full})</span></div>
                                <div style={S.fundValue}>{val}</div>
                                <div style={S.fundExplain}>{def.explain}</div>
                                <div><span style={S.fundHint(true)}>✓ {def.good}</span></div>
                                <div style={{ marginTop: 4 }}><span style={S.fundHint(false)}>✗ {def.bad}</span></div>
                            </div>
                        );
                    })}
                </div>

                {/* CAGR */}
                <div style={S.sectionTitle}><span>📈</span> CAGR — Compound Annual Growth Rate</div>
                <div style={S.cagrCard}>
                    <div style={S.cagrValue(isPositive)}>{formatPercent(stock.cagrPercentage)}</div>
                    <p style={S.cagrExplain}>
                        CAGR tells you the <strong>steady, average annual return</strong> this stock has generated over the last 2 years.
                        Think of it as: "If my money grew smoothly every year without ups and downs, this is the annual percentage it would have grown."
                        A CAGR above <strong>15%</strong> is considered strong for Indian equities. Below <strong>0%</strong> means the stock has lost value over time.
                    </p>
                </div>

                {/* Valuation & Risk */}
                <div style={S.sectionTitle}><span>🔍</span> Valuation & Risk Assessment</div>
                <div style={S.assessGrid}>
                    <div style={S.assessCard}>
                        <div style={S.assessLabel}>Valuation</div>
                        <div style={{ ...S.assessValue, color: (stock.valuationVerdict || '').includes('Undervalued') ? 'var(--teal)' : (stock.valuationVerdict || '').includes('Overvalued') ? 'var(--red)' : 'var(--amber)' }}>{stock.valuationVerdict || '—'}</div>
                        <div style={S.assessExplain}>{getValuationExplain(stock.valuationVerdict)}</div>
                    </div>
                    <div style={S.assessCard}>
                        <div style={S.assessLabel}>Risk Profile</div>
                        <div style={{ ...S.assessValue, color: (stock.riskProfile || '').includes('Low') ? 'var(--teal)' : 'var(--red)' }}>{stock.riskProfile || '—'}</div>
                        <div style={S.assessExplain}>{getRiskExplain(stock.riskProfile)}</div>
                    </div>
                </div>

                {/* AI Sentiment */}
                <div style={S.sectionTitle}><span>🤖</span> AI Sentiment Analysis</div>
                <div style={S.sentimentBar}>
                    <div>
                        <div style={S.sentimentLabel}>FinBERT-Powered News Analysis</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Derived from automated analysis of recent financial headlines</div>
                    </div>
                    <div style={{ ...S.sentimentValue, color: (stock.aiSentiment || '').includes('Bullish') ? 'var(--teal)' : (stock.aiSentiment || '').includes('Bearish') ? 'var(--red)' : 'var(--amber)' }}>
                        {stock.aiSentiment || '🟡 Neutral'}
                    </div>
                </div>

                {/* 🔮 AI Macro Forecast (1-Year TimesFM Projection) */}
                {(() => {
                    const fStyle = getForecastStyle(stock.forecastMacro);
                    const hasForecast = stock.forecastMacro && stock.forecastMacro !== 'N/A' && stock.forecastMacro !== 'Pending';
                    return (
                        <>
                            <div style={S.sectionTitle}><span>🔮</span> AI Macro Forecast — 1-Year Projection</div>
                            <div style={S.forecastSection(fStyle)}>
                                <div style={S.forecastGlow(fStyle)}></div>
                                <div style={S.forecastHeader}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>TimesFM 2.5 — Google DeepMind</div>
                                        <div style={S.forecastLabel(fStyle)}>{fStyle.icon} {fStyle.label}</div>
                                    </div>
                                    <div style={S.forecastIcon}>{hasForecast ? fStyle.icon : '⏳'}</div>
                                </div>
                                {hasForecast ? (
                                    <>
                                        <div style={S.forecastExplain}>
                                            <strong>Raw Verdict:</strong> {stock.forecastMacro}
                                        </div>
                                        <div style={S.forecastExplain}>
                                            This projection was generated by Google's TimesFM 2.5 foundation model, which analyzed 512 trading days (2 years) of historical price data
                                            and projected the stock's trajectory 252 trading days (1 year) into the future using zero-shot time-series inference.
                                        </div>
                                        <div style={S.forecastMeta}>
                                            <span style={S.forecastTag}>📊 Context Window: 512 Days</span>
                                            <span style={S.forecastTag}>🎯 Horizon: 252 Days (1 Year)</span>
                                            <span style={S.forecastTag}>🧠 Model: TimesFM 2.5 200M</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={S.forecastExplain}>
                                        ⏳ <strong>Awaiting Kaggle Sync</strong> — The TimesFM 1-year macro forecast has not yet been generated for this stock.
                                        Run the Kaggle notebook with your sentinel.db attached, then copy the updated database back to this project to unlock AI projections.
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}

                {/* 🛡️ Support / Stop-Loss Floor */}
                <div style={S.sectionTitle}><span>🛡️</span> Support / Stop-Loss Floor (90-Day)</div>
                <div style={S.stopLossCard}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>90-Day Low (Support Level)</div>
                        <div style={S.stopLossValue}>{formatINR(stock.supportStopLoss)}</div>
                        {stock.supportStopLoss && stock.currentPrice ? (
                            <div style={S.stopLossPercent(true)}>
                                {((stock.supportStopLoss - stock.currentPrice) / stock.currentPrice * 100).toFixed(1)}% from current price
                            </div>
                        ) : null}
                    </div>
                    <div style={{ maxWidth: 340 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            This is the <strong>lowest price</strong> this stock touched in the last 90 trading days.
                            Many traders use this as a <strong>stop-loss level</strong> — if the price drops below this point, it may signal further decline.
                            Think of it as the "floor" below which the stock hasn't fallen recently.
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// ========================================================
// STOCK CARD
// ========================================================
const StockCard = ({ stock, onClick }) => {
    const [hover, setHover] = useState(false);
    const rec = computeRecommendation(stock);
    const isPositive = stock.cagrPercentage >= 0;
    const displayName = stock.ticker.replace('.NS', '');

    return (
        <div
            style={{ ...S.card, ...(hover ? S.cardHover : {}) }}
            onClick={() => onClick(stock)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div style={S.cardTop}>
                <div>
                    <div style={S.cardTicker}>{displayName}</div>
                    <div style={S.cardSector}>{stock.sector || 'Unknown'}</div>
                </div>
                <div style={S.cardPip(rec.cls)} title={rec.action}></div>
            </div>
            <div>
                <div style={S.cardPrice}>{formatINR(stock.currentPrice)}</div>
                <div style={S.cardCagr(isPositive)}>{formatPercent(stock.cagrPercentage)} CAGR</div>
            </div>
            {/* AI Forecast Badge */}
            {(() => {
                const fStyle = getForecastStyle(stock.forecastMacro);
                return (
                    <div style={S.forecastBadge(fStyle)}>
                        <span>{fStyle.icon}</span>
                        <span>{fStyle.label}</span>
                    </div>
                );
            })()}
            <div style={S.cardBottom}>
                <div style={S.cardMetric}>
                    <div style={S.cardMetricLabel}>P/E</div>
                    <div style={S.cardMetricVal}>{stock.peRatio ? stock.peRatio.toFixed(1) : '—'}</div>
                </div>
                <div style={S.cardMetric}>
                    <div style={S.cardMetricLabel}>ROE</div>
                    <div style={S.cardMetricVal}>{stock.roe ? stock.roe.toFixed(1) + '%' : '—'}</div>
                </div>
                <div style={S.cardMetric}>
                    <div style={S.cardMetricLabel}>EPS</div>
                    <div style={S.cardMetricVal}>₹{stock.eps ? stock.eps.toFixed(1) : '0'}</div>
                </div>
            </div>
        </div>
    );
};

// ========================================================
// MAIN APP
// ========================================================
const App = () => {
    const [stocks, setStocks] = useState([]);
    const [totalMarketCap, setTotalMarketCap] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedStock, setSelectedStock] = useState(null);
    const [activeSector, setActiveSector] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [sortBy, setSortBy] = useState('cagr');

    useEffect(() => {
        fetch(`${API_BASE}/api/stocks`)
            .then(res => res.json())
            .then(data => {
                // Map snake_case API keys to camelCase for React components
                const mapped = (data.stocks || []).map(s => ({
                    ticker: s.ticker,
                    currentPrice: s.current_price ?? s.currentPrice,
                    cagrPercentage: s.cagr_percentage ?? s.cagrPercentage,
                    supportStopLoss: s.support_stop_loss ?? s.supportStopLoss,
                    valuationVerdict: s.valuation_verdict ?? s.valuationVerdict,
                    riskProfile: s.risk_profile ?? s.riskProfile,
                    aiSentiment: s.ai_sentiment ?? s.aiSentiment,
                    forecastMacro: s.forecast_macro ?? s.forecastMacro,
                    peRatio: s.pe_ratio ?? s.peRatio,
                    debtToEquity: s.debt_to_equity ?? s.debtToEquity,
                    priceToBook: s.price_to_book ?? s.priceToBook,
                    roe: s.roe,
                    dividendYield: s.dividend_yield ?? s.dividendYield,
                    eps: s.eps,
                    currentRatio: s.current_ratio ?? s.currentRatio,
                    marketCap: s.market_cap ?? s.marketCap,
                    sector: s.sector,
                }));
                const sorted = mapped.sort((a, b) => (b.cagrPercentage || 0) - (a.cagrPercentage || 0));
                setStocks(sorted);
                setTotalMarketCap(data.total_market_cap || 0);
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    // Escape key closes detail
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setSelectedStock(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Computed sectors
    const sectors = useMemo(() => {
        const sectorMap = {};
        stocks.forEach(s => {
            const sec = s.sector || 'Unknown';
            sectorMap[sec] = (sectorMap[sec] || 0) + 1;
        });
        return Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
    }, [stocks]);

    // Filter & sort
    const filtered = useMemo(() => {
        let result = stocks.filter(s => {
            const sectorMatch = activeSector === 'All' || s.sector === activeSector;
            const searchMatch = !searchQuery || s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || (s.sector && s.sector.toLowerCase().includes(searchQuery.toLowerCase()));
            return sectorMatch && searchMatch;
        });

        switch (sortBy) {
            case 'cagr': result.sort((a, b) => (b.cagrPercentage || 0) - (a.cagrPercentage || 0)); break;
            case 'price': result.sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0)); break;
            case 'pe': result.sort((a, b) => (a.peRatio || 999) - (b.peRatio || 999)); break;
            case 'mcap': result.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)); break;
            case 'name': result.sort((a, b) => a.ticker.localeCompare(b.ticker)); break;
        }
        return result;
    }, [stocks, activeSector, searchQuery, sortBy]);

    // Search matches
    const searchMatches = useMemo(() => {
        if (!searchQuery) return [];
        return stocks.filter(s =>
            s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.sector && s.sector.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 8);
    }, [stocks, searchQuery]);

    // Summary stats
    const summaryStats = useMemo(() => {
        const bullish = stocks.filter(s => computeRecommendation(s).cls === 'buy').length;
        const bearish = stocks.filter(s => computeRecommendation(s).cls === 'sell').length;
        const avgCagr = stocks.length ? (stocks.reduce((a, s) => a + (s.cagrPercentage || 0), 0) / stocks.length).toFixed(1) : 0;
        return { total: stocks.length, bullish, bearish, avgCagr };
    }, [stocks]);

    return (
        <div style={S.app}>
            {/* ===== SIDEBAR ===== */}
            <aside style={S.sidebar}>
                <div style={S.sidebarBrand}>
                    <div style={S.sidebarBrandText}>Nifty Alpha</div>
                    <div style={S.sidebarBrandSub}>Prime 2026</div>
                </div>

                <div style={S.sidebarSection}>Sectors</div>
                <div
                    style={S.sidebarItem(activeSector === 'All')}
                    onClick={() => setActiveSector('All')}
                    onMouseOver={e => { if (activeSector !== 'All') e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseOut={e => { if (activeSector !== 'All') e.currentTarget.style.background = 'transparent'; }}
                >
                    <span>All Stocks</span>
                    <span style={S.sidebarCount}>{stocks.length}</span>
                </div>
                {sectors.map(([sector, count]) => (
                    <div
                        key={sector}
                        style={S.sidebarItem(activeSector === sector)}
                        onClick={() => setActiveSector(sector)}
                        onMouseOver={e => { if (activeSector !== sector) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseOut={e => { if (activeSector !== sector) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span>{sector}</span>
                        <span style={S.sidebarCount}>{count}</span>
                    </div>
                ))}

                <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Data via Yahoo Finance.<br />For educational analysis only.
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main style={S.main}>
                {/* Topbar */}
                <header style={S.topbar}>
                    <div style={S.searchBox}>
                        <span style={S.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search Nifty 50 stocks… e.g. Reliance, TCS, Banks"
                            style={S.searchInput}
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                            onFocus={() => setShowSearch(true)}
                            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                        />
                        {showSearch && searchMatches.length > 0 && (
                            <div style={S.searchDropdown}>
                                {searchMatches.map(s => (
                                    <div
                                        key={s.ticker}
                                        style={S.searchItem}
                                        onMouseDown={() => { setSelectedStock(s); setSearchQuery(''); setShowSearch(false); }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(89,160,235,0.08)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span>
                                            <strong>{s.ticker.replace('.NS', '')}</strong>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{s.sector}</span>
                                        </span>
                                        <span style={{ fontFamily: 'var(--font-data)', color: 'var(--amber)', fontSize: 13, fontWeight: 600 }}>{formatINR(s.currentPrice)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: 'pulse 2s infinite' }}></span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-data)', fontWeight: 600, color: 'var(--teal)', letterSpacing: 0.5 }}>LIVE</span>
                    </div>
                </header>

                {/* Summary Bar */}
                <div style={S.summaryBar}>
                    <div style={S.chip('#59A0EB')}>📊 {summaryStats.total} Stocks</div>
                    <div style={S.chip('#2DD4A0')}>🟢 {summaryStats.bullish} Buy Signals</div>
                    <div style={S.chip('#FF5E5E')}>🔴 {summaryStats.bearish} Sell Signals</div>
                    <div style={S.chip('#E8A930')}>📈 Avg CAGR: {summaryStats.avgCagr}%</div>
                    <div style={S.chip('#A78BFA')}>🔮 {stocks.filter(s => s.forecastMacro && s.forecastMacro !== 'N/A' && s.forecastMacro !== 'Pending').length} AI Forecasts</div>
                </div>

                {/* Grid Area */}
                <div style={S.gridArea}>
                    <div style={S.gridHeader}>
                        <div style={S.gridTitle}>
                            {activeSector === 'All' ? 'All Nifty 50 Stocks' : activeSector}
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({filtered.length})</span>
                        </div>
                        <div style={S.sortPills}>
                            {[
                                { key: 'cagr', label: 'CAGR' },
                                { key: 'price', label: 'Price' },
                                { key: 'pe', label: 'P/E' },
                                { key: 'mcap', label: 'Market Cap' },
                                { key: 'name', label: 'A-Z' },
                            ].map(s => (
                                <div key={s.key} style={S.sortPill(sortBy === s.key)} onClick={() => setSortBy(s.key)}>
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {loading && (
                        <div style={S.grid}>
                            {[...Array(12)].map((_, i) => (
                                <div key={i} style={{ ...S.card, height: 160 }}><div className="shimmer-bg" style={{ width: '100%', height: '100%', borderRadius: 8 }}></div></div>
                            ))}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>No stocks match the current filter.</div>
                    )}

                    {!loading && (
                        <div style={S.grid}>
                            {filtered.map(stock => (
                                <StockCard key={stock.ticker} stock={stock} onClick={setSelectedStock} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ===== DETAIL OVERLAY ===== */}
            {selectedStock && (
                <StockDetail stock={selectedStock} totalMarketCap={totalMarketCap} onClose={() => setSelectedStock(null)} />
            )}
        </div>
    );
};

// ========================================================
// MOUNT
// ========================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
