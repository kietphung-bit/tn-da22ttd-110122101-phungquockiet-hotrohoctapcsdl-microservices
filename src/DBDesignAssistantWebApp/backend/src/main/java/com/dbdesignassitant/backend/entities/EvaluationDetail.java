package com.dbdesignassitant.backend.entities;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "evaluation_details")
public class EvaluationDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detail_id")
    private Long detailId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_evaluation_id", nullable = false)
    private AIEvaluation aiEvaluation;

    @Column(name = "error_type")
    private String errorType;

    @Column(name = "eva_description", columnDefinition = "text")
    private String evaDescription;

    @Column(name = "error_location")
    private String errorLocation;
}
