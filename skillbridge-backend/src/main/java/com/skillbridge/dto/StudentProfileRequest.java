
package com.skillbridge.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

// The dashboard sends back the whole profile it loaded (id, profileCompletion...)
@JsonIgnoreProperties(ignoreUnknown = true)
public class StudentProfileRequest {

    @Size(max = 30, message = "Phone cannot exceed 30 characters")
    private String phone;

    @Size(max = 255, message = "College cannot exceed 255 characters")
    private String college;

    @Size(max = 255, message = "Degree cannot exceed 255 characters")
    private String degree;

    @Size(max = 255, message = "Branch cannot exceed 255 characters")
    private String branch;

    @Min(value = 1950, message = "Graduation year looks invalid")
    @Max(value = 2100, message = "Graduation year looks invalid")
    private Integer graduationYear;

    @Size(max = 255)
    private String resumeUrl;

    @Size(max = 255)
    private String githubUrl;

    @Size(max = 255)
    private String linkedinUrl;

    @Size(max = 255)
    private String portfolioUrl;

    @Size(max = 2000, message = "Bio cannot exceed 2000 characters")
    private String bio;

    @Size(max = 255, message = "Headline cannot exceed 255 characters")
    private String headline;

    @Size(max = 255, message = "Location cannot exceed 255 characters")
    private String location;

    @Size(max = 1000, message = "Career goals cannot exceed 1000 characters")
    private String careerGoals;

    // null = leave unchanged (older clients don't send these)
    @Size(max = 50, message = "You can list at most 50 skills")
    private List<String> skills;

    @Size(max = 30, message = "You can list at most 30 interests")
    private List<String> interests;

    public StudentProfileRequest() {
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

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getInterests() {
        return interests;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }
}
