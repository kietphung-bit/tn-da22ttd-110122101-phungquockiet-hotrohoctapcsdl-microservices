package com.dbdesignassitant.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
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
@Table(name = "sample_solutions")
public class SampleSolution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sample_solution_id")
    private Long sampleSolutionId;

    @OneToOne
    @JoinColumn(name = "exercise_id", nullable = false, unique = true)
    private Exercise exercise;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "solution_data", columnDefinition = "jsonb")
    private Map<String, Object> solutionData;
}
