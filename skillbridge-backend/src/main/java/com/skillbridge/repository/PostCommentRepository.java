package com.skillbridge.repository;

import com.skillbridge.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    long countByPostId(Long postId);

    // [postId, commentCount] for a page of posts
    @Query("""
            select c.post.id, count(c) from PostComment c
            where c.post.id in :postIds
            group by c.post.id
            """)
    List<Object[]> countByPostIds(@Param("postIds") Collection<Long> postIds);

    @Modifying
    @Query("delete from PostComment c where c.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
