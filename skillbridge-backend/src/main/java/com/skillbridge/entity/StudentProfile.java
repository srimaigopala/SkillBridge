
package com.skillbridge.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String phone;
    private String college;
    private String degree;
    private String branch;
    private Integer graduationYear;
    private String resumeUrl;
    private String githubUrl;
    private String linkedinUrl;
    private String portfolioUrl;

    @Column(length = 2000)
    private String bio;

    // Career information
    private String headline;

    private String location;

    @Column(length = 1000)
    private String careerGoals;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "student_profile_skills",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "skill", nullable = false)
    @OrderBy
    private Set<String> skills = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "student_profile_interests",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "interest", nullable = false)
    @OrderBy
    private Set<String> interests = new LinkedHashSet<>();

    // Uploaded résumé (PDF stored on disk, text kept for re-parsing)
    private String resumeFileName;

    private String resumeStoragePath;

    @Lob
    private String resumeText;

    // Skills the parser found in the latest résumé
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "student_profile_resume_skills",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "skill", nullable = false)
    @OrderBy
    private Set<String> resumeSkills = new LinkedHashSet<>();

    private LocalDateTime resumeUploadedAt;

    private LocalDateTime updatedAt;

    public StudentProfile() {
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCollege() {
        return college;
    }

    public void setCollege(String college) {
        this.college = college;
    }

    public String getDegree() {
        return degree;
    }

    public void setDegree(String degree) {
        this.degree = degree;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public Integer getGraduationYear() {
        return graduationYear;
    }

    public void setGraduationYear(Integer graduationYear) {
        this.graduationYear = graduationYear;
    }

    public String getResumeUrl() {
        return resumeUrl;
    }

    public void setResumeUrl(String resumeUrl) {
        this.resumeUrl = resumeUrl;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getPortfolioUrl() {
        return portfolioUrl;
    }

    public void setPortfolioUrl(String portfolioUrl) {
        this.portfolioUrl = portfolioUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getCareerGoals() {
        return careerGoals;
    }

    public void setCareerGoals(String careerGoals) {
        this.careerGoals = careerGoals;
    }

    public Set<String> getSkills() {
        return skills;
    }

    public void setSkills(Set<String> skills) {
        this.skills.clear();
        this.skills.addAll(skills);
    }

    public Set<String> getInterests() {
        return interests;
    }

    public void setInterests(Set<String> interests) {
        this.interests.clear();
        this.interests.addAll(interests);
    }

    public String getResumeFileName() {
        return resumeFileName;
    }

    public void setResumeFileName(String resumeFileName) {
        this.resumeFileName = resumeFileName;
    }

    public String getResumeStoragePath() {
        return resumeStoragePath;
    }

    public void setResumeStoragePath(String resumeStoragePath) {
        this.resumeStoragePath = resumeStoragePath;
    }

    public String getResumeText() {
        return resumeText;
    }

    public void setResumeText(String resumeText) {
        this.resumeText = resumeText;
    }

    public Set<String> getResumeSkills() {
        return resumeSkills;
    }

    public void setResumeSkills(Set<String> resumeSkills) {
        this.resumeSkills.clear();
        this.resumeSkills.addAll(resumeSkills);
    }

    public LocalDateTime getResumeUploadedAt() {
        return resumeUploadedAt;
    }

    public void setResumeUploadedAt(LocalDateTime resumeUploadedAt) {
        this.resumeUploadedAt = resumeUploadedAt;
    }

    public boolean hasUploadedResume() {
        return resumeStoragePath != null;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        updatedAt = LocalDateTime.now();
    }
}
