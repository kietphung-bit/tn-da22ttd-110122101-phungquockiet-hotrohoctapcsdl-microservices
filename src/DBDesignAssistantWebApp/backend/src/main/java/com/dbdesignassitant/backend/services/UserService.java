package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.dtos.request.AdminCreateUserRequest;
import java.util.List;

public interface UserService {
    List<UserResponse> getAllUsers();

    UserResponse getUserById(Long userId);

    UserResponse createUser(AdminCreateUserRequest request);

    UserResponse disableUser(Long currentUserId, Long userId);

    UserResponse enableUser(Long currentUserId, Long userId);

    void deleteUser(Long currentUserId, Long userId);
}
