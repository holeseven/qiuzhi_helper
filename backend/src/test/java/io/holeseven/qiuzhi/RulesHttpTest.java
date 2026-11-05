package io.holeseven.qiuzhi;

import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RulesHttpTest {
    @Autowired TestRestTemplate http;

    @Test void rulesAreAvailableWithoutLoginAndContainVersionedData() {
        var response = http.getForEntity("/api/v1/rules", Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        var body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("schemaVersion")).isEqualTo(1);
        assertThat(body.get("version")).isEqualTo("2026.11.06.1");
        assertThat((Map<?,?>) body.get("aliases")).isNotEmpty();
        assertThat((List<?>) body.get("sites")).isNotEmpty();
        assertThat(response.getHeaders().getETag()).isNotBlank();
        assertThat(body).doesNotContainKeys("profile", "profileV2", "apiKey");
    }

    @Test void healthDoesNotRequireAnAccount() {
        var response = http.getForEntity("/api/v1/health", Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("status", "UP");
    }

    @Test void serviceDoesNotAcceptPersonalProfiles() {
        assertThat(http.postForEntity("/api/v1/profile", Map.of("name", "fixture"), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.postForEntity("/api/v1/rules", Map.of(), String.class)
            .getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    }
}
