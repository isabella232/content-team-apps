package com.octopus.githubrepo.domain.handlers;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.github.jasminb.jsonapi.ResourceConverter;
import com.octopus.exceptions.Unauthorized;
import com.octopus.features.DisableSecurityFeature;
import com.octopus.githubrepo.BaseTest;
import com.octopus.githubrepo.domain.entities.CreateGithubRepo;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.mockito.InjectMock;
import javax.inject.Inject;
import javax.transaction.Transactional;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.mockito.Mockito;

@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class HandlerAuthorizedTests extends BaseTest {

  @Inject
  GitHubRepoHandler handler;

  @Inject
  ResourceConverter resourceConverter;

  @InjectMock
  DisableSecurityFeature cognitoDisableAuth;

  @BeforeAll
  public void setup()  {
    Mockito.when(cognitoDisableAuth.getCognitoAuthDisabled()).thenReturn(false);
  }

  @Test
  @Transactional
  public void testCreateAudit() {
    assertThrows(Unauthorized.class, () -> handler.create(
        resourceToResourceDocument(resourceConverter, new CreateGithubRepo()),
        null, null, null));
  }
}
