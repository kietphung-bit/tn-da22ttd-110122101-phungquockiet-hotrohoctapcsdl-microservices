package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findBySubmissionStatus(SubmissionStatus status);
    List<Submission> findByExercise_ExerciseId(Long exerciseId);
    List<Submission> findByUser_UserId(Long userId);
    List<Submission> findAllByUser_UserIdOrderByCreatedAtDesc(Long userId);
    Optional<Submission> findBySubmissionIdAndUser_UserId(Long submissionId, Long userId);
    List<Submission> findBySubmissionStatusAndExercise_ExerciseId(SubmissionStatus status, Long exerciseId);
    List<Submission> findBySubmissionStatusAndUser_UserId(SubmissionStatus status, Long userId);
    List<Submission> findByExercise_ExerciseIdAndUser_UserId(Long exerciseId, Long userId);
    List<Submission> findBySubmissionStatusAndExercise_ExerciseIdAndUser_UserId(
            SubmissionStatus status, Long exerciseId, Long userId);

    @Query("""
            SELECT s
            FROM Submission s
            WHERE s.user.userId = :userId
              AND (
                  (:archived = true AND s.studentArchived = true)
                  OR (:archived = false AND (s.studentArchived = false OR s.studentArchived IS NULL))
              )
            ORDER BY s.createdAt DESC
            """)
    List<Submission> findStudentSubmissionsByArchiveState(
            @Param("userId") Long userId,
            @Param("archived") boolean archived);

    @Query(value = """
            SELECT
                COUNT(DISTINCT s.submission_id),
                COUNT(DISTINCT s.user_id),
                COUNT(DISTINCT s.exercise_id)
            FROM submissions s
            JOIN exercises e ON e.exercise_id = s.exercise_id
            LEFT JOIN evaluation_rounds r ON r.submission_id = s.submission_id
            WHERE (CAST(:fromTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) >= CAST(:fromTime AS timestamp))
              AND (CAST(:toTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) <= CAST(:toTime AS timestamp))
              AND (CAST(:status AS varchar) IS NULL OR s.submission_status = CAST(:status AS varchar))
              AND (CAST(:roundStatus AS varchar) IS NULL OR r.round_status = CAST(:roundStatus AS varchar))
              AND (CAST(:exerciseSource AS varchar) IS NULL OR e.exercise_source = CAST(:exerciseSource AS varchar))
              AND (CAST(:exerciseId AS bigint) IS NULL OR e.exercise_id = CAST(:exerciseId AS bigint))
              AND (CAST(:studentId AS bigint) IS NULL OR s.user_id = CAST(:studentId AS bigint))
              AND (CAST(:provider AS varchar) IS NULL OR UPPER(r.provider) = CAST(:provider AS varchar))
              AND (CAST(:fallbackUsed AS boolean) IS NULL OR r.fallback_used = CAST(:fallbackUsed AS boolean))
            """, nativeQuery = true)
    Object[] findAdminPracticeSubmissionSummary(
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("status") String status,
            @Param("roundStatus") String roundStatus,
            @Param("exerciseSource") String exerciseSource,
            @Param("exerciseId") Long exerciseId,
            @Param("studentId") Long studentId,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed);

    @Query(value = """
            SELECT s.submission_status, COUNT(DISTINCT s.submission_id)
            FROM submissions s
            JOIN exercises e ON e.exercise_id = s.exercise_id
            LEFT JOIN evaluation_rounds r ON r.submission_id = s.submission_id
            WHERE (CAST(:fromTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) >= CAST(:fromTime AS timestamp))
              AND (CAST(:toTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) <= CAST(:toTime AS timestamp))
              AND (CAST(:status AS varchar) IS NULL OR s.submission_status = CAST(:status AS varchar))
              AND (CAST(:roundStatus AS varchar) IS NULL OR r.round_status = CAST(:roundStatus AS varchar))
              AND (CAST(:exerciseSource AS varchar) IS NULL OR e.exercise_source = CAST(:exerciseSource AS varchar))
              AND (CAST(:exerciseId AS bigint) IS NULL OR e.exercise_id = CAST(:exerciseId AS bigint))
              AND (CAST(:studentId AS bigint) IS NULL OR s.user_id = CAST(:studentId AS bigint))
              AND (CAST(:provider AS varchar) IS NULL OR UPPER(r.provider) = CAST(:provider AS varchar))
              AND (CAST(:fallbackUsed AS boolean) IS NULL OR r.fallback_used = CAST(:fallbackUsed AS boolean))
            GROUP BY s.submission_status
            ORDER BY s.submission_status
            """, nativeQuery = true)
    List<Object[]> findAdminPracticeStatusBreakdown(
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("status") String status,
            @Param("roundStatus") String roundStatus,
            @Param("exerciseSource") String exerciseSource,
            @Param("exerciseId") Long exerciseId,
            @Param("studentId") Long studentId,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed);

    @Query(value = """
            SELECT
                COUNT(DISTINCT CASE WHEN e.exercise_id = CAST(:exerciseId AS bigint) THEN s.submission_id END),
                COUNT(DISTINCT CASE
                    WHEN e.base_exercise_id = CAST(:exerciseId AS bigint)
                     AND e.exercise_source = 'AI_GENERATED'
                    THEN s.submission_id END),
                COUNT(DISTINCT s.user_id),
                COUNT(DISTINCT CASE WHEN s.submission_status = 'GRADED' THEN s.submission_id END),
                COUNT(DISTINCT CASE WHEN s.submission_status = 'FAILED' THEN s.submission_id END),
                COUNT(DISTINCT CASE WHEN s.submission_status = 'PROCESSING' THEN s.submission_id END)
            FROM submissions s
            JOIN exercises e ON e.exercise_id = s.exercise_id
            LEFT JOIN evaluation_rounds r ON r.submission_id = s.submission_id
            WHERE (
                    (CAST(:scope AS varchar) = 'DIRECT' AND e.exercise_id = CAST(:exerciseId AS bigint))
                 OR (CAST(:scope AS varchar) = 'DERIVED_AI'
                        AND e.base_exercise_id = CAST(:exerciseId AS bigint)
                        AND e.exercise_source = 'AI_GENERATED')
                 OR (CAST(:scope AS varchar) = 'ALL'
                        AND (e.exercise_id = CAST(:exerciseId AS bigint)
                            OR (e.base_exercise_id = CAST(:exerciseId AS bigint)
                                AND e.exercise_source = 'AI_GENERATED')))
              )
              AND (CAST(:fromTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) >= CAST(:fromTime AS timestamp))
              AND (CAST(:toTime AS timestamp) IS NULL
                    OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) <= CAST(:toTime AS timestamp))
              AND (CAST(:submissionStatus AS varchar) IS NULL
                    OR s.submission_status = CAST(:submissionStatus AS varchar))
              AND (CAST(:roundStatus AS varchar) IS NULL OR r.round_status = CAST(:roundStatus AS varchar))
              AND (CAST(:roundNumber AS integer) IS NULL OR r.round_number = CAST(:roundNumber AS integer))
              AND (CAST(:provider AS varchar) IS NULL OR UPPER(r.provider) = CAST(:provider AS varchar))
              AND (CAST(:fallbackUsed AS boolean) IS NULL OR r.fallback_used = CAST(:fallbackUsed AS boolean))
            """, nativeQuery = true)
    Object[] findInstructorPracticeSubmissionSummary(
            @Param("exerciseId") Long exerciseId,
            @Param("scope") String scope,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("submissionStatus") String submissionStatus,
            @Param("roundStatus") String roundStatus,
            @Param("roundNumber") Integer roundNumber,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed);

    @Query(value = """
            SELECT
                q.submission_id,
                q.exercise_scope,
                q.submission_status,
                q.rounds_used,
                q.latest_round_status,
                q.latest_score,
                q.submitted_at,
                q.graded_at
            FROM (
                SELECT DISTINCT
                    s.submission_id,
                    CASE
                        WHEN e.exercise_id = CAST(:exerciseId AS bigint) THEN 'DIRECT'
                        ELSE 'DERIVED_AI'
                    END AS exercise_scope,
                    s.submission_status,
                    COALESCE(round_counts.rounds_used, 0) AS rounds_used,
                    latest.round_status AS latest_round_status,
                    latest.overall_score AS latest_score,
                    s.submitted_at,
                    latest.graded_at,
                    COALESCE(latest.submitted_at, s.submitted_at, s.created_at) AS sort_time
                FROM submissions s
                JOIN exercises e ON e.exercise_id = s.exercise_id
                LEFT JOIN evaluation_rounds r ON r.submission_id = s.submission_id
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS rounds_used
                    FROM evaluation_rounds rr
                    WHERE rr.submission_id = s.submission_id
                ) round_counts ON TRUE
                LEFT JOIN LATERAL (
                    SELECT rr.round_status, rr.overall_score, rr.submitted_at, rr.graded_at
                    FROM evaluation_rounds rr
                    WHERE rr.submission_id = s.submission_id
                    ORDER BY rr.round_number DESC, rr.round_id DESC
                    LIMIT 1
                ) latest ON TRUE
                WHERE (
                        (CAST(:scope AS varchar) = 'DIRECT' AND e.exercise_id = CAST(:exerciseId AS bigint))
                     OR (CAST(:scope AS varchar) = 'DERIVED_AI'
                            AND e.base_exercise_id = CAST(:exerciseId AS bigint)
                            AND e.exercise_source = 'AI_GENERATED')
                     OR (CAST(:scope AS varchar) = 'ALL'
                            AND (e.exercise_id = CAST(:exerciseId AS bigint)
                                OR (e.base_exercise_id = CAST(:exerciseId AS bigint)
                                    AND e.exercise_source = 'AI_GENERATED')))
                  )
                  AND (CAST(:fromTime AS timestamp) IS NULL
                        OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) >= CAST(:fromTime AS timestamp))
                  AND (CAST(:toTime AS timestamp) IS NULL
                        OR COALESCE(r.submitted_at, s.submitted_at, s.created_at) <= CAST(:toTime AS timestamp))
                  AND (CAST(:submissionStatus AS varchar) IS NULL
                        OR s.submission_status = CAST(:submissionStatus AS varchar))
                  AND (CAST(:roundStatus AS varchar) IS NULL OR r.round_status = CAST(:roundStatus AS varchar))
                  AND (CAST(:roundNumber AS integer) IS NULL OR r.round_number = CAST(:roundNumber AS integer))
                  AND (CAST(:provider AS varchar) IS NULL OR UPPER(r.provider) = CAST(:provider AS varchar))
                  AND (CAST(:fallbackUsed AS boolean) IS NULL OR r.fallback_used = CAST(:fallbackUsed AS boolean))
            ) q
            ORDER BY q.sort_time DESC NULLS LAST, q.submission_id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findInstructorAnonymizedSubmissionSummaries(
            @Param("exerciseId") Long exerciseId,
            @Param("scope") String scope,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("submissionStatus") String submissionStatus,
            @Param("roundStatus") String roundStatus,
            @Param("roundNumber") Integer roundNumber,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed,
            @Param("limit") int limit);
}
