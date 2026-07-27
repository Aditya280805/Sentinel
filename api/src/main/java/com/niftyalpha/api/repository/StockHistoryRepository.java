package com.niftyalpha.api.repository;

import com.niftyalpha.api.entity.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockHistoryRepository extends JpaRepository<StockHistory, Long> {

    @Query(value = "SELECT * FROM stock_history WHERE ticker = :ticker ORDER BY date DESC LIMIT 90", nativeQuery = true)
    List<StockHistory> findLast90DaysByTicker(@Param("ticker") String ticker);
}
