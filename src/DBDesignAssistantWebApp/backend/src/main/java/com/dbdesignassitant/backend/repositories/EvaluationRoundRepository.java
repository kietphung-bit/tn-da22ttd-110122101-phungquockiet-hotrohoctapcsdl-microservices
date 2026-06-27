package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.EvaluationRound;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EvaluationRoundRepository extends JpaRepository<EvaluationRound, Long> {
    long countBySubmission_SubmissionId(Long submissionId);
    Optional<EvaluationRound> findTopBySubmission_SubmissionIdOrderByRoundNumberDesc(Long submissionId);
    Optional<EvaluationRound> findTopBySubmission_SubmissionIdAndRoundStatusOrderByRoundNumberDesc(
            Long submissionId,
            SubmissionStatus roundStatus);
    List<EvaluationRound> findAllBySubmission_SubmissionIdOrderByRoundNumberAsc(Long submissionId);

    @Query("""
            select round
            from EvaluationRound round
            join fetch round.submission submission
            join fetch submission.user student
            where (:status is null or round.roundStatus = :status)
              and (:fallbackUsed is null or round.fallbackUsed = :fallbackUsed)
              and (:submissionId is null or submission.submissionId = :submissionId)
              and (:studentId is null or student.userId = :studentId)
            order by round.submittedAt desc nulls last, round.roundId desc
            """)
    List<EvaluationRound> findAdminMonitoringRounds(
            @Param("status") SubmissionStatus status,
            @Param("fallbackUsed") Boolean fallbackUsed,
            @Param("submissionId") Long submissionId,
            @Param("studentId") Long studentId);

    @Query("""
            select round
            from EvaluationRound round
            join fetch round.submission submission
            join fetch submission.user student
            where (:status is null or round.roundStatus = :status)
              and upper(round.provider) = :provider
              and (:fallbackUsed is null or round.fallbackUsed = :fallbackUsed)
              and (:submissionId is null or submission.submissionId = :submissionId)
              and (:studentId is null or student.userId = :studentId)
            order by round.submittedAt desc nulls last, round.roundId desc
            """)
    List<EvaluationRound> findAdminMonitoringRoundsByProvider(
            @Param("status") SubmissionStatus status,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed,
            @Param("submissionId") Long submissionId,
            @Param("studentId") Long studentId);

    @Query(value = """
            SELECT
                COUNT(r.round_id),
                COUNT(CASE WHEN r.round_status = 'GRADED' THEN 1 END),
                COUNT(CASE WHEN r.round_status = 'FAILED' THEN 1 END),
                COUNT(CASE WHEN r.round_status = 'PROCESSING' THEN 1 END),
                AVG(CASE WHEN r.round_status = 'GRADED' THEN r.overall_score END),
                COUNT(CASE WHEN r.fallback_used IS TRUE THEN 1 END)
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
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
    Object[] findAdminPracticeRoundSummary(
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
                COALESCE(NULLIF(r.provider, ''), 'UNKNOWN') AS provider,
                COALESCE(NULLIF(r.model, ''), 'UNKNOWN') AS model,
                COUNT(r.round_id),
                COUNT(CASE WHEN r.round_status = 'GRADED' THEN 1 END),
                COUNT(CASE WHEN r.round_status = 'FAILED' THEN 1 END),
                COUNT(CASE WHEN r.fallback_used IS TRUE THEN 1 END),
                AVG(CASE WHEN r.round_status = 'GRADED' THEN r.overall_score END)
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
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
            GROUP BY COALESCE(NULLIF(r.provider, ''), 'UNKNOWN'), COALESCE(NULLIF(r.model, ''), 'UNKNOWN')
            ORDER BY COUNT(r.round_id) DESC, provider ASC, model ASC
            """, nativeQuery = true)
    List<Object[]> findAdminPracticeProviderBreakdown(
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
                r.round_id,
                s.submission_id,
                u.user_id,
                u.full_name,
                u.user_email,
                r.round_number,
                r.round_status,
                r.overall_score,
                r.provider,
                r.model,
                r.fallback_used,
                r.fallback_from,
                r.submitted_at,
                r.graded_at
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN users u ON u.user_id = s.user_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
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
            ORDER BY r.submitted_at DESC NULLS LAST, r.round_id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findAdminPracticeRecentRounds(
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("status") String status,
            @Param("roundStatus") String roundStatus,
            @Param("exerciseSource") String exerciseSource,
            @Param("exerciseId") Long exerciseId,
            @Param("studentId") Long studentId,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed,
            @Param("limit") int limit);

    @Query(value = """
            SELECT
                issue.error_type,
                COUNT(*),
                COUNT(DISTINCT r.submission_id)
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(r.details_snapshot) = 'array' THEN r.details_snapshot
                    ELSE '[]'::jsonb
                END
            ) detail
            CROSS JOIN LATERAL (
                SELECT NULLIF(detail ->> 'errorType', '') AS error_type
            ) issue
            WHERE issue.error_type IS NOT NULL
              AND (CAST(:fromTime AS timestamp) IS NULL
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
            GROUP BY issue.error_type
            ORDER BY COUNT(*) DESC, issue.error_type ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findAdminPracticeTopIssueTypes(
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            @Param("status") String status,
            @Param("roundStatus") String roundStatus,
            @Param("exerciseSource") String exerciseSource,
            @Param("exerciseId") Long exerciseId,
            @Param("studentId") Long studentId,
            @Param("provider") String provider,
            @Param("fallbackUsed") Boolean fallbackUsed,
            @Param("limit") int limit);

    @Query(value = """
            SELECT
                COUNT(r.round_id),
                COUNT(CASE WHEN r.round_status = 'GRADED' THEN 1 END),
                COUNT(CASE WHEN r.round_status = 'FAILED' THEN 1 END),
                COUNT(CASE WHEN r.round_status = 'PROCESSING' THEN 1 END),
                AVG(CASE WHEN r.round_status = 'GRADED' THEN r.overall_score END),
                COUNT(CASE WHEN r.fallback_used IS TRUE THEN 1 END)
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
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
    Object[] findInstructorPracticeRoundSummary(
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
                issue.error_type,
                COUNT(*),
                COUNT(DISTINCT r.submission_id)
            FROM evaluation_rounds r
            JOIN submissions s ON s.submission_id = r.submission_id
            JOIN exercises e ON e.exercise_id = s.exercise_id
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(r.details_snapshot) = 'array' THEN r.details_snapshot
                    ELSE '[]'::jsonb
                END
            ) detail
            CROSS JOIN LATERAL (
                SELECT NULLIF(detail ->> 'errorType', '') AS error_type
            ) issue
            WHERE issue.error_type IS NOT NULL
              AND (
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
            GROUP BY issue.error_type
            ORDER BY COUNT(*) DESC, issue.error_type ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findInstructorPracticeTopIssueTypes(
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
