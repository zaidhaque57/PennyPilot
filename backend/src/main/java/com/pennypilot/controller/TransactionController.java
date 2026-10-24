package com.pennypilot.controller;

import com.pennypilot.dto.PageResponse;
import com.pennypilot.dto.TransactionRequest;
import com.pennypilot.dto.TransactionResponse;
import com.pennypilot.model.TransactionType;
import com.pennypilot.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            Authentication authentication,
            @Valid @RequestBody TransactionRequest request
    ) {
        TransactionResponse response = transactionService.create(
                authentication.getName(),
                request
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public PageResponse<TransactionResponse> list(
            Authentication authentication,

            @RequestParam(required = false)
            TransactionType type,

            @RequestParam(required = false)
            String category,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size
    ) {
        return transactionService.list(
                authentication.getName(),
                type,
                category,
                fromDate,
                toDate,
                page,
                size
        );
    }

    @GetMapping("/{id}")
    public TransactionResponse getById(
            Authentication authentication,
            @PathVariable String id
    ) {
        return transactionService.getById(
                authentication.getName(),
                id
        );
    }

    @PutMapping("/{id}")
    public TransactionResponse update(
            Authentication authentication,
            @PathVariable String id,
            @Valid @RequestBody TransactionRequest request
    ) {
        return transactionService.update(
                authentication.getName(),
                id,
                request
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String id
    ) {
        transactionService.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}