package com.skillbridge.dto;

import jakarta.validation.constraints.NotNull;

public record UserStatusRequest(
        @NotNull(message = "disabled must be true or false")
        Boolean disabled) {
}
