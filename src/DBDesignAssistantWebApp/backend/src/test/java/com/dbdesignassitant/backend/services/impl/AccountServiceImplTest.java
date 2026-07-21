package com.dbdesignassitant.backend.services.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dbdesignassitant.backend.dtos.request.AccountProfileUpdateRequest;
import com.dbdesignassitant.backend.dtos.request.ChangePasswordRequest;
import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.UserGender;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AccountServiceImplTest {

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AccountServiceImpl accountService;

    @Test
    void getCurrentAccountReturnsSafeUserResponse() {
        User user = user(7L, RoleName.STUDENT);
        when(currentUserProvider.getCurrentUser()).thenReturn(user);

        UserResponse response = accountService.getCurrentAccount();

        assertEquals(7L, response.getUserId());
        assertEquals("user7@dbdesign.local", response.getUserEmail());
        assertEquals("User 7", response.getFullName());
        assertEquals(RoleName.STUDENT, response.getRole().getRoleName());
    }

    @Test
    void updateProfileDoesNotChangeEmailRoleOrStatus() {
        User user = user(8L, RoleName.INSTRUCTOR);
        user.setUserEmail("original@dbdesign.local");
        user.setIsActive(false);
        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(userRepository.save(user)).thenReturn(user);

        UserResponse response = accountService.updateProfile(AccountProfileUpdateRequest.builder()
                .fullName("  Updated Name  ")
                .userGender(UserGender.OTHER)
                .userDob(LocalDate.of(1999, 5, 20))
                .userPhone("  0900111222  ")
                .userAddress("  Hanoi  ")
                .build());

        assertEquals("Updated Name", response.getFullName());
        assertEquals(UserGender.OTHER, response.getUserGender());
        assertEquals(LocalDate.of(1999, 5, 20), response.getUserDob());
        assertEquals("0900111222", response.getUserPhone());
        assertEquals("Hanoi", response.getUserAddress());
        assertEquals("original@dbdesign.local", response.getUserEmail());
        assertEquals(RoleName.INSTRUCTOR, response.getRole().getRoleName());
        assertEquals(false, response.getIsActive());
    }

    @Test
    void changePasswordAcceptsCorrectCurrentPassword() {
        User user = user(9L, RoleName.STUDENT);
        user.setPasswordHash("old-hash");
        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(passwordEncoder.matches("OldPassword123!", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("NewPassword123!")).thenReturn("new-hash");

        accountService.changePassword(ChangePasswordRequest.builder()
                .currentPassword("OldPassword123!")
                .newPassword("NewPassword123!")
                .confirmPassword("NewPassword123!")
                .build());

        assertEquals("new-hash", user.getPasswordHash());
        verify(userRepository).save(user);
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User user = user(10L, RoleName.STUDENT);
        user.setPasswordHash("old-hash");
        when(currentUserProvider.getCurrentUser()).thenReturn(user);
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> accountService.changePassword(ChangePasswordRequest.builder()
                .currentPassword("wrong")
                .newPassword("NewPassword123!")
                .confirmPassword("NewPassword123!")
                .build()));

        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
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
