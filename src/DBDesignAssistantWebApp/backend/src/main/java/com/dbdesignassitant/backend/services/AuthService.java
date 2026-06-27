package com.dbdesignassitant.backend.services;

import com.dbdesignassitant.backend.dtos.request.LoginRequest;
import com.dbdesignassitant.backend.dtos.request.RegisterRequest;
import com.dbdesignassitant.backend.dtos.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);
}
