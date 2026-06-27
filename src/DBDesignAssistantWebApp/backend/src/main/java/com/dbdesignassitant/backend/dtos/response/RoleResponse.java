package com.dbdesignassitant.backend.dtos.response;

import com.dbdesignassitant.backend.enums.RoleName;
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
public class RoleResponse {
    private Long roleId;
    private RoleName roleName;
}
