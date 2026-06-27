package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.enums.AiProvider;
import com.dbdesignassitant.backend.services.EmbeddingClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MockEmbeddingClient implements EmbeddingClient {
    private static final Pattern NON_WORD = Pattern.compile("[^\\p{L}\\p{Nd}]+");

    private final AiProperties aiProperties;

    @Override
    public AiProvider provider() {
        return AiProvider.MOCK;
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public String model() {
        return aiProperties.getEmbedding().getModel();
    }

    @Override
    public int dimension() {
        return Math.max(16, aiProperties.getEmbedding().getDimension());
    }

    @Override
    public List<Double> embed(String text) {
        double[] vector = new double[dimension()];
        for (String token : tokenize(text)) {
            int index = Math.floorMod(token.hashCode(), vector.length);
            vector[index] += 1.0;
        }
        normalize(vector);
        return Arrays.stream(vector).boxed().collect(Collectors.toList());
    }

    private List<String> tokenize(String input) {
        return Arrays.stream(NON_WORD.split(normalizeText(input)))
                .filter(StringUtils::hasText)
                .filter(token -> token.length() >= 2)
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeText(String input) {
        if (input == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT);
    }

    private void normalize(double[] vector) {
        double sumSquares = 0.0;
        for (double value : vector) {
            sumSquares += value * value;
        }
        if (sumSquares == 0.0) {
            return;
        }
        double magnitude = Math.sqrt(sumSquares);
        for (int i = 0; i < vector.length; i++) {
            vector[i] = vector[i] / magnitude;
        }
    }
}
