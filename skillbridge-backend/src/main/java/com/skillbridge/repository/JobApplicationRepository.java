
package com.skillbridge.repository;

import com.skillbridge.entity.ApplicationStatus;
import com.skillbridge.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JobApplicationRepository
        extends JpaRepository<JobApplication, Long> {

    boolean existsByStudentIdAndJobId(Long studentId, Long jobId);

    List<JobApplication> findByStudentId(Long studentId);

    List<JobApplication> findByJobId(Long jobId);

    List<JobApplication> findByStudentEmail(String email);

    List<JobApplication> findByJobRecruiterEmail(String recruiterEmail);

    long countByStatus(ApplicationStatus status);

    @Modifying
    @Query("delete from JobApplication a where a.job.id = :jobId")
    void deleteByJobId(@Param("jobId") Long jobId);
}
