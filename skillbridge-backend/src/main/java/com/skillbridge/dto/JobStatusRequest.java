package com.skillbridge.dto;

import com.skillbridge.entity.JobStatus;
import jakarta.validation.constraints.NotNull;

public record JobStatusRequest(
        @NotNull(message = "Job status is required (OPEN or CLOSED)")
        JobStatus status) {
}
