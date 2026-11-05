package io.holeseven.qiuzhi;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RulesController {
    private final JsonNode rules;

    public RulesController(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("rules/default-rules.json").getInputStream()) {
            rules = mapper.readTree(stream);
        }
    }

    @GetMapping("/api/v1/rules")
    ResponseEntity<JsonNode> rules() {
        return ResponseEntity.ok()
            .eTag("\"" + rules.path("version").asText() + "\"")
            .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
            .body(rules);
    }

    @GetMapping("/api/v1/health")
    Map<String, String> health() {
        return Map.of("status", "UP", "rulesVersion", rules.path("version").asText());
    }
}
