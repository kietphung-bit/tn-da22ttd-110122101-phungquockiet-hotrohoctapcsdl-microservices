package com.dbdesignassitant.backend.utils;

import com.dbdesignassitant.backend.entities.AIEvaluation;
import com.dbdesignassitant.backend.entities.EvaluationDetail;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.SampleSolution;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import com.dbdesignassitant.backend.enums.UserGender;
import com.dbdesignassitant.backend.repositories.AIEvaluationRepository;
import com.dbdesignassitant.backend.repositories.EvaluationDetailRepository;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.SampleSolutionRepository;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.entities.Skill;
import com.dbdesignassitant.backend.entities.StudentSkillStats;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.SkillRepository;
import com.dbdesignassitant.backend.repositories.StudentSkillStatsRepository;
import com.dbdesignassitant.backend.repositories.SubmissionRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import java.io.InputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
	private final SampleSolutionRepository sampleSolutionRepository;
    private final SubmissionRepository submissionRepository;
    private final AIEvaluationRepository aiEvaluationRepository;
    private final EvaluationDetailRepository evaluationDetailRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final SkillRepository skillRepository;
    private final StudentSkillStatsRepository studentSkillStatsRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
	if (!seedEnabled) {
	    return;
	}

	Role adminRole = roleRepository.findByRoleName(RoleName.ADMIN)
		.orElseGet(() -> roleRepository.save(Role.builder().roleName(RoleName.ADMIN).build()));
	Role instructorRole = roleRepository.findByRoleName(RoleName.INSTRUCTOR)
		.orElseGet(() -> roleRepository.save(Role.builder().roleName(RoleName.INSTRUCTOR).build()));
	Role studentRole = roleRepository.findByRoleName(RoleName.STUDENT)
		.orElseGet(() -> roleRepository.save(Role.builder().roleName(RoleName.STUDENT).build()));

	User admin = ensureUser(
		"admin@dbdesign.local",
		"Admin User",
		UserGender.OTHER,
		LocalDate.of(1995, 1, 12),
		adminRole);
	User instructor = ensureUser(
		"instructor@dbdesign.local",
		"Giảng viên test",
		UserGender.FEMALE,
		LocalDate.of(1992, 6, 20),
		instructorRole);
	User student = ensureUser(
		"student@dbdesign.local",
		"Sinh viên test",
		UserGender.MALE,
		LocalDate.of(2003, 9, 15),
		studentRole);

	ensureExercise(
		"Quản lý thư viện",
		"Thiết kế ERD cho hệ thống thư viện với các thực thể chính như Sách, Thành viên, Mượn trả",
		"MANUAL-000001",
		instructor,
		true);
	ensureExercise(
		"Quản lý ký túc xá",
		"Mô hình dữ liệu cho ký túc xá sinh viên với các thực thể như Sinh viên, Phòng, Đăng ký phòng",
		"MANUAL-000002",
		admin,
		false);
	ensureExercise(
		"Quản lý đăng ký môn học",
		"Mô hình dữ liệu cho đăng ký môn học với các thực thể như Sinh viên, Môn học, Đăng ký",
		"MANUAL-000003",
		instructor,
		true);
	ensureExercise(
		"Quản lý phòng thực hành",
		"Thiết kế ERD cho quản lý phòng thực hành với các thực thể như Phòng, Thiết bị, Đặt phòng",
		"MANUAL-000004",
		admin,
		false);

	seedSampleSolution("MANUAL-000001");

	fillMissingExerciseCodes();

	// Seed submissions and evaluations for admin UI testing
	seedSubmissionsAndEvaluations(student);

	// Seed KnowledgeBase, Skills, and Stats
	seedKnowledgeBase(admin);
	seedSkillsAndStats(student);
    }

    private User ensureUser(
	    String email,
	    String fullName,
	    UserGender gender,
	    LocalDate dob,
	    Role role) {
	return userRepository.findByUserEmail(email)
		.orElseGet(() -> userRepository.save(User.builder()
			.userEmail(email)
			.passwordHash(passwordEncoder.encode("Password123!"))
			.fullName(fullName)
			.userGender(gender)
			.userDob(dob)
			.userPhone("0900000000")
			.userAddress("Hanoi")
			.role(role)
			.isActive(true)
			.build()));
    }

    private Exercise buildExercise(
	    String title,
	    String description,
	    String exerciseCode,
	    User createdBy,
	    boolean isPublished) {
	Map<String, Object> scenario = new HashMap<>();
	scenario.put("summary", description);
	scenario.put("entities", List.of("Student", "Class", "Enrollment"));
	scenario.put("notes", "Seed data for UI testing");

	return Exercise.builder()
		.exTitle(title)
		.exDescription(description)
		.scenarioData(scenario)
		.exerciseSource(ExerciseSource.MANUAL)
		.exerciseCode(exerciseCode)
		.createdBy(createdBy)
		.isPublished(isPublished)
		.build();
    }

    private void ensureExercise(
	    String title,
	    String description,
	    String exerciseCode,
	    User createdBy,
	    boolean isPublished) {
	if (exerciseRepository.findByExTitle(title).isPresent()) {
	    return;
	}
	exerciseRepository.save(buildExercise(title, description, exerciseCode, createdBy, isPublished));
    }

    private void seedSampleSolution(String exerciseCode) {
	Exercise exercise = exerciseRepository.findByExerciseCode(exerciseCode).orElse(null);
	if (exercise == null || exercise.getExerciseSource() != ExerciseSource.MANUAL) {
	    return;
	}
	if (sampleSolutionRepository.existsByExerciseExerciseId(exercise.getExerciseId())) {
	    return;
	}
	Map<String, Object> solution = new HashMap<>();
	solution.put("entities", List.of("Book", "Author", "Member"));
	solution.put("relationships", List.of("BORROWS", "WRITTEN_BY"));
	solution.put("notes", "Sample solution seed data");

	sampleSolutionRepository.save(SampleSolution.builder()
		.exercise(exercise)
		.solutionData(solution)
		.build());
    }

    private void fillMissingExerciseCodes() {
	for (Exercise exercise : exerciseRepository.findAll()) {
	    boolean updated = false;
	    if (exercise.getExerciseSource() == null) {
		exercise.setExerciseSource(ExerciseSource.MANUAL);
		updated = true;
	    }
	    if (exercise.getExerciseCode() == null || exercise.getExerciseCode().isBlank()) {
		String code = String.format("MANUAL-%06d", exercise.getExerciseId());
		if (!exerciseRepository.existsByExerciseCode(code)) {
		    exercise.setExerciseCode(code);
		    updated = true;
		}
	    }
	    if (updated) {
		exerciseRepository.save(exercise);
	    }
	}
    }

    private void seedSubmissionsAndEvaluations(User student) {
	// Only seed if no submissions exist
	if (submissionRepository.count() > 0) {
	    return;
	}

	Exercise ex1 = exerciseRepository.findByExerciseCode("MANUAL-000001").orElse(null);
	Exercise ex3 = exerciseRepository.findByExerciseCode("MANUAL-000003").orElse(null);

	if (ex1 == null || ex3 == null) {
	    return;
	}

	// Submission 1: GRADED
	Map<String, Object> diagram1 = new HashMap<>();
	diagram1.put("entities", List.of(
		Map.of("name", "Book", "attributes", List.of("BookId", "Title", "ISBN")),
		Map.of("name", "Member", "attributes", List.of("MemberId", "FullName", "Email")),
		Map.of("name", "BorrowRecord", "attributes", List.of("RecordId", "BorrowDate", "ReturnDate"))
	));
	diagram1.put("relationships", List.of(
		Map.of("from", "Member", "to", "BorrowRecord", "cardinality", "1-N"),
		Map.of("from", "Book", "to", "BorrowRecord", "cardinality", "1-N")
	));

	Submission sub1 = submissionRepository.save(Submission.builder()
		.user(student)
		.exercise(ex1)
		.diagramData(diagram1)
		.submissionStatus(SubmissionStatus.GRADED)
		.createdAt(LocalDateTime.now().minusDays(3))
		.submittedAt(LocalDateTime.now().minusDays(2))
		.build());

	// Evaluation for submission 1
	AIEvaluation eval1 = aiEvaluationRepository.save(AIEvaluation.builder()
		.submission(sub1)
		.overallScore(new BigDecimal("78.50"))
		.evaluatedAt(LocalDateTime.now().minusDays(1))
		.build());

	evaluationDetailRepository.save(EvaluationDetail.builder()
		.aiEvaluation(eval1)
		.errorType("MISSING_ATTRIBUTE")
		.evaDescription("Entity 'Book' thiếu thuộc tính 'Author'. Cần bổ sung hoặc tạo entity Author riêng.")
		.errorLocation("Entity: Book")
		.build());

	evaluationDetailRepository.save(EvaluationDetail.builder()
		.aiEvaluation(eval1)
		.errorType("CARDINALITY_ERROR")
		.evaDescription("Quan hệ giữa Book và BorrowRecord nên là M-N thông qua bảng trung gian, không phải 1-N trực tiếp.")
		.errorLocation("Relationship: Book -> BorrowRecord")
		.build());

	evaluationDetailRepository.save(EvaluationDetail.builder()
		.aiEvaluation(eval1)
		.errorType("NORMALIZATION_ISSUE")
		.evaDescription("BorrowRecord chứa cả thông tin Book và Member — xem xét tách để đạt 3NF.")
		.errorLocation("Entity: BorrowRecord")
		.build());

	// Submission 2: SUBMITTED (no evaluation yet)
	Map<String, Object> diagram2 = new HashMap<>();
	diagram2.put("entities", List.of(
		Map.of("name", "Student", "attributes", List.of("StudentId", "Name")),
		Map.of("name", "Course", "attributes", List.of("CourseId", "CourseName", "Credits")),
		Map.of("name", "Registration", "attributes", List.of("RegId", "RegDate", "Grade"))
	));
	diagram2.put("relationships", List.of(
		Map.of("from", "Student", "to", "Registration", "cardinality", "1-N"),
		Map.of("from", "Course", "to", "Registration", "cardinality", "1-N")
	));

	submissionRepository.save(Submission.builder()
		.user(student)
		.exercise(ex3)
		.diagramData(diagram2)
		.submissionStatus(SubmissionStatus.SUBMITTED)
		.createdAt(LocalDateTime.now().minusHours(5))
		.submittedAt(LocalDateTime.now().minusHours(2))
		.build());

	// Submission 3: DRAFT
	Map<String, Object> diagram3 = new HashMap<>();
	diagram3.put("entities", List.of(
		Map.of("name", "Student", "attributes", List.of("StudentId", "HoTen"))
	));
	diagram3.put("note", "Work in progress");

	submissionRepository.save(Submission.builder()
		.user(student)
		.exercise(ex1)
		.diagramData(diagram3)
		.submissionStatus(SubmissionStatus.DRAFT)
		.createdAt(LocalDateTime.now().minusMinutes(30))
		.build());
    }

    private void seedKnowledgeBase(User admin) {
        try {
            ClassPathResource resource = new ClassPathResource("seed/knowledge_base_seed.json");
            try (InputStream inputStream = resource.getInputStream()) {
                List<Map<String, String>> kbList = objectMapper.readValue(inputStream, new TypeReference<>() {});
                for (Map<String, String> item : kbList) {
                    KnowledgeBase kb = knowledgeBaseRepository.findAll().stream()
                            .filter(existing -> item.get("kbTitle").equals(existing.getKbTitle()))
                            .findFirst()
                            .orElseGet(KnowledgeBase::new);

                    kb.setKbTitle(item.get("kbTitle"));
                    kb.setKbContent(item.get("kbContent"));
                    kb.setKbCategory(item.get("kbCategory"));
                    kb.setKbSource(item.get("kbSource"));
                    kb.setIsActive(true);
                    kb.setCreatedBy(admin);
                    kb.setApprovalStatus(KnowledgeApprovalStatus.APPROVED);
                    kb.setKnowledgeScope(KnowledgeScope.SYSTEM);

                    knowledgeBaseRepository.save(kb);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to seed knowledge base: " + e.getMessage());
        }
    }

    private void seedSkillsAndStats(User student) {
        if (skillRepository.count() > 0) {
            return;
        }

        Skill skill1 = skillRepository.save(Skill.builder()
                .skillName("Xác định thực thể")
                .skillDescription("Khả năng nhận diện đúng các thực thể từ yêu cầu nghiệp vụ.")
                .skillCategory("Entity")
                .isActive(true)
                .build());

        Skill skill2 = skillRepository.save(Skill.builder()
                .skillName("Xác định thuộc tính")
                .skillDescription("Phân bổ đúng thuộc tính cho thực thể tương ứng.")
                .skillCategory("Attribute")
                .isActive(true)
                .build());

        Skill skill3 = skillRepository.save(Skill.builder()
                .skillName("Chuẩn hóa 1NF")
                .skillDescription("Đảm bảo không có thuộc tính đa trị, lặp lại.")
                .skillCategory("Normalization")
                .isActive(true)
                .build());

        Skill skill4 = skillRepository.save(Skill.builder()
                .skillName("Xác định quan hệ")
                .skillDescription("Nhận diện đúng mối quan hệ và bản số giữa các thực thể.")
                .skillCategory("Relationship")
                .isActive(true)
                .build());

        studentSkillStatsRepository.save(StudentSkillStats.builder()
                .student(student)
                .skill(skill1)
                .proficiencyLevel(85.0)
                .attemptCount(5)
                .lastEvaluatedAt(LocalDateTime.now().minusDays(1))
                .build());

        studentSkillStatsRepository.save(StudentSkillStats.builder()
                .student(student)
                .skill(skill3)
                .proficiencyLevel(60.0)
                .attemptCount(2)
                .lastEvaluatedAt(LocalDateTime.now().minusDays(2))
                .build());
    }
}
