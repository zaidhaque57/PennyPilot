package com.pennypilot.service;

import com.pennypilot.dto.DashboardResponse;
import com.pennypilot.dto.PageResponse;
import com.pennypilot.dto.TransactionRequest;
import com.pennypilot.dto.TransactionResponse;
import com.pennypilot.model.FinanceTransaction;
import com.pennypilot.model.TransactionType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class TransactionService {

    private final MongoTemplate mongoTemplate;

    public TransactionService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public TransactionResponse create(
            String ownerEmail,
            TransactionRequest request
    ) {
        FinanceTransaction transaction = new FinanceTransaction();

        transaction.setOwnerEmail(normalizeEmail(ownerEmail));
        applyRequest(transaction, request);

        Instant now = Instant.now();
        transaction.setCreatedAt(now);
        transaction.setUpdatedAt(now);

        FinanceTransaction saved =
                mongoTemplate.save(transaction);

        return TransactionResponse.from(saved);
    }

    public PageResponse<TransactionResponse> list(
            String ownerEmail,
            TransactionType type,
            String category,
            LocalDate fromDate,
            LocalDate toDate,
            int page,
            int size
    ) {
        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page must be zero or greater"
            );
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page size must be between 1 and 100"
            );
        }

        validateDateRange(fromDate, toDate);

        Criteria criteria = Criteria.where("ownerEmail")
                .is(normalizeEmail(ownerEmail));

        if (type != null) {
            criteria.and("type").is(type);
        }

        if (category != null && !category.isBlank()) {
            String safeCategory = Pattern.quote(category.trim());
            criteria.and("category").regex(
                    Pattern.compile(
                            "^" + safeCategory + "$",
                            Pattern.CASE_INSENSITIVE
                    )
            );
        }

        if (fromDate != null && toDate != null) {
            criteria.and("transactionDate")
                    .gte(fromDate)
                    .lte(toDate);
        } else if (fromDate != null) {
            criteria.and("transactionDate").gte(fromDate);
        } else if (toDate != null) {
            criteria.and("transactionDate").lte(toDate);
        }

        Query query = new Query(criteria);

        long total = mongoTemplate.count(
                query,
                FinanceTransaction.class
        );

        query.with(PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("transactionDate"),
                        Sort.Order.desc("createdAt")
                )
        ));

        List<TransactionResponse> content = mongoTemplate
                .find(query, FinanceTransaction.class)
                .stream()
                .map(TransactionResponse::from)
                .toList();

        int totalPages = total == 0
                ? 0
                : (int) ((total + size - 1) / size);

        return new PageResponse<>(
                content,
                page,
                size,
                total,
                totalPages,
                page == 0,
                page >= totalPages - 1
        );
    }

    public TransactionResponse getById(
            String ownerEmail,
            String id
    ) {
        return TransactionResponse.from(findOwnedTransaction(ownerEmail, id));
    }

    public TransactionResponse update(
            String ownerEmail,
            String id,
            TransactionRequest request
    ) {
        FinanceTransaction transaction =
                findOwnedTransaction(ownerEmail, id);

        applyRequest(transaction, request);
        transaction.setUpdatedAt(Instant.now());

        FinanceTransaction saved =
                mongoTemplate.save(transaction);

        return TransactionResponse.from(saved);
    }

    public void delete(String ownerEmail, String id) {
        FinanceTransaction transaction =
                findOwnedTransaction(ownerEmail, id);

        mongoTemplate.remove(transaction);
    }

    public DashboardResponse dashboard(
            String ownerEmail,
            YearMonth month
    ) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);

        Criteria criteria = Criteria.where("ownerEmail")
                .is(normalizeEmail(ownerEmail))
                .and("transactionDate")
                .gte(start)
                .lt(end);

        List<FinanceTransaction> transactions = mongoTemplate.find(
                new Query(criteria),
                FinanceTransaction.class
        );

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;

        for (FinanceTransaction transaction : transactions) {
            if (transaction.getType() == TransactionType.INCOME) {
                income = income.add(transaction.getAmount());
            } else if (transaction.getType() == TransactionType.EXPENSE) {
                expenses = expenses.add(transaction.getAmount());
            }
        }

        return new DashboardResponse(
                month.toString(),
                income,
                expenses,
                income.subtract(expenses),
                transactions.size()
        );
    }

    private FinanceTransaction findOwnedTransaction(
            String ownerEmail,
            String id
    ) {
        Criteria criteria = Criteria.where("_id")
                .is(id)
                .and("ownerEmail")
                .is(normalizeEmail(ownerEmail));

        FinanceTransaction transaction = mongoTemplate.findOne(
                new Query(criteria),
                FinanceTransaction.class
        );

        if (transaction == null) {
            // Return the same response for missing and other users' records.
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Transaction not found"
            );
        }

        return transaction;
    }

    private void applyRequest(
            FinanceTransaction transaction,
            TransactionRequest request
    ) {
        transaction.setType(request.type());
        transaction.setAmount(request.amount());
        transaction.setCategory(request.category().trim());

        String description = request.description();
        transaction.setDescription(
                description == null || description.isBlank()
                        ? ""
                        : description.trim()
        );

        transaction.setTransactionDate(request.transactionDate());
    }

    private void validateDateRange(
            LocalDate fromDate,
            LocalDate toDate
    ) {
        if (fromDate != null && toDate != null
                && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "fromDate must be on or before toDate"
            );
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}