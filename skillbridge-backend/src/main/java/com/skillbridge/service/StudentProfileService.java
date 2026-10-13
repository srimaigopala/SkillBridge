
package com.skillbridge.service;

import com.skillbridge.dto.ResumeUploadResponse;
import com.skillbridge.dto.StudentProfileRequest;
import com.skillbridge.dto.StudentProfileResponse;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.StudentProfile;
import com.skillbridge.entity.User;
import com.skillbridge.repository.StudentProfileRepository;
import com.skillbridge.skills.SkillCatalog;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class StudentProfileService {

    private final StudentProfileRepository profileRepository;
    private final UserService userService;
    private final ResumeService resumeService;
    private final SkillCatalog skillCatalog;

    public StudentProfileService(
            StudentProfileRepository profileRepository,
            UserService userService,
            ResumeService resumeService,
            SkillCatalog skillCatalog) {

        this.profileRepository = profileRepository;
        this.userService = userService;
        this.resumeService = resumeService;
        this.skillCatalog = skillCatalog;
    }

    public record ResumeFile(Resource resource, String fileName) {
    }

    // Returns an empty profile (id = null) if the student hasn't saved one yet
    @Transactional(readOnly = true)
    public StudentProfileResponse getProfile(String email) {

        User user = userService.requireRole(email, Role.STUDENT);

        return profileRepository.findByUserId(user.getId())
                .map(this::toResponse)
                .orElseGet(() -> emptyResponse(user));
    }

    @Transactional
    public StudentProfileResponse saveOrUpdateProfile(
            String email,
            StudentProfileRequest request) {

        User user = userService.requireRole(email, Role.STUDENT);
        StudentProfile profile = findOrCreate(user);

        profile.setPhone(trim(request.getPhone()));
        profile.setCollege(trim(request.getCollege()));
        profile.setDegree(trim(request.getDegree()));
        profile.setBranch(trim(request.getBranch()));
        profile.setGraduationYear(request.getGraduationYear());
        profile.setResumeUrl(trim(request.getResumeUrl()));
        profile.setGithubUrl(trim(request.getGithubUrl()));
        profile.setLinkedinUrl(trim(request.getLinkedinUrl()));
        profile.setPortfolioUrl(trim(request.getPortfolioUrl()));
        profile.setBio(trim(request.getBio()));
        profile.setHeadline(trim(request.getHeadline()));
        profile.setLocation(trim(request.getLocation()));
        profile.setCareerGoals(trim(request.getCareerGoals()));

        // Lists are optional so older clients don't wipe them
        if (request.getSkills() != null) {
            profile.setSkills(skillCatalog.canonicalizeAll(request.getSkills()));
        }

        if (request.getInterests() != null) {
            profile.setInterests(cleanList(request.getInterests()));
        }

        return toResponse(profileRepository.save(profile));
    }

    // Upload a PDF résumé, extract its text and add detected skills to the profile
    @Transactional
    public ResumeUploadResponse uploadResume(String email, MultipartFile file) {

        User user = userService.requireRole(email, Role.STUDENT);
        StudentProfile profile = findOrCreate(user);

        ResumeService.StoredResume stored = resumeService.store(user.getId(), file);
        String previousFile = profile.getResumeStoragePath();

        Set<String> extracted = skillCatalog.extractFromText(stored.text());

        Set<String> existingKeys = new LinkedHashSet<>();
        profile.getSkills().forEach(skill -> existingKeys.add(skillCatalog.key(skill)));

        List<String> added = new ArrayList<>();
        Set<String> merged = new LinkedHashSet<>(profile.getSkills());

        for (String skill : extracted) {
            if (existingKeys.add(skillCatalog.key(skill))) {
                merged.add(skill);
                added.add(skill);
            }
        }

        profile.setSkills(merged);
        profile.setResumeSkills(extracted);
        profile.setResumeText(stored.text());
        profile.setResumeFileName(stored.originalFileName());
        profile.setResumeStoragePath(stored.storagePath());
        profile.setResumeUploadedAt(LocalDateTime.now());

        StudentProfile saved = profileRepository.save(profile);

        if (previousFile != null && !previousFile.equals(stored.storagePath())) {
            resumeService.delete(previousFile);
        }

        return new ResumeUploadResponse(
                stored.originalFileName(),
                stored.text().length(),
                List.copyOf(extracted),
                added,
                toResponse(saved));
    }

    @Transactional(readOnly = true)
    public ResumeFile getOwnResume(String email) {
        User user = userService.requireRole(email, Role.STUDENT);
        return resumeFor(user.getId());
    }

    @Transactional(readOnly = true)
    public ResumeFile getStudentResume(Long studentUserId) {
        userService.getActiveStudent(studentUserId);
        return resumeFor(studentUserId);
    }

    @Transactional
    public StudentProfileResponse deleteResume(String email) {

        User user = userService.requireRole(email, Role.STUDENT);

        StudentProfile profile = profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No résumé uploaded"));

        resumeService.delete(profile.getResumeStoragePath());

        profile.setResumeStoragePath(null);
        profile.setResumeFileName(null);
        profile.setResumeText(null);
        profile.setResumeUploadedAt(null);
        profile.setResumeSkills(Set.of());

        return toResponse(profileRepository.save(profile));
    }

    // Skills used for matching (empty when the student has no profile yet)
    @Transactional(readOnly = true)
    public Set<String> getSkills(Long studentUserId) {
        return profileRepository.findByUserId(studentUserId)
                .map(profile -> (Set<String>) new LinkedHashSet<>(profile.getSkills()))
                .orElseGet(LinkedHashSet::new);
    }

    private ResumeFile resumeFor(Long userId) {

        StudentProfile profile = profileRepository.findByUserId(userId)
                .filter(StudentProfile::hasUploadedResume)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No résumé uploaded"));

        return new ResumeFile(
                resumeService.load(profile.getResumeStoragePath()),
                profile.getResumeFileName());
    }

    private StudentProfile findOrCreate(User user) {
        return profileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    StudentProfile newProfile = new StudentProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });
    }

    private static Set<String> cleanList(List<String> values) {

        Set<String> lowerSeen = new LinkedHashSet<>();
        Set<String> result = new LinkedHashSet<>();

        for (String value : values) {
            String cleaned = trim(value);
            if (cleaned != null && lowerSeen.add(cleaned.toLowerCase())) {
                result.add(cleaned.length() > 60 ? cleaned.substring(0, 60) : cleaned);
            }
        }

        return result;
    }

    private static String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private StudentProfileResponse emptyResponse(User user) {
        return new StudentProfileResponse(
                null, user.getId(), user.getName(), user.getEmail(),
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, List.of(), List.of(),
                false, null, null, List.of(), 0, null);
    }

    StudentProfileResponse toResponse(StudentProfile profile) {

        User user = profile.getUser();

        return new StudentProfileResponse(
                profile.getId(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                profile.getPhone(),
                profile.getCollege(),
                profile.getDegree(),
                profile.getBranch(),
                profile.getGraduationYear(),
                profile.getResumeUrl(),
                profile.getGithubUrl(),
                profile.getLinkedinUrl(),
                profile.getPortfolioUrl(),
                profile.getBio(),
                profile.getHeadline(),
                profile.getLocation(),
                profile.getCareerGoals(),
                List.copyOf(profile.getSkills()),
                List.copyOf(profile.getInterests()),
                profile.hasUploadedResume(),
                profile.getResumeFileName(),
                profile.getResumeUploadedAt(),
                List.copyOf(profile.getResumeSkills()),
                completion(profile),
                profile.getUpdatedAt()
        );
    }

    // Percentage of key profile sections that are filled in
    static int completion(StudentProfile profile) {

        boolean[] sections = {
                profile.getCollege() != null,
                profile.getDegree() != null,
                profile.getBranch() != null,
                profile.getGraduationYear() != null,
                profile.getHeadline() != null,
                profile.getBio() != null,
                profile.getCareerGoals() != null,
                !profile.getSkills().isEmpty(),
                !profile.getInterests().isEmpty(),
                profile.hasUploadedResume() || profile.getResumeUrl() != null,
                profile.getGithubUrl() != null
                        || profile.getLinkedinUrl() != null
                        || profile.getPortfolioUrl() != null
        };

        int filled = 0;
        for (boolean section : sections) {
            if (section) {
                filled++;
            }
        }

        return Math.round(filled * 100f / sections.length);
    }
}
