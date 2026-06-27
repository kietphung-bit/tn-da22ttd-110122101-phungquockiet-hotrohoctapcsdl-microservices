package com.dbdesignassitant.backend.entities;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "evaluation_rounds",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_evaluation_round_submission_number",
                columnNames = {"submission_id", "round_number"}))
public class EvaluationRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "round_id")
    private Long roundId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @Column(name = "round_number", nullable = false)
    private Integer roundNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diagram_data_snapshot", columnDefinition = "jsonb")
    private Map<String, Object> diagramDataSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_status", nullable = false, columnDefinition = "varchar(20)")
    private SubmissionStatus roundStatus;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "provider", length = 50)
    private String provider;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "fallback_used")
    private Boolean fallbackUsed;

    @Column(name = "fallback_from", length = 50)
    private String fallbackFrom;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details_snapshot", columnDefinition = "jsonb")
    private List<Map<String, Object>> detailsSnapshot;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
