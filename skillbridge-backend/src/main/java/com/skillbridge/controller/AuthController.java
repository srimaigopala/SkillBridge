
package com.skillbridge.controller;

import com.skillbridge.dto.LoginRequest;
import com.skillbridge.dto.LoginResponse;
import com.skillbridge.dto.RegisterRequest;
import com.skillbridge.dto.RegisterResponse;
import com.skillbridge.dto.UserResponse;
import com.skillbridge.entity.User;
import com.skillbridge.service.AuthService;
import com.skillbridge.service.UserService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    // Register a new student
    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        return created(authService.register(request));
    }

    // Register a new recruiter/company
    @PostMapping("/register/company")
    public ResponseEntity<RegisterResponse> registerRecruiter(
            @Valid @RequestBody RegisterRequest request) {

        return created(authService.registerRecruiter(request));
    }

    // Login an existing user
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }

    // The currently authenticated user (used to validate a stored token)
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {

        return ResponseEntity.ok(UserResponse.from(
                userService.getCurrentUser(authentication.getName())));
    }

    private static ResponseEntity<RegisterResponse> created(User user) {

        RegisterResponse response = new RegisterResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}
