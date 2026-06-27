package com.dbdesignassitant.backend.utils;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

public final class EmbeddingVectorUtils {
    private EmbeddingVectorUtils() {
    }

    public static String toPgVectorLiteral(List<Double> values) {
        return values.stream()
                .map(value -> String.format(Locale.US, "%.8f", value))
                .collect(Collectors.joining(",", "[", "]"));
    }

    public static List<Double> parseVectorLiteral(String vectorLiteral) {
        if (!StringUtils.hasText(vectorLiteral)) {
            return List.of();
        }
        String cleaned = vectorLiteral.trim();
        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }
        if (!StringUtils.hasText(cleaned)) {
            return List.of();
        }
        String[] parts = cleaned.split(",");
        List<Double> values = new ArrayList<>(parts.length);
        for (String part : parts) {
            values.add(Double.parseDouble(part.trim()));
        }
        return values;
    }
}
