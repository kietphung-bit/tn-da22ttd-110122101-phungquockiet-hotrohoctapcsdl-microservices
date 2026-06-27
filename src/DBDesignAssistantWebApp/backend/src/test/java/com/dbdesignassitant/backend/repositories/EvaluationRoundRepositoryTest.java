package com.dbdesignassitant.backend.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.dbdesignassitant.backend.entities.EvaluationRound;
import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.Submission;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.SubmissionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.seed.enabled=false")
@Transactional
class EvaluationRoundRepositoryTest {

    @Autowired
    private EvaluationRoundRepository evaluationRoundRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    void findAdminMonitoringRoundsWithoutProviderFilterRunsAgainstPostgres() {
        EvaluationRound round = createRound("MOCK", SubmissionStatus.FAILED, true);

        List<EvaluationRound> rounds = evaluationRoundRepository.findAdminMonitoringRounds(
                SubmissionStatus.FAILED,
                true,
                round.getSubmission().getSubmissionId(),
                round.getSubmission().getUser().getUserId());

        assertEquals(1, rounds.size());
        assertEquals(round.getRoundId(), rounds.get(0).getRoundId());
    }

    @Test
    void findAdminMonitoringRoundsByProviderMatchesCaseInsensitiveProvider() {
        EvaluationRound round = createRound("mock", SubmissionStatus.GRADED, false);

        List<EvaluationRound> rounds = evaluationRoundRepository.findAdminMonitoringRoundsByProvider(
                SubmissionStatus.GRADED,
                "MOCK",
                false,
                round.getSubmission().getSubmissionId(),
                round.getSubmission().getUser().getUserId());

        assertEquals(1, rounds.size());
        assertEquals(round.getRoundId(), rounds.get(0).getRoundId());
    }

    private EvaluationRound createRound(String provider, SubmissionStatus status, boolean fallbackUsed) {
        long unique = System.nanoTime();
        Role studentRole = roleRepository.findByRoleName(RoleName.STUDENT)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .roleName(RoleName.STUDENT)
                        .build()));
        User student = userRepository.save(User.builder()
                .userEmail("repo-monitor-" + unique + "@dbdesign.local")
                .passwordHash("hash")
                .fullName("Repository Monitoring Student")
                .role(studentRole)
                .isActive(true)
                .build());
        Exercise exercise = exerciseRepository.save(Exercise.builder()
                .exTitle("Repository Monitoring Exercise " + unique)
                .exDescription("Repository monitoring test exercise")
                .exerciseSource(ExerciseSource.MANUAL)
                .exerciseCode("REPO-MON-" + unique)
                .scenarioData(Map.<String, Object>of("requirements", List.of()))
                .createdBy(student)
                .isPublished(true)
                .build());
        Submission submission = submissionRepository.save(Submission.builder()
                .user(student)
                .exercise(exercise)
                .diagramData(Map.<String, Object>of("entities", List.of()))
                .submissionStatus(status)
                .submittedAt(LocalDateTime.now())
                .build());
        return evaluationRoundRepository.save(EvaluationRound.builder()
                .submission(submission)
                .roundNumber(1)
                .diagramDataSnapshot(Map.<String, Object>of("entities", List.of()))
                .roundStatus(status)
                .provider(provider)
                .model("mock-rule-based")
                .fallbackUsed(fallbackUsed)
                .fallbackFrom(fallbackUsed ? "GEMINI" : null)
                .submittedAt(LocalDateTime.now())
                .gradedAt(status == SubmissionStatus.GRADED ? LocalDateTime.now() : null)
                .build());
    }
}
