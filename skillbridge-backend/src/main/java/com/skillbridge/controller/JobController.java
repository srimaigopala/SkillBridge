
package com.skillbridge.controller;

import com.skillbridge.dto.JobMatchResponse;
import com.skillbridge.dto.JobRequest;
import com.skillbridge.dto.JobResponse;
import com.skillbridge.dto.JobStatusRequest;
import com.skillbridge.service.JobService;
import com.skillbridge.service.RecommendationService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;
    private final RecommendationService recommendationService;

    public JobController(
            JobService jobService,
            RecommendationService recommendationService) {
        this.jobService = jobService;
        this.recommendationService = recommendationService;
    }

    // Create a new job (recruiter only)
    @PostMapping
    public ResponseEntity<JobResponse> createJob(
            @Valid @RequestBody JobRequest request,
            Authentication authentication) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(jobService.createJob(authentication.getName(), request));
    }

    // Get all jobs (used by students to browse opportunities)
    @GetMapping
    public ResponseEntity<List<JobResponse>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    // Get only the jobs posted by the logged-in recruiter
    @GetMapping("/my-jobs")
    public ResponseEntity<List<JobResponse>> getMyJobs(
            Authentication authentication) {

        return ResponseEntity.ok(
                jobService.getJobsByRecruiter(authentication.getName()));
    }

    // Get a job by ID
    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    // Skill match between the logged-in student and this job
    @GetMapping("/{id}/match")
    public ResponseEntity<JobMatchResponse> getMatch(
            @PathVariable Long id,
            Authentication authentication) {

        return ResponseEntity.ok(
                recommendationService.matchForJob(authentication.getName(), id));
    }

    // Update a job (owning recruiter only)
    @PutMapping("/{id}")
    public ResponseEntity<JobResponse> updateJob(
            @PathVariable Long id,
            @Valid @RequestBody JobRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                jobService.updateJob(authentication.getName(), id, request));
    }

    // Open or close a job (owning recruiter only)
    @PatchMapping("/{id}/status")
    public ResponseEntity<JobResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody JobStatusRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(jobService.changeStatus(
                authentication.getName(), id, request.status()));
    }

    // Delete a job and its applications (owning recruiter or admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable Long id,
            Authentication authentication) {

        jobService.deleteJob(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    // Get jobs by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<JobResponse>> getJobsByStatus(
            @PathVariable String status) {

        return ResponseEntity.ok(jobService.getJobsByStatus(status));
    }

    // Search jobs by title
    @GetMapping("/search/title")
    public ResponseEntity<List<JobResponse>> searchByTitle(
            @RequestParam String title) {

        return ResponseEntity.ok(jobService.searchJobsByTitle(title));
    }

    // Search jobs by location
    @GetMapping("/search/location")
    public ResponseEntity<List<JobResponse>> searchByLocation(
            @RequestParam String location) {

        return ResponseEntity.ok(jobService.searchJobsByLocation(location));
    }

    // Search jobs using any combination of title/company, location, status and skill
    @GetMapping("/search")
    public ResponseEntity<List<JobResponse>> searchJobs(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String skill) {

        return ResponseEntity.ok(
                jobService.searchJobs(title, location, status, skill));
    }
}
