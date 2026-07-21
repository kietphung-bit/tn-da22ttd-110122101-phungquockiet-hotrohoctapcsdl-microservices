package com.dbdesignassitant.backend.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.SampleSolution;
import com.dbdesignassitant.backend.entities.Skill;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.SampleSolutionRepository;
import com.dbdesignassitant.backend.repositories.SkillRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private SampleSolutionRepository sampleSolutionRepository;

    @Mock
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private DataSeeder dataSeeder;

    @BeforeEach
    void setUp() {
        dataSeeder = new DataSeeder(
                roleRepository,
                userRepository,
                exerciseRepository,
                sampleSolutionRepository,
                knowledgeBaseRepository,
                skillRepository,
                passwordEncoder,
                new ObjectMapper());

        ReflectionTestUtils.setField(dataSeeder, "seedEnabled", true);
        ReflectionTestUtils.setField(dataSeeder, "defaultSeedPassword", "EnvPassword123!");
        ReflectionTestUtils.setField(dataSeeder, "adminSeedPassword", "");
        ReflectionTestUtils.setField(dataSeeder, "instructorSeedPassword", "");
        ReflectionTestUtils.setField(dataSeeder, "studentSeedPassword", "");
        ReflectionTestUtils.setField(dataSeeder, "resetExistingPasswords", false);

        when(roleRepository.findByRoleName(RoleName.ADMIN)).thenReturn(Optional.of(role(RoleName.ADMIN)));
        when(roleRepository.findByRoleName(RoleName.INSTRUCTOR)).thenReturn(Optional.of(role(RoleName.INSTRUCTOR)));
        when(roleRepository.findByRoleName(RoleName.STUDENT)).thenReturn(Optional.of(role(RoleName.STUDENT)));
        stubStaffBaseSeedDependencies();
    }

    @Test
    void existingUsersAreNotResetWhenResetFlagIsFalse() {
        when(userRepository.findByUserEmail(anyString()))
                .thenAnswer(invocation -> Optional.of(existingUser(invocation.getArgument(0), "old-hash")));

        dataSeeder.run();

        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void existingUsersAreResetWhenResetFlagIsTrue() {
        ReflectionTestUtils.setField(dataSeeder, "resetExistingPasswords", true);
        ReflectionTestUtils.setField(dataSeeder, "adminSeedPassword", "AdminEnv123!");
        ReflectionTestUtils.setField(dataSeeder, "studentSeedPassword", "StudentEnv123!");
        when(userRepository.findByUserEmail(anyString()))
                .thenAnswer(invocation -> Optional.of(existingUser(invocation.getArgument(0), "old-hash")));
        when(passwordEncoder.encode("AdminEnv123!")).thenReturn("encoded-admin");
        when(passwordEncoder.encode("EnvPassword123!")).thenReturn("encoded-default");
        when(passwordEncoder.encode("StudentEnv123!")).thenReturn("encoded-student");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        dataSeeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(3)).save(captor.capture());

        assertEquals("encoded-admin", captor.getAllValues().get(0).getPasswordHash());
        assertEquals("encoded-default", captor.getAllValues().get(1).getPasswordHash());
        assertEquals("encoded-student", captor.getAllValues().get(2).getPasswordHash());
    }

    @Test
    void blankSeedPasswordsFallBackToLocalDevDefaultForNewUsers() {
        ReflectionTestUtils.setField(dataSeeder, "defaultSeedPassword", "");
        when(userRepository.findByUserEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-local");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        dataSeeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(3)).save(captor.capture());
        assertEquals(
                3,
                captor.getAllValues().stream()
                        .filter(user -> "encoded-local".equals(user.getPasswordHash()))
                        .count());
    }

    @Test
    void seederCreatesOnlyThreeMainAccounts() {
        when(userRepository.findByUserEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("EnvPassword123!")).thenReturn("encoded-env");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        dataSeeder.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(3)).save(captor.capture());

        List<String> emails = captor.getAllValues().stream()
                .map(User::getUserEmail)
                .toList();
        assertEquals(List.of(
                "admin@dbdesign.local",
                "instructor@dbdesign.local",
                "student@dbdesign.local"), emails);
        assertFalse(emails.stream().anyMatch(email -> email.startsWith("student.demo")));
    }

    @Test
    void seederKeepsKnowledgeManualExercisesSampleSolutionsAndSkills() {
        when(userRepository.findByUserEmail(anyString()))
                .thenAnswer(invocation -> Optional.of(existingUser(invocation.getArgument(0), "hash")));

        dataSeeder.run();

        verify(knowledgeBaseRepository, times(12)).save(any(KnowledgeBase.class));
        verify(exerciseRepository, times(5)).save(any(Exercise.class));
        verify(sampleSolutionRepository, times(5)).save(any(SampleSolution.class));
        verify(skillRepository, times(6)).save(any(Skill.class));
    }

    private void stubStaffBaseSeedDependencies() {
        AtomicLong exerciseIdSequence = new AtomicLong(100L);

        when(knowledgeBaseRepository.findAll()).thenReturn(List.of());
        when(knowledgeBaseRepository.save(any(KnowledgeBase.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(exerciseRepository.findByExerciseCode(anyString())).thenReturn(Optional.empty());
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            if (exercise.getExerciseId() == null) {
                exercise.setExerciseId(exerciseIdSequence.getAndIncrement());
            }
            return exercise;
        });
        when(exerciseRepository.findAll()).thenReturn(List.of());

        when(sampleSolutionRepository.findByExerciseExerciseId(anyLong())).thenReturn(Optional.empty());
        when(sampleSolutionRepository.save(any(SampleSolution.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        when(skillRepository.findAll()).thenReturn(List.of());
        when(skillRepository.save(any(Skill.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Role role(RoleName roleName) {
        return Role.builder()
                .roleName(roleName)
                .build();
    }

    private User existingUser(String email, String passwordHash) {
        return User.builder()
                .userEmail(email)
                .passwordHash(passwordHash)
                .build();
    }
}
