package com.niftyalpha.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "frontend_display")
public class FrontendDisplay {

    @Id
    private String ticker;

    @Column(name = "current_price")
    private Double currentPrice;

    @Column(name = "cagr_percentage")
    private Double cagrPercentage;

    @Column(name = "support_stop_loss")
    private Double supportStopLoss;

    @Column(name = "valuation_verdict")
    private String valuationVerdict;

    @Column(name = "risk_profile")
    private String riskProfile;

    @Column(name = "ai_sentiment")
    private String aiSentiment;

    @Column(name = "forecast_macro")
    private String forecastMacro;

    @Column(name = "pe_ratio")
    private Double peRatio;

    @Column(name = "debt_to_equity")
    private Double debtToEquity;

    @Column(name = "price_to_book")
    private Double priceToBook;

    private Double roe;

    @Column(name = "dividend_yield")
    private Double dividendYield;

    private Double eps;

    @Column(name = "current_ratio")
    private Double currentRatio;

    @Column(name = "market_cap")
    private Double marketCap;

    private String sector;

    // Getters and Setters

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public Double getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(Double currentPrice) { this.currentPrice = currentPrice; }

    public Double getCagrPercentage() { return cagrPercentage; }
    public void setCagrPercentage(Double cagrPercentage) { this.cagrPercentage = cagrPercentage; }

    public Double getSupportStopLoss() { return supportStopLoss; }
    public void setSupportStopLoss(Double supportStopLoss) { this.supportStopLoss = supportStopLoss; }

    public String getValuationVerdict() { return valuationVerdict; }
    public void setValuationVerdict(String valuationVerdict) { this.valuationVerdict = valuationVerdict; }

    public String getRiskProfile() { return riskProfile; }
    public void setRiskProfile(String riskProfile) { this.riskProfile = riskProfile; }

    public String getAiSentiment() { return aiSentiment; }
    public void setAiSentiment(String aiSentiment) { this.aiSentiment = aiSentiment; }

    public String getForecastMacro() { return forecastMacro; }
    public void setForecastMacro(String forecastMacro) { this.forecastMacro = forecastMacro; }

    public Double getPeRatio() { return peRatio; }
    public void setPeRatio(Double peRatio) { this.peRatio = peRatio; }

    public Double getDebtToEquity() { return debtToEquity; }
    public void setDebtToEquity(Double debtToEquity) { this.debtToEquity = debtToEquity; }

    public Double getPriceToBook() { return priceToBook; }
    public void setPriceToBook(Double priceToBook) { this.priceToBook = priceToBook; }

    public Double getRoe() { return roe; }
    public void setRoe(Double roe) { this.roe = roe; }

    public Double getDividendYield() { return dividendYield; }
    public void setDividendYield(Double dividendYield) { this.dividendYield = dividendYield; }

    public Double getEps() { return eps; }
    public void setEps(Double eps) { this.eps = eps; }

    public Double getCurrentRatio() { return currentRatio; }
    public void setCurrentRatio(Double currentRatio) { this.currentRatio = currentRatio; }

    public Double getMarketCap() { return marketCap; }
    public void setMarketCap(Double marketCap) { this.marketCap = marketCap; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
}
