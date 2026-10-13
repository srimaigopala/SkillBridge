
package com.skillbridge.controller;

import com.skillbridge.dto.JobApplicationRequest;
import com.skillbridge.dto.JobApplicationResponse;
import com.skillbridge.dto.UpdateApplicationStatusRequest;
import com.skillbridge.service.JobApplicationService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    private final JobApplicationService applicationService;

    public JobApplicationController(
            JobApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    // Students apply for jobs
    @PostMapping
    public ResponseEntity<?> applyForJob(
            @Valid @RequestBody JobApplicationRequest request,
            Authentication authentication) {

        if (request.getJobId() == null || request.getJobId() <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "A valid job ID is required"));
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.applyForJob(
                        authentication.getName(), request));
    }

    // Students view their own applications
    @GetMapping("/my-applications")
    public ResponseEntity<List<JobApplicationResponse>> getMyApplications(
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.getMyApplications(authentication.getName()));
    }

    // Students withdraw one of their applications
    @PatchMapping("/{applicationId}/withdraw")
    public ResponseEntity<JobApplicationResponse> withdraw(
            @PathVariable Long applicationId,
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.withdraw(authentication.getName(), applicationId));
    }

    // Recruiters view all applications across their jobs
    @GetMapping("/received")
    public ResponseEntity<List<JobApplicationResponse>> getReceived(
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.getReceivedApplications(authentication.getName()));
    }

    // Recruiters view applicants for a job they own
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<JobApplicationResponse>> getApplicationsForJob(
            @PathVariable Long jobId,
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.getApplicationsForRecruiter(
                        authentication.getName(), jobId));
    }

    // One application (student owner, owning recruiter or admin)
    @GetMapping("/{applicationId}")
    public ResponseEntity<JobApplicationResponse> getApplication(
            @PathVariable Long applicationId,
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.getApplication(
                        authentication.getName(), applicationId));
    }

    // Recruiters update application status
    @PatchMapping("/{applicationId}/status")
    public ResponseEntity<JobApplicationResponse> updateApplicationStatus(
            @PathVariable Long applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                applicationService.updateApplicationStatus(
                        authentication.getName(),
                        applicationId,
                        request.getStatus()));
    }
}
