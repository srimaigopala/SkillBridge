
package com.skillbridge.controller;

import com.skillbridge.dto.JobApplicationResponse;
import com.skillbridge.dto.JobResponse;
import com.skillbridge.dto.UserResponse;
import com.skillbridge.dto.UserStatusRequest;
import com.skillbridge.entity.ApplicationStatus;
import com.skillbridge.entity.Role;
import com.skillbridge.service.AdminService;
import com.skillbridge.service.JobApplicationService;
import com.skillbridge.service.JobService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final JobService jobService;
    private final JobApplicationService applicationService;

    public AdminController(
            AdminService adminService,
            JobService jobService,
            JobApplicationService applicationService) {
        this.adminService = adminService;
        this.jobService = jobService;
        this.applicationService = applicationService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    // Optional filters: role, q (name/email), disabled
    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean disabled) {

        return ResponseEntity.ok(adminService.getUsers(role, q, disabled));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    // Enable or disable an account
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> setUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(adminService.setDisabled(
                authentication.getName(), id, request.disabled()));
    }

    // Optional filters: status (OPEN/CLOSED), q (title/company), skill
    @GetMapping("/jobs")
    public ResponseEntity<List<JobResponse>> getJobs(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String skill) {

        return ResponseEntity.ok(jobService.searchJobs(q, null, status, skill));
    }

    @DeleteMapping("/jobs/{id}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable Long id,
            Authentication authentication) {

        jobService.deleteJob(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    // Optional filters: status, jobId
    @GetMapping("/applications")
    public ResponseEntity<List<JobApplicationResponse>> getAllApplications(
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) Long jobId) {

        return ResponseEntity.ok(
                applicationService.getAllApplicationsForAdmin(status, jobId));
    }
}
