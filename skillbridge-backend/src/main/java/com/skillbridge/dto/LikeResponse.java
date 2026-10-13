package com.skillbridge.dto;

public record LikeResponse(Long postId, boolean liked, long likeCount) {
}
