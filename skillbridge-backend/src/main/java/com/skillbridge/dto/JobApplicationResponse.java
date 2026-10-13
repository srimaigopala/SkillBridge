
package com.skillbridge.dto;

import com.skillbridge.entity.JobApplication;
import com.skillbridge.entity.ApplicationStatus;
import com.skillbridge.skills.MatchResult;
import java.time.LocalDateTime;
import java.util.List;

public class JobApplicationResponse {

    private Long id;
    private Long jobId;
    private String jobTitle;
    private String companyName;
    private String jobStatus;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private ApplicationStatus status;
    private String coverLetter;
    private LocalDateTime appliedAt;
    private LocalDateTime updatedAt;

    // Filled in for recruiter views
    private Integer matchPercentage;
    private List<String> matchedSkills;
    private List<String> missingSkills;

    public JobApplicationResponse(JobApplication application) {
        this.id = application.getId();
        this.jobId = application.getJob().getId();
        this.jobTitle = application.getJob().getTitle();
        this.companyName = application.getJob().getCompanyName();
        this.jobStatus = application.getJob().getStatus();
        this.studentId = application.getStudent().getId();
        this.studentName = application.getStudent().getName();
        this.studentEmail = application.getStudent().getEmail();
        this.status = application.getStatus();
        this.coverLetter = application.getCoverLetter();
        this.appliedAt = application.getAppliedAt();
        this.updatedAt = application.getUpdatedAt();
    }

    public JobApplicationResponse withMatch(MatchResult match) {
        this.matchPercentage = match.matchPercentage();
        this.matchedSkills = match.matchedSkills();
        this.missingSkills = match.missingSkills();
        return this;
    }

    public Long getId() { return id; }
    public Long getJobId() { return jobId; }
    public String getJobTitle() { return jobTitle; }
    public String getCompanyName() { return companyName; }
    public String getJobStatus() { return jobStatus; }
    public Long getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getStudentEmail() { return studentEmail; }
    public ApplicationStatus getStatus() { return status; }
    public String getCoverLetter() { return coverLetter; }
    public LocalDateTime getAppliedAt() { return appliedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Integer getMatchPercentage() { return matchPercentage; }
    public List<String> getMatchedSkills() { return matchedSkills; }
    public List<String> getMissingSkills() { return missingSkills; }
}
