package com.dbdesignassitant.backend.entities;

import com.dbdesignassitant.backend.enums.SubmissionStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
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
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long submissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diagram_data", columnDefinition = "jsonb")
    private Map<String, Object> diagramData;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "submission_status", nullable = false, columnDefinition = "varchar(20)")
    private SubmissionStatus submissionStatus = SubmissionStatus.DRAFT;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Builder.Default
    @Column(name = "student_archived")
    private Boolean studentArchived = false;

    @Column(name = "student_archived_at")
    private LocalDateTime studentArchivedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (studentArchived == null) {
            studentArchived = false;
        }
    }
}
