import {FC, ReactElement} from "react";
import {Button, Grid, Link} from "@mui/material";
import {journeyContainer, nextButtonStyle} from "../../utils/styles";
import {JourneyProps} from "../../statemachine/appBuilder";

const LoggedIntoGithub: FC<JourneyProps> = (props): ReactElement => {
    const classes = journeyContainer();

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
                        <Link onClick={() => props.machine.send("BACK")}>&lt; Back</Link>
                        <h2>GitHub login successful.</h2>
                        <p>
                            You have successfully authorized access to GitHub.
                        </p>
                        <Button sx={nextButtonStyle} variant="outlined" onClick={() => props.machine.send("NEXT")}>
                            {"Next >"}
                        </Button>
                    </Grid>
                </Grid>
                <Grid item md={3} xs={0}/>
            </Grid>
        </>
    );
};

export default LoggedIntoGithub;