package com.dbdesignassitant.backend.repositories;

import com.dbdesignassitant.backend.entities.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserEmail(String userEmail);

    Optional<User> findByUserEmailAndIsActiveTrue(String userEmail);

    boolean existsByUserEmail(String userEmail);

    boolean existsByUserEmailAndIsActiveTrue(String userEmail);
}
