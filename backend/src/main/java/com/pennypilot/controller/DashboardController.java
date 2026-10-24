package com.pennypilot.controller;

import com.pennypilot.dto.DashboardResponse;
import com.pennypilot.service.TransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TransactionService transactionService;

    public DashboardController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public DashboardResponse getDashboard(
            Authentication authentication,
            @RequestParam(required = false) String month
    ) {
        YearMonth selectedMonth;

        try {
            selectedMonth = month == null || month.isBlank()
                    ? YearMonth.now()
                    : YearMonth.parse(month);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Month must use YYYY-MM format"
            );
        }

        return transactionService.dashboard(
                authentication.getName(),
                selectedMonth
        );
    }
}