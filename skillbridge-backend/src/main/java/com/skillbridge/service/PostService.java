package com.skillbridge.service;

import com.skillbridge.dto.CommentRequest;
import com.skillbridge.dto.CommentResponse;
import com.skillbridge.dto.LikeResponse;
import com.skillbridge.dto.PageResponse;
import com.skillbridge.dto.PostRequest;
import com.skillbridge.dto.PostResponse;
import com.skillbridge.dto.UserSummary;
import com.skillbridge.entity.Post;
import com.skillbridge.entity.PostComment;
import com.skillbridge.entity.PostLike;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.PostCommentRepository;
import com.skillbridge.repository.PostLikeRepository;
import com.skillbridge.repository.PostRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Community feed: students post, like and comment; everyone signed in can read;
// admins can remove posts and comments
@Service
public class PostService {

    private static final int MAX_PAGE_SIZE = 50;

    private final PostRepository postRepository;
    private final PostLikeRepository likeRepository;
    private final PostCommentRepository commentRepository;
    private final UserService userService;

    public PostService(
            PostRepository postRepository,
            PostLikeRepository likeRepository,
            PostCommentRepository commentRepository,
            UserService userService) {
        this.postRepository = postRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getFeed(String email, int page, int size) {
        User viewer = userService.getCurrentUser(email);
        return toPage(
                postRepository.findAllByOrderByCreatedAtDesc(pageRequest(page, size)),
                viewer);
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getPostsByAuthor(
            String email, Long authorId, int page, int size) {
        User viewer = userService.getCurrentUser(email);
        return toPage(
                postRepository.findByAuthorIdOrderByCreatedAtDesc(
                        authorId, pageRequest(page, size)),
                viewer);
    }

    @Transactional(readOnly = true)
    public PostResponse getPost(String email, Long postId) {
        User viewer = userService.getCurrentUser(email);
        return toResponse(findPost(postId), viewer);
    }

    @Transactional
    public PostResponse createPost(String email, PostRequest request) {

        User author = userService.requireRole(email, Role.STUDENT);

        Post post = new Post();
        post.setAuthor(author);
        post.setContent(request.content().trim());

        return toResponse(postRepository.save(post), author);
    }

    @Transactional
    public PostResponse updatePost(String email, Long postId, PostRequest request) {

        User user = userService.getCurrentUser(email);
        Post post = findPost(postId);

        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You can only edit your own posts");
        }

        post.setContent(request.content().trim());

        return toResponse(postRepository.save(post), user);
    }

    @Transactional
    public void deletePost(String email, Long postId) {

        User user = userService.getCurrentUser(email);
        Post post = findPost(postId);

        if (!post.getAuthor().getId().equals(user.getId())
                && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You can only delete your own posts");
        }

        likeRepository.deleteByPostId(postId);
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    // Idempotent: liking twice keeps one like
    @Transactional
    public LikeResponse like(String email, Long postId) {

        User user = userService.requireRole(email, Role.STUDENT);
        Post post = findPost(postId);

        if (likeRepository.findByPostIdAndUserId(postId, user.getId()).isEmpty()) {
            likeRepository.saveAndFlush(new PostLike(post, user));
        }

        return new LikeResponse(postId, true, likeRepository.countByPostId(postId));
    }

    @Transactional
    public LikeResponse unlike(String email, Long postId) {

        User user = userService.requireRole(email, Role.STUDENT);
        findPost(postId);

        likeRepository.findByPostIdAndUserId(postId, user.getId())
                .ifPresent(likeRepository::delete);

        return new LikeResponse(postId, false, likeRepository.countByPostId(postId));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(String email, Long postId) {

        User viewer = userService.getCurrentUser(email);
        Post post = findPost(postId);

        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(comment -> toResponse(comment, post, viewer))
                .toList();
    }

    @Transactional
    public CommentResponse addComment(String email, Long postId, CommentRequest request) {

        User author = userService.requireRole(email, Role.STUDENT);
        Post post = findPost(postId);

        PostComment comment = new PostComment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.content().trim());

        return toResponse(commentRepository.save(comment), post, author);
    }

    // Comment author, post author or an admin can delete a comment
    @Transactional
    public void deleteComment(String email, Long postId, Long commentId) {

        User user = userService.getCurrentUser(email);

        PostComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getPost().getId().equals(postId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Comment not found"));

        if (!canDeleteComment(comment, comment.getPost(), user)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You cannot delete this comment");
        }

        commentRepository.delete(comment);
    }

    private Post findPost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Post not found"));
    }

    private static PageRequest pageRequest(int page, int size) {
        return PageRequest.of(
                Math.max(page, 0),
                Math.max(1, Math.min(size, MAX_PAGE_SIZE)));
    }

    private PageResponse<PostResponse> toPage(Page<Post> page, User viewer) {

        List<Long> ids = page.getContent().stream().map(Post::getId).toList();

        Map<Long, Long> likeCounts = new HashMap<>();
        Map<Long, Long> commentCounts = new HashMap<>();
        Set<Long> liked = new HashSet<>();

        if (!ids.isEmpty()) {
            likeRepository.countByPostIds(ids)
                    .forEach(row -> likeCounts.put((Long) row[0], (Long) row[1]));
            commentRepository.countByPostIds(ids)
                    .forEach(row -> commentCounts.put((Long) row[0], (Long) row[1]));
            liked.addAll(likeRepository.findLikedPostIds(viewer.getId(), ids));
        }

        return PageResponse.map(page, post -> toResponse(
                post,
                viewer,
                likeCounts.getOrDefault(post.getId(), 0L),
                commentCounts.getOrDefault(post.getId(), 0L),
                liked.contains(post.getId())));
    }

    private PostResponse toResponse(Post post, User viewer) {
        return toResponse(
                post,
                viewer,
                likeRepository.countByPostId(post.getId()),
                commentRepository.countByPostId(post.getId()),
                likeRepository.findByPostIdAndUserId(post.getId(), viewer.getId()).isPresent());
    }

    private static PostResponse toResponse(
            Post post, User viewer, long likes, long comments, boolean likedByMe) {

        boolean isAuthor = post.getAuthor().getId().equals(viewer.getId());

        return new PostResponse(
                post.getId(),
                UserSummary.from(post.getAuthor()),
                post.getContent(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                likes,
                comments,
                likedByMe,
                isAuthor,
                isAuthor || viewer.getRole() == Role.ADMIN);
    }

    private static CommentResponse toResponse(PostComment comment, Post post, User viewer) {
        return new CommentResponse(
                comment.getId(),
                post.getId(),
                UserSummary.from(comment.getAuthor()),
                comment.getContent(),
                comment.getCreatedAt(),
                canDeleteComment(comment, post, viewer));
    }

    private static boolean canDeleteComment(PostComment comment, Post post, User user) {
        return comment.getAuthor().getId().equals(user.getId())
                || post.getAuthor().getId().equals(user.getId())
                || user.getRole() == Role.ADMIN;
    }
}
