package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void disableUserRejectsCurrentUserBeforeLoadingTarget() {
        assertThrows(BadRequestException.class, () -> userService.disableUser(10L, 10L));

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteUserRejectsAdminAccount() {
        User admin = user(1L, RoleName.ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThrows(BadRequestException.class, () -> userService.deleteUser(99L, 1L));

        verify(userRepository, never()).delete(any());
    }

    @Test
    void disableUserAllowsNonAdminNonSelfAccount() {
        User student = user(2L, RoleName.STUDENT);
        when(userRepository.findById(2L)).thenReturn(Optional.of(student));
        when(userRepository.save(student)).thenReturn(student);

        UserResponse response = userService.disableUser(99L, 2L);

        assertEquals(2L, response.getUserId());
        assertEquals(false, response.getIsActive());
    }

    private User user(Long userId, RoleName roleName) {
        return User.builder()
                .userId(userId)
                .userEmail("user" + userId + "@dbdesign.local")
                .fullName("User " + userId)
                .passwordHash("hash")
                .role(Role.builder()
                        .roleId(userId)
                        .roleName(roleName)
                        .build())
                .isActive(true)
                .build();
    }
}
