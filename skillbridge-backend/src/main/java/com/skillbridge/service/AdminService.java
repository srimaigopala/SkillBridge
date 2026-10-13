package com.skillbridge.service;

import com.skillbridge.dto.UserResponse;
import com.skillbridge.entity.ApplicationStatus;
import com.skillbridge.entity.ConnectionStatus;
import com.skillbridge.entity.JobStatus;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.ConnectionRepository;
import com.skillbridge.repository.JobApplicationRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.repository.PostRepository;
import com.skillbridge.repository.StudentProfileRepository;
import com.skillbridge.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final StudentProfileRepository profileRepository;
    private final PostRepository postRepository;
    private final ConnectionRepository connectionRepository;
    private final UserService userService;

    public AdminService(
            UserRepository userRepository,
            JobRepository jobRepository,
            JobApplicationRepository applicationRepository,
            StudentProfileRepository profileRepository,
            PostRepository postRepository,
            ConnectionRepository connectionRepository,
            UserService userService) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.profileRepository = profileRepository;
        this.postRepository = postRepository;
        this.connectionRepository = connectionRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {

        long recruiters = userRepository.countByRole(Role.RECRUITER);

        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalStudents", userRepository.countByRole(Role.STUDENT));
        stats.put("totalRecruiters", recruiters);
        stats.put("totalCompanies", recruiters);
        stats.put("totalAdmins", userRepository.countByRole(Role.ADMIN));
        stats.put("disabledUsers", userRepository.countByDisabledTrue());
        stats.put("studentProfiles", profileRepository.count());

        stats.put("totalJobs", jobRepository.count());
        stats.put("openJobs", jobRepository.countByStatus(JobStatus.OPEN.name()));
        stats.put("closedJobs", jobRepository.countByStatus(JobStatus.CLOSED.name()));

        stats.put("totalApplications", applicationRepository.count());
        for (ApplicationStatus status : ApplicationStatus.values()) {
            stats.put("applications" + camel(status.name()),
                    applicationRepository.countByStatus(status));
        }

        stats.put("totalPosts", postRepository.count());
        stats.put("totalConnections",
                connectionRepository.countByStatus(ConnectionStatus.ACCEPTED));

        return stats;
    }

    // Filter by role, free text (name/email) and disabled flag; all optional
    @Transactional(readOnly = true)
    public List<UserResponse> getUsers(Role role, String query, Boolean disabled) {

        String q = query == null || query.isBlank()
                ? null
                : query.trim().toLowerCase(Locale.ROOT);

        return userRepository.findAll().stream()
                .filter(u -> role == null || u.getRole() == role)
                .filter(u -> disabled == null || u.isDisabled() == disabled)
                .filter(u -> q == null
                        || (u.getName() != null && u.getName().toLowerCase(Locale.ROOT).contains(q))
                        || u.getEmail().toLowerCase(Locale.ROOT).contains(q))
                .sorted(Comparator.comparing(
                        User::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        return UserResponse.from(userService.getUserById(id));
    }

    @Transactional
    public UserResponse setDisabled(String adminEmail, Long userId, boolean disabled) {

        User admin = userService.requireRole(adminEmail, Role.ADMIN);
        User user = userService.getUserById(userId);

        if (admin.getId().equals(user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "You cannot disable your own account");
        }

        user.setDisabled(disabled);

        return UserResponse.from(userRepository.save(user));
    }

    // APPLIED -> Applied, UNDER_REVIEW -> UnderReview
    private static String camel(String name) {
        StringBuilder result = new StringBuilder();
        for (String part : name.split("_")) {
            result.append(part.charAt(0))
                  .append(part.substring(1).toLowerCase(Locale.ROOT));
        }
        return result.toString();
    }
}
