
package com.skillbridge.dto;

import com.skillbridge.entity.Job;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

public class JobResponse {

    private Long id;
    private String title;
    private String companyName;
    private String description;
    private String location;
    private String jobType;
    private BigDecimal salary;
    private LocalDate applicationDeadline;
    private String requiredSkills;
    private List<String> skills;
    private String status;
    private boolean expired;
    private boolean acceptingApplications;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long recruiterId;
    private String recruiterName;
    private String recruiterEmail;

    public JobResponse(Job job) {
        this.id = job.getId();
        this.title = job.getTitle();
        this.companyName = job.getCompanyName();
        this.description = job.getDescription();
        this.location = job.getLocation();
        this.jobType = job.getJobType();
        this.salary = job.getSalary();
        this.applicationDeadline = job.getApplicationDeadline();
        this.requiredSkills = job.getRequiredSkills();
        this.skills = job.getRequiredSkills() == null
                ? List.of()
                : Arrays.stream(job.getRequiredSkills().split("[,;|\\n]"))
                        .map(String::trim)
                        .filter(skill -> !skill.isEmpty())
                        .toList();
        this.status = job.getStatus();
        this.expired = job.isExpired();
        this.acceptingApplications = job.isAcceptingApplications();
        this.createdAt = job.getCreatedAt();
        this.updatedAt = job.getUpdatedAt();

        if (job.getRecruiter() != null) {
            this.recruiterId = job.getRecruiter().getId();
            this.recruiterName = job.getRecruiter().getName();
            this.recruiterEmail = job.getRecruiter().getEmail();
        }
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getCompanyName() { return companyName; }
    public String getDescription() { return description; }
    public String getLocation() { return location; }
    public String getJobType() { return jobType; }
    public BigDecimal getSalary() { return salary; }
    public LocalDate getApplicationDeadline() { return applicationDeadline; }
    public String getRequiredSkills() { return requiredSkills; }
    public List<String> getSkills() { return skills; }
    public String getStatus() { return status; }
    public boolean isExpired() { return expired; }
    public boolean isAcceptingApplications() { return acceptingApplications; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getRecruiterId() { return recruiterId; }
    public String getRecruiterName() { return recruiterName; }
    public String getRecruiterEmail() { return recruiterEmail; }
}
