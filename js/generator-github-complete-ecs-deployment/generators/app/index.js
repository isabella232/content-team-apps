const crypto = require('crypto');
const Generator = require('yeoman-generator');

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.option("aws_region", {type: String});
        this.option("aws_state_bucket_region", {type: String});
        this.option("platform", {type: String});
        this.option("framework", {
            type: String,
            description: "An optional field that defines the framework or language i.e. Spring, DotNET, Express etc. If defined, the framework is included the registry and Docker image names."
        });
        this.option("s3_bucket_suffix", {type: String, default: crypto.randomUUID()});
    }

    initializing() {
        const awsRegion = this.options["awsRegion"];
        const awsStateBucketRegion = this.options["awsStateBucketRegion"] || awsRegion;
        const s3BucketSuffix = this.options["s3BucketSuffix"];

        const args = {
            s3_bucket_suffix: s3BucketSuffix,
            aws_state_bucket_region: awsStateBucketRegion,
            aws_region: awsRegion
        };

        this.composeWith(
            require.resolve('@octopus-content-team/generator-octopus-java-microservice/generators/app'), args);
        this.composeWith(
            require.resolve('@octopus-content-team/generator-github-shared-space/generators/app'), args);
        this.composeWith(
            require.resolve('@octopus-content-team/generator-github-shared-infrastructure/generators/app'), args);
        this.composeWith(
            require.resolve('@octopus-content-team/generator-github-ecs-deployment/generators/app'), args);
        this.composeWith(
            require.resolve('@octopus-content-team/generator-aws-ecr/generators/app'), args);
    }

    writing() {
        const framework = this.options["framework"];
        const platform = this.options["platform"];
        const spaceName = platform + (framework ? " " + framework : "");
        const repository = "octopus-microservice" + (framework ? "-" + framework : "");

        this.fs.copyTpl(
            this.templatePath('.github/workflows/eks-deployment.yaml'),
            this.destinationPath('.github/workflows/eks-deployment.yaml'),
            {
                octopus_space: spaceName,
                s3_bucket_suffix: this.options["s3BucketSuffix"],
                aws_region: this.options["awsRegion"],
                framework,
                platform,
                repository
            }
        );
    }
};
