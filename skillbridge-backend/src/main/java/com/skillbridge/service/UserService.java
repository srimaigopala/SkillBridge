package com.skillbridge.service;

import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;

// Resolves the authenticated user and enforces role checks inside services
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User account not found"));

        if (user.isDisabled()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "This account has been disabled");
        }

        return user;
    }

    public User requireRole(String email, Role... allowedRoles) {

        User user = getCurrentUser(email);

        if (Arrays.stream(allowedRoles).noneMatch(role -> role == user.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This action is not available for your account type");
        }

        return user;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }

    public User getActiveStudent(Long id) {

        User user = getUserById(id);

        if (user.getRole() != Role.STUDENT || user.isDisabled()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Student not found");
        }

        return user;
    }
}
