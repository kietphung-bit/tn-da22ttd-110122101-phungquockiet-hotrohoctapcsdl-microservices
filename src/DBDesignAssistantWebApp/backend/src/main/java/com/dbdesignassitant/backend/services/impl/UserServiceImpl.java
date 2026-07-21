package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.AdminCreateUserRequest;
import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.exceptions.BadRequestException;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.mappers.ResponseMapper;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.UserService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(ResponseMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseMapper.toUserResponse(user);
    }

    @Override
    public UserResponse createUser(AdminCreateUserRequest request) {
        if (request.getRoleName() == RoleName.ADMIN) {
            throw new BadRequestException("Cannot create admin user");
        }
        if (userRepository.existsByUserEmail(request.getUserEmail())) {
            throw new BadRequestException("Email already exists");
        }

        Role role = roleRepository.findByRoleName(request.getRoleName())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        User user = User.builder()
                .userEmail(request.getUserEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .userGender(request.getUserGender())
                .userDob(request.getUserDob())
                .userPhone(request.getUserPhone())
                .userAddress(request.getUserAddress())
                .role(role)
                .isActive(true)
                .build();

        return ResponseMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    public UserResponse disableUser(Long currentUserId, Long userId) {
        validateProtectedUserAction(currentUserId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateNotAdminAccount(user, "disable");
        user.setIsActive(false);
        return ResponseMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    public UserResponse enableUser(Long currentUserId, Long userId) {
        validateProtectedUserAction(currentUserId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateNotAdminAccount(user, "enable");
        user.setIsActive(true);
        return ResponseMapper.toUserResponse(userRepository.save(user));
    }

    @Override
    public void deleteUser(Long currentUserId, Long userId) {
        validateProtectedUserAction(currentUserId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateNotAdminAccount(user, "delete");
        userRepository.delete(user);
    }

    private void validateProtectedUserAction(Long currentUserId, Long targetUserId) {
        if (currentUserId != null && currentUserId.equals(targetUserId)) {
            throw new BadRequestException("Cannot modify your own account from user management");
        }
    }

    private void validateNotAdminAccount(User user, String action) {
        if (user.getRole() != null && user.getRole().getRoleName() == RoleName.ADMIN) {
            throw new BadRequestException("Cannot " + action + " admin user");
        }
    }
}
