
package com.skillbridge.controller;

import com.skillbridge.dto.JobMatchResponse;
import com.skillbridge.dto.ResumeUploadResponse;
import com.skillbridge.dto.StudentProfileRequest;
import com.skillbridge.dto.StudentProfileResponse;
import com.skillbridge.service.RecommendationService;
import com.skillbridge.service.StudentProfileService;

import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

// The logged-in student's own profile, résumé and recommendations
@RestController
@RequestMapping("/api/student")
public class StudentProfileController {

    private final StudentProfileService studentProfileService;
    private final RecommendationService recommendationService;

    public StudentProfileController(
            StudentProfileService studentProfileService,
            RecommendationService recommendationService) {
        this.studentProfileService = studentProfileService;
        this.recommendationService = recommendationService;
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfileResponse> getProfile(
            Authentication authentication) {

        return ResponseEntity.ok(
                studentProfileService.getProfile(authentication.getName()));
    }

    @PutMapping("/profile")
    public ResponseEntity<StudentProfileResponse> saveOrUpdateProfile(
            @Valid @RequestBody StudentProfileRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                studentProfileService.saveOrUpdateProfile(
                        authentication.getName(), request));
    }

    // Upload a PDF résumé (multipart field "file"); detected skills are added
    @PostMapping(
            value = "/profile/resume",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeUploadResponse> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        return ResponseEntity.ok(
                studentProfileService.uploadResume(authentication.getName(), file));
    }

    @GetMapping("/profile/resume")
    public ResponseEntity<Resource> downloadResume(Authentication authentication) {

        return ResumeDownloads.toResponse(
                studentProfileService.getOwnResume(authentication.getName()));
    }

    @DeleteMapping("/profile/resume")
    public ResponseEntity<StudentProfileResponse> deleteResume(
            Authentication authentication) {

        return ResponseEntity.ok(
                studentProfileService.deleteResume(authentication.getName()));
    }

    // Open jobs ranked by how well they match the student's skills
    @GetMapping("/recommendations")
    public ResponseEntity<List<JobMatchResponse>> getRecommendations(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {

        return ResponseEntity.ok(
                recommendationService.recommend(authentication.getName(), limit));
    }
}
