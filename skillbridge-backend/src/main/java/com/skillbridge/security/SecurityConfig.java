
package com.skillbridge.security;

import com.skillbridge.config.SkillBridgeProperties;
import com.skillbridge.repository.UserRepository;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SkillBridgeProperties properties;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            SkillBridgeProperties properties) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.properties = properties;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // Return JSON instead of empty 401/403 responses
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, e) ->
                    writeError(response,
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Authentication required"))
                .accessDeniedHandler((request, response, e) ->
                    writeError(response,
                        HttpServletResponse.SC_FORBIDDEN,
                        "You do not have permission to perform this action"))
            )

            .authorizeHttpRequests(auth -> auth

                // Allow Spring Boot error responses
                .requestMatchers("/error").permitAll()

                // Public authentication endpoints
                .requestMatchers(
                    "/api/test",
                    "/api/auth/register",
                    "/api/auth/register/company",
                    "/api/auth/login"
                ).permitAll()

                // Only admins can access admin endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Recruiters manage jobs; admins may also delete them
                .requestMatchers(HttpMethod.POST, "/api/jobs").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.PUT, "/api/jobs/**").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.PATCH, "/api/jobs/**").hasRole("RECRUITER")
                .requestMatchers(HttpMethod.DELETE, "/api/jobs/**")
                    .hasAnyRole("RECRUITER", "ADMIN")
                .requestMatchers("/api/jobs/my-jobs").hasRole("RECRUITER")
                .requestMatchers("/api/jobs/*/match").hasRole("STUDENT")

                // Student-only areas
                .requestMatchers(
                    "/api/student/**",
                    "/api/connections/**"
                ).hasRole("STUDENT")

                // Applications: students apply/withdraw, recruiters review
                .requestMatchers(HttpMethod.POST, "/api/applications").hasRole("STUDENT")
                .requestMatchers("/api/applications/my-applications").hasRole("STUDENT")
                .requestMatchers("/api/applications/*/withdraw").hasRole("STUDENT")
                .requestMatchers(
                    "/api/applications/received",
                    "/api/applications/job/**",
                    "/api/applications/*/status"
                ).hasRole("RECRUITER")

                // Résumé downloads of other students: recruiters and admins
                .requestMatchers("/api/students/*/resume")
                    .hasAnyRole("RECRUITER", "ADMIN")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    private static void writeError(
            HttpServletResponse response,
            int status,
            String message) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
                properties.cors().allowedOrigins()
        );

        configuration.setAllowedMethods(
                List.of(
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of(
                    "Authorization",
                    "Content-Type"
                )
        );

        configuration.setExposedHeaders(
                List.of("Content-Disposition")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }

    // Backed by the users table (replaces Spring's generated in-memory user)
    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return email -> userRepository.findByEmail(email)
                .map(user -> User.withUsername(user.getEmail())
                        .password(user.getPassword())
                        .roles(user.getRole().name())
                        .disabled(user.isDisabled())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException(email));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
