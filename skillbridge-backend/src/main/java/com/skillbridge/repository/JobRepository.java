
package com.skillbridge.repository;

import com.skillbridge.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatus(String status);

    long countByStatus(String status);

    List<Job> findByTitleContainingIgnoreCase(String title);

    List<Job> findByLocationContainingIgnoreCase(String location);

    Optional<Job> findByIdAndRecruiterEmail(Long id, String email);

    List<Job> findByRecruiterEmail(String email);

    // Every filter is optional; null means "don't filter on this"
    @Query("""
            select j from Job j
            where (:title is null
                    or lower(j.title) like lower(concat('%', :title, '%'))
                    or lower(j.companyName) like lower(concat('%', :title, '%')))
              and (:location is null
                    or lower(j.location) like lower(concat('%', :location, '%')))
              and (:status is null or upper(j.status) = :status)
              and (:skill is null
                    or lower(j.requiredSkills) like lower(concat('%', :skill, '%')))
            order by j.createdAt desc
            """)
    List<Job> search(
            @Param("title") String title,
            @Param("location") String location,
            @Param("status") String status,
            @Param("skill") String skill);
}
