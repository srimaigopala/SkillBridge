package com.skillbridge.repository;

import com.skillbridge.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    long countByPostId(Long postId);

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    // [postId, likeCount] for a page of posts
    @Query("""
            select l.post.id, count(l) from PostLike l
            where l.post.id in :postIds
            group by l.post.id
            """)
    List<Object[]> countByPostIds(@Param("postIds") Collection<Long> postIds);

    @Query("""
            select l.post.id from PostLike l
            where l.user.id = :userId and l.post.id in :postIds
            """)
    List<Long> findLikedPostIds(
            @Param("userId") Long userId,
            @Param("postIds") Collection<Long> postIds);

    @Modifying
    @Query("delete from PostLike l where l.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
