package com.octopus.repoclients;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Represents the details of a Github repository.
 */
@Data
@AllArgsConstructor
public class GithubRepoDetails {

  private String username;
  private String repository;
}
