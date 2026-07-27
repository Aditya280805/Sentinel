package com.niftyalpha.api.repository;

import com.niftyalpha.api.entity.FrontendDisplay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FrontendDisplayRepository extends JpaRepository<FrontendDisplay, String> {
}
