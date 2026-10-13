package com.skillbridge.dto;

// status: NONE, PENDING_SENT, PENDING_RECEIVED, CONNECTED
public record ConnectionStatusResponse(String status, Long connectionId) {
}
