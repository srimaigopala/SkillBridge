package com.skillbridge.repository;

import com.skillbridge.entity.Connection;
import com.skillbridge.entity.ConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, Long> {

    // The single connection row between two users, in either direction
    @Query("""
            select c from Connection c
            where (c.requester.id = :a and c.receiver.id = :b)
               or (c.requester.id = :b and c.receiver.id = :a)
            """)
    Optional<Connection> findBetween(
            @Param("a") Long userA,
            @Param("b") Long userB);

    @Query("""
            select c from Connection c
            where c.requester.id = :userId or c.receiver.id = :userId
            """)
    List<Connection> findAllInvolving(@Param("userId") Long userId);

    @Query("""
            select c from Connection c
            where c.status = :status
              and (c.requester.id = :userId or c.receiver.id = :userId)
            order by c.respondedAt desc
            """)
    List<Connection> findByUserAndStatus(
            @Param("userId") Long userId,
            @Param("status") ConnectionStatus status);

    List<Connection> findByReceiverIdAndStatusOrderByCreatedAtDesc(
            Long receiverId, ConnectionStatus status);

    List<Connection> findByRequesterIdAndStatusOrderByCreatedAtDesc(
            Long requesterId, ConnectionStatus status);

    long countByStatus(ConnectionStatus status);
}
