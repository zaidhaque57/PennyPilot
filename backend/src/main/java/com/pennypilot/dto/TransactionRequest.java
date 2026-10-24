package com.pennypilot.dto;

import com.pennypilot.model.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(

    @NotNull(message = "Transaction type is required")
    TransactionType type,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 10, fraction = 2,
            message = "Amount supports up to 10 integer digits and 2 decimals")
    BigDecimal amount,

    @NotBlank(message = "Category is required")
    @Size(max = 50, message = "Category must be at most 50 characters")
    String category,

    @Size(max = 200, message = "Description must be at most 200 characters")
    String description,

    @NotNull(message = "Transaction date is required")
    LocalDate transactionDate

) {
}