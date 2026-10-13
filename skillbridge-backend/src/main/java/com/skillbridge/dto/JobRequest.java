
package com.skillbridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class JobRequest {

    @NotBlank(message = "Job title is required")
    @Size(max = 255, message = "Job title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Company name is required")
    @Size(max = 255, message = "Company name cannot exceed 255 characters")
    private String companyName;

    @Size(max = 3000, message = "Description cannot exceed 3000 characters")
    private String description;

    @Size(max = 255, message = "Location cannot exceed 255 characters")
    private String location;

    @NotBlank(message = "Job type is required")
    private String jobType;

    @DecimalMin(value = "0.0", message = "Salary cannot be negative")
    private BigDecimal salary;

    @FutureOrPresent(message = "Application deadline cannot be in the past")
    private LocalDate applicationDeadline;

    @Size(max = 1000, message = "Required skills cannot exceed 1000 characters")
    private String requiredSkills;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getJobType() {
        return jobType;
    }

    public void setJobType(String jobType) {
        this.jobType = jobType;
    }

    public BigDecimal getSalary() {
        return salary;
    }

    public void setSalary(BigDecimal salary) {
        this.salary = salary;
    }

    public LocalDate getApplicationDeadline() {
        return applicationDeadline;
    }

    public void setApplicationDeadline(LocalDate applicationDeadline) {
        this.applicationDeadline = applicationDeadline;
    }

    public String getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(String requiredSkills) {
        this.requiredSkills = requiredSkills;
    }
}
