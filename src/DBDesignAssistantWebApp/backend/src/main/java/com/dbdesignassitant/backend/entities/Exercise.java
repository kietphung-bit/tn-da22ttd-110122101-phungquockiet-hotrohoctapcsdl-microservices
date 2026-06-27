package com.dbdesignassitant.backend.entities;

import com.dbdesignassitant.backend.enums.ExerciseSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exercise_id")
    private Long exerciseId;

    @Column(name = "ex_title", nullable = false)
    private String exTitle;

    @Column(name = "ex_description", columnDefinition = "text")
    private String exDescription;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "exercise_source", nullable = false, columnDefinition = "varchar(20)")
    private ExerciseSource exerciseSource = ExerciseSource.MANUAL;

    @Column(name = "exercise_code", unique = true)
    private String exerciseCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scenario_data", columnDefinition = "jsonb")
    private Map<String, Object> scenarioData;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "owner_student_id")
    private User ownerStudent;

    @ManyToOne
    @JoinColumn(name = "base_exercise_id")
    private Exercise baseExercise;

    @Column(name = "is_published", nullable = false)
    private Boolean isPublished;
}
