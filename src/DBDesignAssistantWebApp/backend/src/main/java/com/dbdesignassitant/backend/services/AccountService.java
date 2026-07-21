package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.AccountProfileUpdateRequest;
import com.dbdesignassitant.backend.dtos.request.ChangePasswordRequest;
import com.dbdesignassitant.backend.dtos.response.UserResponse;

public interface AccountService {
    UserResponse getCurrentAccount();

    UserResponse updateProfile(AccountProfileUpdateRequest request);

    void changePassword(ChangePasswordRequest request);
}
