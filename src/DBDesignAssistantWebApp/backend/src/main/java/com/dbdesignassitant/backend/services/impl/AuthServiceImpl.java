package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.dtos.request.LoginRequest;
import com.dbdesignassitant.backend.dtos.request.RegisterRequest;
import com.dbdesignassitant.backend.dtos.response.AuthResponse;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.exceptions.ResourceNotFoundException;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.dbdesignassitant.backend.services.AuthService;
import com.dbdesignassitant.backend.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserEmail(), request.getPassword()));

        User user = userRepository.findByUserEmailAndIsActiveTrue(request.getUserEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        String token = jwtUtil.generateToken(userDetails);
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .roleName(user.getRole().getRoleName().name())
                .build();
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        Role role = roleRepository.findByRoleName(RoleName.STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));

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

        User savedUser = userRepository.save(user);

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(savedUser.getUserEmail())
                .password(savedUser.getPasswordHash())
                .roles(savedUser.getRole().getRoleName().name())
                .build();

        String token = jwtUtil.generateToken(userDetails);
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(savedUser.getUserId())
                .roleName(savedUser.getRole().getRoleName().name())
                .build();
    }
}
