package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.AccountProfileUpdateRequest;
import com.dbdesignassitant.backend.dtos.request.ChangePasswordRequest;
import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.mappers.ResponseMapper;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.AccountService;
import com.dbdesignassitant.backend.utils.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {
    private final CurrentUserProvider currentUserProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse getCurrentAccount() {
        return ResponseMapper.toUserResponse(currentUserProvider.getCurrentUser());
    }

    @Override
    public UserResponse updateProfile(AccountProfileUpdateRequest request) {
        User user = currentUserProvider.getCurrentUser();
        user.setFullName(request.getFullName().trim());
        user.setUserGender(request.getUserGender());
        user.setUserDob(request.getUserDob());
        user.setUserPhone(blankToNull(request.getUserPhone()));
        user.setUserAddress(blankToNull(request.getUserAddress()));
        return ResponseMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Password confirmation does not match");
        }

        User user = currentUserProvider.getCurrentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
