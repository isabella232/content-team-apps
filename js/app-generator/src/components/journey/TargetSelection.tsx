import {FC, ReactElement, useState} from "react";
import {Button, Grid} from "@mui/material";
import {buttonStyle, journeyContainer} from "../../utils/styles";
import {JourneyProps} from "../../statemachine/appBuilder";

const TargetSelection: FC<JourneyProps> = (props): ReactElement => {
    const classes = journeyContainer();

    const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);

    const next = (state: string, platform: string) => {
        setButtonDisabled(true);
        if (props.machine.state) {
            props.machine.state.context.targetPlatform = platform;
        }
        props.machine.send(state);
    }

    return (
        <>
            <Grid
                container={true}
                className={classes.root}
                spacing={2}
            >
                <Grid item md={3} xs={0}/>
                <Grid item md={6} xs={12}>
                    <Grid
                        container={true}
                        className={classes.column}
                    >
                        <h2>Where are you deploying the microservice?</h2>
                        <p>
                            Select the platform that you wish to deploy the sample microservice application to using
                            Octopus. If you only want to download the application code, select the last option.
                        </p>
                        <Button sx={buttonStyle} variant="outlined" disabled={buttonDisabled} onClick={() => next("EKS", "EKS")}>
                            {"AWS Elastic Kubernetes Engine (EKS)"}
                        </Button>
                        <Button sx={buttonStyle} variant="outlined" disabled={true} onClick={() => next("ECS", "ECS")}>
                            {"AWS Elastic Compute Service (ECS) (Coming soon)"}
                        </Button>
                        <Button sx={buttonStyle} variant="outlined" disabled={true} onClick={() => next("LAMBDA", "LAM")}>
                            {"AWS Lambda (Coming soon)"}
                        </Button>
                    </Grid>
                </Grid>
                <Grid item md={3} xs={0}/>
            </Grid>
        </>
    );
};

export default TargetSelection;