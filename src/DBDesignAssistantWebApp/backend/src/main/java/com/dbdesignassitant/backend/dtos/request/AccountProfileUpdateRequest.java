package com.dbdesignassitant.backend.dtos.request;

import com.dbdesignassitant.backend.enums.UserGender;
import jakarta.validation.constraints.NotBlank;
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
public class AccountProfileUpdateRequest {
    @NotBlank
    private String fullName;

    private UserGender userGender;

    private LocalDate userDob;

    private String userPhone;

    private String userAddress;
}
