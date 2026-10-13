package com.skillbridge.controller;

import com.skillbridge.dto.CommentRequest;
import com.skillbridge.dto.CommentResponse;
import com.skillbridge.dto.LikeResponse;
import com.skillbridge.dto.PageResponse;
import com.skillbridge.dto.PostRequest;
import com.skillbridge.dto.PostResponse;
import com.skillbridge.service.PostService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Community feed
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<PostResponse>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        return ResponseEntity.ok(
                postService.getFeed(authentication.getName(), page, size));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<PostResponse>> getPostsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        return ResponseEntity.ok(postService.getPostsByAuthor(
                authentication.getName(), userId, page, size));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PostResponse> getPost(
            @PathVariable Long postId,
            Authentication authentication) {

        return ResponseEntity.ok(
                postService.getPost(authentication.getName(), postId));
    }

    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @Valid @RequestBody PostRequest request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createPost(authentication.getName(), request));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Long postId,
            @Valid @RequestBody PostRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                postService.updatePost(authentication.getName(), postId, request));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long postId,
            Authentication authentication) {

        postService.deletePost(authentication.getName(), postId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<LikeResponse> like(
            @PathVariable Long postId,
            Authentication authentication) {

        return ResponseEntity.ok(postService.like(authentication.getName(), postId));
    }

    @DeleteMapping("/{postId}/like")
    public ResponseEntity<LikeResponse> unlike(
            @PathVariable Long postId,
            Authentication authentication) {

        return ResponseEntity.ok(postService.unlike(authentication.getName(), postId));
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long postId,
            Authentication authentication) {

        return ResponseEntity.ok(
                postService.getComments(authentication.getName(), postId));
    }

    @PostMapping("/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long postId,
            @Valid @RequestBody CommentRequest request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.addComment(authentication.getName(), postId, request));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            Authentication authentication) {

        postService.deleteComment(authentication.getName(), postId, commentId);
        return ResponseEntity.noContent().build();
    }
}
