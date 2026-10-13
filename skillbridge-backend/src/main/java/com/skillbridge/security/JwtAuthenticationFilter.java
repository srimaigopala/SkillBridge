
package com.skillbridge.security;

import com.skillbridge.entity.User;
import com.skillbridge.repository.UserRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserRepository userRepository) {

        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Read the Authorization header
        String authHeader = request.getHeader("Authorization");

        // 2. If there is no Bearer token, continue the filter chain
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Extract the JWT
        String token = authHeader.substring(7);

        try {
            // 4. Extract the email from the signed token
            String email = jwtService.extractEmail(token);

            // 5. Authenticate only if no authentication exists already
            if (email != null
                    && SecurityContextHolder.getContext()
                            .getAuthentication() == null) {

                // 6. Find the user in the database (disabled accounts stay anonymous)
                User user = userRepository.findByEmail(email)
                        .orElse(null);

                if (user != null && !user.isDisabled()) {

                    // 7. Add the user's role as a Spring Security authority
                    SimpleGrantedAuthority authority =
                            new SimpleGrantedAuthority(
                                    "ROLE_" + user.getRole().name()
                            );

                    // 8. Set email as the authenticated principal
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    user.getEmail(),
                                    null,
                                    List.of(authority)
                            );

                    // 9. Store authentication in Spring Security context
                    SecurityContextHolder.getContext()
                            .setAuthentication(authentication);
                }
            }

        } catch (io.jsonwebtoken.JwtException
                 | IllegalArgumentException e) {

            // Invalid, expired, or malformed JWT
            SecurityContextHolder.clearContext();

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":401,\"message\":\"Invalid or expired JWT token\"}"
            );
            return;
        }

        // 10. Continue to the controller/security authorization rules
        filterChain.doFilter(request, response);
    }
}
