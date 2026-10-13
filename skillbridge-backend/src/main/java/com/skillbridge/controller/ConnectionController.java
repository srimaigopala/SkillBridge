package com.skillbridge.controller;

import com.skillbridge.dto.ConnectionResponse;
import com.skillbridge.dto.ConnectionStatusResponse;
import com.skillbridge.service.ConnectionService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Student networking
@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService connectionService;

    public ConnectionController(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    // Accepted connections
    @GetMapping
    public ResponseEntity<List<ConnectionResponse>> getConnections(
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.getConnections(authentication.getName()));
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<ConnectionResponse>> getIncoming(
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.getIncomingRequests(authentication.getName()));
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<ConnectionResponse>> getOutgoing(
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.getOutgoingRequests(authentication.getName()));
    }

    // Connection status with another student
    @GetMapping("/status/{userId}")
    public ResponseEntity<ConnectionStatusResponse> getStatus(
            @PathVariable Long userId,
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.statusWith(authentication.getName(), userId));
    }

    // Send a connection request to a student
    @PostMapping("/request/{userId}")
    public ResponseEntity<ConnectionResponse> sendRequest(
            @PathVariable Long userId,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(connectionService.sendRequest(authentication.getName(), userId));
    }

    @PostMapping("/{connectionId}/accept")
    public ResponseEntity<ConnectionResponse> accept(
            @PathVariable Long connectionId,
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.accept(authentication.getName(), connectionId));
    }

    @PostMapping("/{connectionId}/reject")
    public ResponseEntity<ConnectionResponse> reject(
            @PathVariable Long connectionId,
            Authentication authentication) {

        return ResponseEntity.ok(
                connectionService.reject(authentication.getName(), connectionId));
    }

    // Cancel a sent request or remove a connection
    @DeleteMapping("/{connectionId}")
    public ResponseEntity<Void> remove(
            @PathVariable Long connectionId,
            Authentication authentication) {

        connectionService.remove(authentication.getName(), connectionId);
        return ResponseEntity.noContent().build();
    }
}
