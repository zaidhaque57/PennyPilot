package com.pennypilot.repository;

import com.pennypilot.model.FinanceTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TransactionRepository
        extends MongoRepository<FinanceTransaction, String> {
}