package com.pennypilot.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        String userId,
        String name,
        String email
) {
}
