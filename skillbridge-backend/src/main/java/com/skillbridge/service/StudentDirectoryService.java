package com.skillbridge.service;

import com.skillbridge.dto.PublicStudentProfileResponse;
import com.skillbridge.entity.Connection;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.StudentProfile;
import com.skillbridge.entity.User;
import com.skillbridge.repository.StudentProfileRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.skills.SkillCatalog;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// Student discovery and public student profiles
@Service
public class StudentDirectoryService {

    private final UserRepository userRepository;
    private final StudentProfileRepository profileRepository;
    private final UserService userService;
    private final ConnectionService connectionService;
    private final SkillCatalog skillCatalog;

    public StudentDirectoryService(
            UserRepository userRepository,
            StudentProfileRepository profileRepository,
            UserService userService,
            ConnectionService connectionService,
            SkillCatalog skillCatalog) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.userService = userService;
        this.connectionService = connectionService;
        this.skillCatalog = skillCatalog;
    }

    @Transactional(readOnly = true)
    public List<PublicStudentProfileResponse> search(
            String viewerEmail, String query, String skill, String college) {

        User viewer = userService.getCurrentUser(viewerEmail);

        List<User> students = userRepository.findByRole(Role.STUDENT).stream()
                .filter(student -> !student.isDisabled())
                .filter(student -> !student.getId().equals(viewer.getId()))
                .toList();

        Map<Long, StudentProfile> profiles = profileRepository
                .findByUserIdIn(students.stream().map(User::getId).toList())
                .stream()
                .collect(Collectors.toMap(p -> p.getUser().getId(), Function.identity()));

        Map<Long, Connection> connections = viewer.getRole() == Role.STUDENT
                ? connectionService.connectionsByOtherUser(viewer.getId())
                : Map.of();

        String q = lower(query);
        String skillKey = skill == null || skill.isBlank() ? null : skillCatalog.key(skill);
        String collegeFilter = lower(college);

        return students.stream()
                .filter(student -> matchesQuery(student, profiles.get(student.getId()), q))
                .filter(student -> skillKey == null || hasSkill(profiles.get(student.getId()), skillKey))
                .filter(student -> collegeFilter == null
                        || contains(profileField(profiles.get(student.getId()), StudentProfile::getCollege),
                                    collegeFilter))
                .sorted(Comparator.comparing(
                        (User student) -> student.getName() == null ? "" : student.getName(),
                        String.CASE_INSENSITIVE_ORDER))
                .map(student -> toResponse(
                        viewer, student,
                        profiles.get(student.getId()),
                        connections.get(student.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicStudentProfileResponse getStudent(String viewerEmail, Long studentUserId) {

        User viewer = userService.getCurrentUser(viewerEmail);
        User student = userService.getActiveStudent(studentUserId);

        StudentProfile profile = profileRepository.findByUserId(studentUserId).orElse(null);

        Connection connection = viewer.getRole() == Role.STUDENT
                ? connectionService.connectionsByOtherUser(viewer.getId()).get(studentUserId)
                : null;

        return toResponse(viewer, student, profile, connection);
    }

    private PublicStudentProfileResponse toResponse(
            User viewer, User student, StudentProfile profile, Connection connection) {

        boolean self = viewer.getId().equals(student.getId());
        String connectionStatus = viewer.getRole() == Role.STUDENT && !self
                ? ConnectionService.statusFor(connection, viewer.getId())
                : null;

        // Email is visible to recruiters, admins, the student themself and connections
        boolean showEmail = viewer.getRole() != Role.STUDENT
                || self
                || ConnectionService.CONNECTED.equals(connectionStatus);

        return new PublicStudentProfileResponse(
                student.getId(),
                student.getName(),
                showEmail ? student.getEmail() : null,
                profileField(profile, StudentProfile::getHeadline),
                profileField(profile, StudentProfile::getCollege),
                profileField(profile, StudentProfile::getDegree),
                profileField(profile, StudentProfile::getBranch),
                profile == null ? null : profile.getGraduationYear(),
                profileField(profile, StudentProfile::getLocation),
                profileField(profile, StudentProfile::getBio),
                profileField(profile, StudentProfile::getCareerGoals),
                profile == null ? List.of() : List.copyOf(profile.getSkills()),
                profile == null ? List.of() : List.copyOf(profile.getInterests()),
                profileField(profile, StudentProfile::getGithubUrl),
                profileField(profile, StudentProfile::getLinkedinUrl),
                profileField(profile, StudentProfile::getPortfolioUrl),
                profile != null && profile.hasUploadedResume(),
                connectionStatus,
                connection == null || "NONE".equals(connectionStatus)
                        ? null
                        : connection.getId());
    }

    private boolean matchesQuery(User student, StudentProfile profile, String q) {

        if (q == null) {
            return true;
        }

        Stream<String> fields = Stream.of(
                student.getName(),
                profileField(profile, StudentProfile::getHeadline),
                profileField(profile, StudentProfile::getCollege),
                profileField(profile, StudentProfile::getBranch),
                profileField(profile, StudentProfile::getDegree),
                profileField(profile, StudentProfile::getLocation));

        Stream<String> lists = profile == null
                ? Stream.empty()
                : Stream.concat(profile.getSkills().stream(), profile.getInterests().stream());

        return Stream.concat(fields, lists).anyMatch(value -> contains(value, q));
    }

    private boolean hasSkill(StudentProfile profile, String skillKey) {
        return profile != null && profile.getSkills().stream()
                .anyMatch(s -> skillKey.equals(skillCatalog.key(s)));
    }

    private static String profileField(
            StudentProfile profile, Function<StudentProfile, String> getter) {
        return profile == null ? null : getter.apply(profile);
    }

    private static boolean contains(String value, String lowerQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerQuery);
    }

    private static String lower(String value) {
        return value == null || value.isBlank()
                ? null
                : value.trim().toLowerCase(Locale.ROOT);
    }
}
