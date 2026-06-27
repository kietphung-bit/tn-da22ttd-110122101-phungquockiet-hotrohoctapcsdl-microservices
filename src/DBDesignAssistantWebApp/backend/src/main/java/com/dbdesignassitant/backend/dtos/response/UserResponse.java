package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.UserGender;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userId;
    private String userEmail;
    private String fullName;
    private UserGender userGender;
    private LocalDate userDob;
    private String userPhone;
    private String userAddress;
    private RoleResponse role;
    private Boolean isActive;
}
