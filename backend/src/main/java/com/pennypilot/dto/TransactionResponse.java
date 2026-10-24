package com.pennypilot.dto;

import com.pennypilot.model.FinanceTransaction;
import com.pennypilot.model.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TransactionResponse(
    String id,
    TransactionType type,
    BigDecimal amount,
    String category,
    String description,
    LocalDate transactionDate,
    Instant createdAt,
    Instant updatedAt
) {
    public static TransactionResponse from(FinanceTransaction transaction) {
        return new TransactionResponse(
            transaction.getId(),
            transaction.getType(),
            transaction.getAmount(),
            transaction.getCategory(),
            transaction.getDescription(),
            transaction.getTransactionDate(),
            transaction.getCreatedAt(),
            transaction.getUpdatedAt()
        );
    }
}
