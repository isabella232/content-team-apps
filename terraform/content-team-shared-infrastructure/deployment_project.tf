resource "octopusdeploy_project" "deploy_project" {
  auto_create_release                  = false
  default_guided_failure_mode          = "EnvironmentDefault"
  default_to_skip_if_already_installed = false
  description                          = "Deploys the shared network infrastructure. Don't edit this process directly - update the Terraform files in [GitHub](https://github.com/OctopusSamples/content-team-apps/terraform) instead."
  discrete_channel_release             = false
  is_disabled                          = false
  is_discrete_channel_release          = false
  is_version_controlled                = false
  lifecycle_id                         = var.octopus_infrastructure_lifecycle_id
  name                                 = "Content Team shared infrastructure"
  project_group_id                     = octopusdeploy_project_group.project_group.id
  tenanted_deployment_participation    = "Untenanted"
  space_id                             = var.octopus_space_id
  # "Content Team Apps" and "Aws Access" variable set
  included_library_variable_sets       = ["LibraryVariableSets-1282", "LibraryVariableSets-1243"]

  connectivity_policy {
    allow_deployments_to_no_targets = false
    exclude_unhealthy_targets       = false
    skip_machine_behavior           = "SkipUnavailableMachines"
  }
}

output "deploy_project_id" {
  value = octopusdeploy_project.deploy_project.id
}

resource "octopusdeploy_variable" "debug_variable" {
  name = "OctopusPrintVariables"
  type = "String"
  description = "A debug variable used to print all variables to the logs. See [here](https://octopus.com/docs/support/debug-problems-with-octopus-variables) for more information."
  is_sensitive = false
  owner_id = octopusdeploy_project.deploy_project.id
  value = "False"
}

resource "octopusdeploy_variable" "debug_evaluated_variable" {
  name = "OctopusPrintEvaluatedVariables"
  type = "String"
  description = "A debug variable used to print all variables to the logs. See [here](https://octopus.com/docs/support/debug-problems-with-octopus-variables) for more information."
  is_sensitive = false
  owner_id = octopusdeploy_project.deploy_project.id
  value = "False"
}

resource "octopusdeploy_deployment_process" "deploy_project" {
  project_id = octopusdeploy_project.deploy_project.id
  step {
    condition           = "Success"
    name                = "Create API Gateway"
    package_requirement = "LetOctopusDecide"
    start_trigger       = "StartAfterPrevious"
    action {
      action_type    = "Octopus.AwsRunCloudFormation"
      name           = "Create API Gateway"
      run_on_server  = true
      worker_pool_id = var.octopus_worker_pool_id

      properties = {
        "Octopus.Action.Aws.AssumeRole": "False"
        "Octopus.Action.Aws.CloudFormation.Tags": "[{\"key\":\"Environment\",\"value\":\"#{Octopus.Environment.Name}\"},{\"key\":\"Deployment Project\",\"value\":\"GitHub Actions Shared Network Infrastructure\"},{\"key\":\"Team\",\"value\":\"Content Marketing\"}]"
        "Octopus.Action.Aws.CloudFormationStackName": "#{CloudFormation.ApiGateway}"
        "Octopus.Action.Aws.CloudFormationTemplate": <<-EOT
          Resources:
            RestApi:
              Type: 'AWS::ApiGateway::RestApi'
              Properties:
                Description: My API Gateway
                Name: Content Team API
                BinaryMediaTypes:
                  - '*/*'
                EndpointConfiguration:
                  Types:
                    - REGIONAL
            Health:
              Type: 'AWS::ApiGateway::Resource'
              Properties:
                RestApiId:
                  Ref: RestApi
                ParentId:
                  'Fn::GetAtt':
                    - RestApi
                    - RootResourceId
                PathPart: health
            Api:
              Type: 'AWS::ApiGateway::Resource'
              Properties:
                RestApiId:
                  Ref: RestApi
                ParentId:
                  'Fn::GetAtt':
                    - RestApi
                    - RootResourceId
                PathPart: api
          Outputs:
            RestApi:
              Description: The REST API
              Value:
                Ref: RestApi
            RootResourceId:
              Description: ID of the resource exposing the root resource id
              Value:
                'Fn::GetAtt':
                  - RestApi
                  - RootResourceId
            Health:
              Description: ID of the resource exposing the health endpoints
              Value:
                Ref: Health
            Api:
              Description: ID of the resource exposing the api endpoint
              Value:
                Ref: Api
        EOT
        "Octopus.Action.Aws.CloudFormationTemplateParameters": "[]"
        "Octopus.Action.Aws.CloudFormationTemplateParametersRaw": "[]"
        "Octopus.Action.Aws.Region": "#{AWS.Region}"
        "Octopus.Action.Aws.TemplateSource": "Inline"
        "Octopus.Action.Aws.WaitForCompletion": "True"
        "Octopus.Action.AwsAccount.UseInstanceRole": "False"
        "Octopus.Action.AwsAccount.Variable": "AWS"
      }
    }
  }
  
}