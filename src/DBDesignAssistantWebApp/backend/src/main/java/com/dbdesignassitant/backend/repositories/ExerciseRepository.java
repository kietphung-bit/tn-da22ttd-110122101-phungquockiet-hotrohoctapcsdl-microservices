package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
	Optional<Exercise> findByExTitle(String exTitle);

	Optional<Exercise> findByExerciseCode(String exerciseCode);

	boolean existsByExerciseCode(String exerciseCode);

	@Query("SELECT e FROM Exercise e "
			+ "WHERE (:search IS NULL OR :search = '' "
			+ "OR LOWER(e.exTitle) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exDescription) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exerciseCode) LIKE LOWER(CONCAT('%', :search, '%'))) "
			+ "AND (:source IS NULL OR e.exerciseSource = :source) "
			+ "AND (:published IS NULL OR e.isPublished = :published)")
	List<Exercise> findAllWithFilters(
			@Param("search") String search,
			@Param("source") ExerciseSource source,
			@Param("published") Boolean published);

	@Query("SELECT e FROM Exercise e "
			+ "WHERE e.createdBy.id = :createdById "
			+ "AND (:search IS NULL OR :search = '' "
			+ "OR LOWER(e.exTitle) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exDescription) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exerciseCode) LIKE LOWER(CONCAT('%', :search, '%'))) "
			+ "AND (:published IS NULL OR e.isPublished = :published)")
	List<Exercise> findAllInstructorExercisesWithFilters(
			@Param("createdById") Long createdById,
			@Param("search") String search,
			@Param("published") Boolean published);

	@Query("SELECT e FROM Exercise e "
			+ "WHERE ("
			+ "(e.exerciseSource = com.dbdesignassitant.backend.enums.ExerciseSource.MANUAL AND e.isPublished = true) "
			+ "OR (e.exerciseSource = com.dbdesignassitant.backend.enums.ExerciseSource.AI_GENERATED "
			+ "AND e.ownerStudent.userId = :studentId)"
			+ ") "
			+ "AND (:search IS NULL OR :search = '' "
			+ "OR LOWER(e.exTitle) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exDescription) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exerciseCode) LIKE LOWER(CONCAT('%', :search, '%')))")
	List<Exercise> findStudentVisibleExercises(
			@Param("studentId") Long studentId,
			@Param("search") String search);

	@Query("SELECT e FROM Exercise e "
			+ "WHERE e.exerciseSource = com.dbdesignassitant.backend.enums.ExerciseSource.MANUAL "
			+ "AND e.isPublished = true "
			+ "AND (:search IS NULL OR :search = '' "
			+ "OR LOWER(e.exTitle) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exDescription) LIKE LOWER(CONCAT('%', :search, '%')) "
			+ "OR LOWER(e.exerciseCode) LIKE LOWER(CONCAT('%', :search, '%')))")
	List<Exercise> findPublishedManualExercisesForGeneration(@Param("search") String search);

	@Query("SELECT e.createdBy.userId FROM Exercise e WHERE e.exerciseId = :exerciseId")
	Optional<Long> findCreatedByIdByExerciseId(@Param("exerciseId") Long exerciseId);

	@Query("SELECT e.exerciseId, e.exerciseCode, e.exTitle, e.exerciseSource, e.isPublished "
			+ "FROM Exercise e WHERE e.exerciseId = :exerciseId")
	Optional<Object[]> findPracticeInsightsExerciseHeader(@Param("exerciseId") Long exerciseId);

	@Query("SELECT COUNT(e.exerciseId) FROM Exercise e "
			+ "WHERE e.exerciseSource = com.dbdesignassitant.backend.enums.ExerciseSource.AI_GENERATED "
			+ "AND e.baseExercise.exerciseId = :baseExerciseId")
	long countDerivedAiExercises(@Param("baseExerciseId") Long baseExerciseId);
}
