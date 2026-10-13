package com.skillbridge.config;

import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Creates the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
// Admins cannot self-register, so this is the only way to bootstrap one.
@Component
public class AdminInitializer implements ApplicationRunner {

    private static final Logger log =
            LoggerFactory.getLogger(AdminInitializer.class);

    private final SkillBridgeProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(
            SkillBridgeProperties properties,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {

        SkillBridgeProperties.Admin admin = properties.admin();

        if (admin == null
                || isBlank(admin.email())
                || isBlank(admin.password())) {
            return;
        }

        String email = admin.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            return;
        }

        User user = new User(
                isBlank(admin.name()) ? "Platform Admin" : admin.name(),
                email,
                passwordEncoder.encode(admin.password()),
                Role.ADMIN);

        userRepository.save(user);
        log.info("Created bootstrap admin account {}", email);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
