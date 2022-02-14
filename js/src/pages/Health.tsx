import {FC, ReactElement, useContext, useEffect, useMemo, useState} from "react";
import {Helmet} from "react-helmet";
import {AppContext} from "../App";
import {getJson} from "../utils/network";
import { Clear, Done } from "@material-ui/icons";
import {createStyles, makeStyles} from "@material-ui/core/styles";
import {Theme} from "@material-ui/core";

const newHealth: {[key: string]: boolean} = {};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        table: {
            height: "fit-content",
            marginRight: "auto",
            marginLeft: "auto"
        },
        cell: {
            padding: "8px"
        }
    })
);

const Book: FC<{}> = (): ReactElement => {

    const context = useContext(AppContext);
    context.setCopyText("");

    const classes = useStyles();

    const endpoints = useMemo(() => [
        context.settings.healthEndpoint + "/audits/GET",
        context.settings.healthEndpoint + "/audits/POST",
        context.settings.healthEndpoint + "/audits/x/GET"],
        [context]);

    const [health, setHealth] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        for (const endpoint of endpoints) {
            ((myEndpoint) => getJson(myEndpoint)
                .then(() => newHealth[myEndpoint] = true)
                .catch(() => newHealth[myEndpoint] = false)
                .finally(() => setHealth({...newHealth})))(endpoint);
        }
    }, [endpoints, setHealth]);

    return (
        <>
            <Helmet>
                <title>
                    {context.settings.title} - Health
                </title>
            </Helmet>
            <table className={classes.table}>
                <tr>
                    <td className={classes.cell}>Endpoint</td>
                    <td className={classes.cell}>Method</td>
                    <td className={classes.cell}>Health</td>
                </tr>
            {Object.entries(health)
                .sort()
                .map(([key, value]) =>
                <tr>
                    <td className={classes.cell}>/api{key.substring(key.lastIndexOf("/health") + 7, key.lastIndexOf("/"))}</td>
                    <td className={classes.cell}>{key.substring(key.lastIndexOf("/") + 1)}</td>
                    <td className={classes.cell}>{value ? <Done/> : <Clear/>}</td>
                </tr>
            )}
            </table>
        </>
    );
}

export default Book;