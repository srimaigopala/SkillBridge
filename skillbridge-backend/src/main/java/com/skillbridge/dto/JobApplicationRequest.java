
package com.skillbridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;

public class JobApplicationRequest {

    @Positive(message = "Job ID must be a positive number")
    private Long jobId;

    @Size(max = 2000, message = "Cover letter cannot exceed 2000 characters")
    private String coverLetter;

    public JobApplicationRequest() {
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }
}
