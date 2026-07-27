package com.niftyalpha.api.controller;

import com.niftyalpha.api.entity.FrontendDisplay;
import com.niftyalpha.api.entity.StockHistory;
import com.niftyalpha.api.repository.FrontendDisplayRepository;
import com.niftyalpha.api.repository.StockHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allows React to connect
public class StockController {

    private final FrontendDisplayRepository repository;
    private final StockHistoryRepository historyRepository;

    @Autowired
    public StockController(FrontendDisplayRepository repository, StockHistoryRepository historyRepository) {
        this.repository = repository;
        this.historyRepository = historyRepository;
    }

    @GetMapping("/stocks")
    public Map<String, Object> getAllStocks() {
        List<FrontendDisplay> stocks = repository.findAll();
        
        double totalMarketCap = 0;
        for (FrontendDisplay stock : stocks) {
            if (stock.getMarketCap() != null) {
                totalMarketCap += stock.getMarketCap();
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("stocks", stocks);
        response.put("total_market_cap", totalMarketCap);
        response.put("count", stocks.size());

        return response;
    }

    @GetMapping("/stocks/{ticker}")
    public FrontendDisplay getStockByTicker(@PathVariable String ticker) {
        return repository.findById(ticker).orElse(null);
    }

    @GetMapping("/stock/{ticker}/history")
    public Map<String, Object> getStockHistory(@PathVariable String ticker) {
        List<StockHistory> historyRecords = historyRepository.findLast90DaysByTicker(ticker);
        
        // Reverse because native query returns DESC, but chart wants ASC (chronological)
        List<Map<String, Object>> history = new ArrayList<>();
        for (StockHistory record : historyRecords) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", record.getDate());
            entry.put("close", record.getClosePrice());
            entry.put("volume", record.getVolume());
            history.add(entry);
        }
        
        Collections.reverse(history);

        Map<String, Object> response = new HashMap<>();
        response.put("ticker", ticker);
        response.put("history", history);

        return response;
    }
}
