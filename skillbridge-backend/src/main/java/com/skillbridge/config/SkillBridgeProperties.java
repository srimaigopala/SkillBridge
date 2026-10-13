package com.skillbridge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "skillbridge")
public record SkillBridgeProperties(
        Jwt jwt,
        Cors cors,
        Upload upload,
        Admin admin) {

    public record Jwt(String secret, long expirationMs) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Upload(String dir) {
    }

    public record Admin(String name, String email, String password) {
    }
}
