package com.dbdesignassitant.backend.config;

import com.dbdesignassitant.backend.services.PgVectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PgVectorInitializer implements ApplicationRunner {
    private final PgVectorService pgVectorService;

    @Override
    public void run(ApplicationArguments args) {
        pgVectorService.ensurePgVectorExtension();
    }
}
