package com.skillbridge.controller;

import com.skillbridge.dto.PublicStudentProfileResponse;
import com.skillbridge.service.StudentDirectoryService;
import com.skillbridge.service.StudentProfileService;

import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Student discovery: public profiles visible to any signed-in user
@RestController
@RequestMapping("/api/students")
public class StudentDirectoryController {

    private final StudentDirectoryService directoryService;
    private final StudentProfileService profileService;

    public StudentDirectoryController(
            StudentDirectoryService directoryService,
            StudentProfileService profileService) {
        this.directoryService = directoryService;
        this.profileService = profileService;
    }

    // Search by free text (name, college, skills, interests...), skill or college
    @GetMapping
    public ResponseEntity<List<PublicStudentProfileResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String college,
            Authentication authentication) {

        return ResponseEntity.ok(
                directoryService.search(authentication.getName(), q, skill, college));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<PublicStudentProfileResponse> getStudent(
            @PathVariable Long userId,
            Authentication authentication) {

        return ResponseEntity.ok(
                directoryService.getStudent(authentication.getName(), userId));
    }

    // Recruiters and admins can open a student's uploaded résumé
    @GetMapping("/{userId}/resume")
    public ResponseEntity<Resource> getResume(@PathVariable Long userId) {
        return ResumeDownloads.toResponse(profileService.getStudentResume(userId));
    }
}
