package com.octopus.githubactions.builders;

import com.octopus.githubactions.builders.java.JavaMavenBuilder;
import com.octopus.repoclients.MavenTestRepoClient;
import org.junit.jupiter.api.Test;

public class PrintWorkflow {

  @Test
  public void printMavenWorkflow() {
    final JavaMavenBuilder builder = new JavaMavenBuilder();
    System.out.println(builder.generate(new MavenTestRepoClient("https://github.com/OctopusSamples/RandomQuotes-Java", true)));
  }
}
