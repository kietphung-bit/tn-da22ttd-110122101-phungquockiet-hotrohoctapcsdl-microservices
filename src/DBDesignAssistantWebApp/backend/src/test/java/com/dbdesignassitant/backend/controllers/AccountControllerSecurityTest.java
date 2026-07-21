package com.dbdesignassitant.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dbdesignassitant.backend.dtos.response.RoleResponse;
import com.dbdesignassitant.backend.dtos.response.UserResponse;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.UserGender;
import com.dbdesignassitant.backend.services.AccountService;
import com.dbdesignassitant.backend.utils.JwtUtil;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(AccountController.class)
class AccountControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "STUDENT")
    void authenticatedUserCanReadCurrentAccountWithoutPasswordHash() throws Exception {
        when(accountService.getCurrentAccount()).thenReturn(userResponse());

        MvcResult result = mockMvc.perform(get("/api/account/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(12))
                .andExpect(jsonPath("$.data.userEmail").value("student@dbdesign.local"))
                .andExpect(jsonPath("$.data.role.roleName").value("STUDENT"))
                .andReturn();

        assertFalse(result.getResponse().getContentAsString().contains("password"));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void authenticatedUserCanUpdateProfile() throws Exception {
        when(accountService.updateProfile(any())).thenReturn(userResponse());

        mockMvc.perform(put("/api/account/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Updated Student",
                                  "userGender": "OTHER",
                                  "userDob": "2000-01-02",
                                  "userPhone": "0900111222",
                                  "userAddress": "Hanoi"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userEmail").value("student@dbdesign.local"));
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void authenticatedUserCanChangePassword() throws Exception {
        mockMvc.perform(put("/api/account/password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Password123!",
                                  "newPassword": "NewPassword123!",
                                  "confirmPassword": "NewPassword123!"
                                }
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("Success"));

        verify(accountService).changePassword(any());
    }

    @Test
    void unauthenticatedUserCannotReadCurrentAccount() throws Exception {
        mockMvc.perform(get("/api/account/me"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void unauthenticatedUserCannotUpdateProfile() throws Exception {
        mockMvc.perform(put("/api/account/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "No Auth"
                                }
                """))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void unauthenticatedUserCannotChangePassword() throws Exception {
        mockMvc.perform(put("/api/account/password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "currentPassword": "Password123!",
                                  "newPassword": "NewPassword123!",
                                  "confirmPassword": "NewPassword123!"
                                }
                """))
                .andExpect(status().is4xxClientError());
    }

    private UserResponse userResponse() {
        return UserResponse.builder()
                .userId(12L)
                .userEmail("student@dbdesign.local")
                .fullName("Student")
                .userGender(UserGender.OTHER)
                .userDob(LocalDate.of(2000, 1, 2))
                .userPhone("0900111222")
                .userAddress("Hanoi")
                .role(RoleResponse.builder()
                        .roleId(3L)
                        .roleName(RoleName.STUDENT)
                        .build())
                .isActive(true)
                .build();
    }
}
