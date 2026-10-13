package com.skillbridge.service;

import com.skillbridge.dto.ConnectionResponse;
import com.skillbridge.dto.ConnectionStatusResponse;
import com.skillbridge.entity.Connection;
import com.skillbridge.entity.ConnectionStatus;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.StudentProfile;
import com.skillbridge.entity.User;
import com.skillbridge.repository.ConnectionRepository;
import com.skillbridge.repository.StudentProfileRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Student-to-student connection requests
@Service
public class ConnectionService {

    public static final String NONE = "NONE";
    public static final String PENDING_SENT = "PENDING_SENT";
    public static final String PENDING_RECEIVED = "PENDING_RECEIVED";
    public static final String CONNECTED = "CONNECTED";

    private final ConnectionRepository connectionRepository;
    private final StudentProfileRepository profileRepository;
    private final UserService userService;

    public ConnectionService(
            ConnectionRepository connectionRepository,
            StudentProfileRepository profileRepository,
            UserService userService) {
        this.connectionRepository = connectionRepository;
        this.profileRepository = profileRepository;
        this.userService = userService;
    }

    @Transactional
    public ConnectionResponse sendRequest(String email, Long targetUserId) {

        User me = userService.requireRole(email, Role.STUDENT);

        if (me.getId().equals(targetUserId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "You cannot connect with yourself");
        }

        User target = userService.getActiveStudent(targetUserId);

        Connection connection = connectionRepository
                .findBetween(me.getId(), target.getId())
                .orElse(null);

        if (connection == null) {
            connection = new Connection();
            connection.setRequester(me);
            connection.setReceiver(target);
            connection.setStatus(ConnectionStatus.PENDING);
            return toResponse(connectionRepository.save(connection), me.getId());
        }

        switch (connection.getStatus()) {

            case ACCEPTED -> throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "You are already connected");

            case PENDING -> {
                if (connection.getRequester().getId().equals(me.getId())) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "Connection request already sent");
                }
                // They already asked us: sending back means accepting
                connection.setStatus(ConnectionStatus.ACCEPTED);
                connection.setRespondedAt(LocalDateTime.now());
            }

            case REJECTED -> {
                // Allow a fresh request after a rejection
                connection.setRequester(me);
                connection.setReceiver(target);
                connection.setStatus(ConnectionStatus.PENDING);
                connection.setCreatedAt(LocalDateTime.now());
                connection.setRespondedAt(null);
            }
        }

        return toResponse(connectionRepository.save(connection), me.getId());
    }

    @Transactional
    public ConnectionResponse accept(String email, Long connectionId) {
        return respond(email, connectionId, ConnectionStatus.ACCEPTED);
    }

    @Transactional
    public ConnectionResponse reject(String email, Long connectionId) {
        return respond(email, connectionId, ConnectionStatus.REJECTED);
    }

    private ConnectionResponse respond(
            String email, Long connectionId, ConnectionStatus decision) {

        User me = userService.requireRole(email, Role.STUDENT);
        Connection connection = findInvolving(connectionId, me.getId());

        if (!connection.getReceiver().getId().equals(me.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the person who received the request can respond");
        }

        if (connection.getStatus() != ConnectionStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "This request has already been answered");
        }

        connection.setStatus(decision);
        connection.setRespondedAt(LocalDateTime.now());

        return toResponse(connectionRepository.save(connection), me.getId());
    }

    // Cancel a sent request, or remove an existing connection
    @Transactional
    public void remove(String email, Long connectionId) {

        User me = userService.requireRole(email, Role.STUDENT);
        Connection connection = findInvolving(connectionId, me.getId());

        if (connection.getStatus() == ConnectionStatus.PENDING
                && !connection.getRequester().getId().equals(me.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Reject the request instead of deleting it");
        }

        connectionRepository.delete(connection);
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponse> getConnections(String email) {
        User me = userService.requireRole(email, Role.STUDENT);
        return toResponses(
                connectionRepository.findByUserAndStatus(
                        me.getId(), ConnectionStatus.ACCEPTED),
                me.getId());
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponse> getIncomingRequests(String email) {
        User me = userService.requireRole(email, Role.STUDENT);
        return toResponses(
                connectionRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(
                        me.getId(), ConnectionStatus.PENDING),
                me.getId());
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponse> getOutgoingRequests(String email) {
        User me = userService.requireRole(email, Role.STUDENT);
        return toResponses(
                connectionRepository.findByRequesterIdAndStatusOrderByCreatedAtDesc(
                        me.getId(), ConnectionStatus.PENDING),
                me.getId());
    }

    @Transactional(readOnly = true)
    public ConnectionStatusResponse statusWith(String email, Long otherUserId) {
        User me = userService.requireRole(email, Role.STUDENT);
        return connectionRepository.findBetween(me.getId(), otherUserId)
                .map(c -> new ConnectionStatusResponse(statusFor(c, me.getId()), c.getId()))
                .orElse(new ConnectionStatusResponse(NONE, null));
    }

    // otherUserId -> connection, for annotating student directory results
    @Transactional(readOnly = true)
    public Map<Long, Connection> connectionsByOtherUser(Long userId) {
        return connectionRepository.findAllInvolving(userId).stream()
                .collect(Collectors.toMap(
                        c -> c.otherParty(userId).getId(),
                        Function.identity(),
                        (a, b) -> a));
    }

    public static String statusFor(Connection connection, Long viewerId) {

        if (connection == null) {
            return NONE;
        }

        return switch (connection.getStatus()) {
            case ACCEPTED -> CONNECTED;
            case PENDING -> connection.getRequester().getId().equals(viewerId)
                    ? PENDING_SENT
                    : PENDING_RECEIVED;
            case REJECTED -> NONE;
        };
    }

    private Connection findInvolving(Long connectionId, Long userId) {
        return connectionRepository.findById(connectionId)
                .filter(c -> c.involves(userId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Connection not found"));
    }

    private List<ConnectionResponse> toResponses(
            List<Connection> connections, Long viewerId) {

        Map<Long, StudentProfile> profiles = profilesFor(
                connections.stream()
                        .map(c -> c.otherParty(viewerId).getId())
                        .toList());

        return connections.stream()
                .map(c -> toResponse(c, viewerId, profiles))
                .toList();
    }

    private ConnectionResponse toResponse(Connection connection, Long viewerId) {
        Long otherId = connection.otherParty(viewerId).getId();
        return toResponse(connection, viewerId, profilesFor(List.of(otherId)));
    }

    private ConnectionResponse toResponse(
            Connection connection,
            Long viewerId,
            Map<Long, StudentProfile> profiles) {

        User other = connection.otherParty(viewerId);
        StudentProfile profile = profiles.get(other.getId());

        return new ConnectionResponse(
                connection.getId(),
                connection.getStatus().name(),
                connection.getRequester().getId().equals(viewerId) ? "SENT" : "RECEIVED",
                other.getId(),
                other.getName(),
                profile == null ? null : profile.getHeadline(),
                profile == null ? null : profile.getCollege(),
                connection.getCreatedAt(),
                connection.getRespondedAt());
    }

    private Map<Long, StudentProfile> profilesFor(List<Long> userIds) {

        if (userIds.isEmpty()) {
            return new HashMap<>();
        }

        return profileRepository.findByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(p -> p.getUser().getId(), p -> p));
    }
}
