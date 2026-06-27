package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.enums.RoleName;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByRoleName(RoleName roleName);
}
