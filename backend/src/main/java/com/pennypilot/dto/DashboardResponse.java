package com.pennypilot.dto;

import java.math.BigDecimal;

public record DashboardResponse(
    String month,
    BigDecimal totalIncome,
    BigDecimal totalExpenses,
    BigDecimal balance,
    long transactionCount
) {
}