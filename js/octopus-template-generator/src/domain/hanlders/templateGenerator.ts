import NonInteractiveAdapter from "../yeoman/adapter";
import splitGeneratorName from "../utils/generatorSplitter";
import process from 'node:process';
import GeneratorId from "../entities/generatorId";
import canInstallPackage from "../utils/packageInstaller";
import getDownloadPath from "../utils/downloadPaths";

const yeoman = require('yeoman-environment');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require("adm-zip");
const lockFile = require('lockfile');
const {exec} = require('child_process');
const md5 = require("md5");

/*
    Missing files and other errors will kill the node process by default. This is
    undesirable for a long-running web server, so we catch the exception here.
    https://nodejs.org/api/process.html#event-uncaughtexception
 */
process.on('uncaughtException', (err, origin) => {
    console.log(err);
});

// Note the current working directory
const cwd = process.cwd();

export class TemplateGenerator {
    constructor() {
    }

    /**
     * Build a file system safe hash that represents the generator and the specified options.
     * @param generator The name of the Yeoman generator.
     * @param options The options applied to the generator.
     * @param arguments The arguments applied to the generator.
     * @param args The arguments applied to the generator.
     * @param answers The answers applied to the generator.
     * @private
     */
    private async getTemplateId(
        generator: string,
        options: { [key: string]: string; },
        answers: { [key: string]: string; },
        args: string[]): Promise<string> {
        const id = generator
            + Object.keys(options || {}).sort().map(k => k + options[k]).join("")
            + Object.keys(answers || {}).sort().map(k => k + answers[k]).join("")
            + Object.keys(args || []).sort().join("");
        const hash = md5(id);
        return new Buffer(hash).toString('base64');
    }

    /**
     * Returns the path to a cached templated if it exists.
     * @param id The has of the generator and options generated by getTemplateId()
     */
    async getTemplate(id: string): Promise<string> {
        // This is where the template is created
        const zipPath = path.join(os.tmpdir(), id + '.zip');

        // If the template does nopt exist, build it
        if (fs.existsSync(zipPath)) {
            return zipPath;
        }

        return "";
    }

    /**
     * Build the template and return the path to the ZIP file.
     * @param generator The name of the generator.
     * @param options The generator options.
     * @param answers The generator answers.
     * @param args The generator arguments.
     */
    async generateTemplateSync(
        generator: string, options: { [key: string]: string; },
        answers: { [key: string]: string; },
        args: string[]): Promise<string> {

        // Create a hash based on the generator and the options
        const hash = await this.getTemplateId(generator, options, answers, args);
        // This is where the template is created
        const zipPath = path.join(os.tmpdir(), hash + '.zip');

        await this.buildNewTemplate(generator, options, answers, args, zipPath);

        return zipPath;
    }

    /**
     * Generate a template in a background operation, and return the hash for use with getTemplate().
     * @param generator The name of the generator.
     * @param options The generator options.
     * @param answers The generator answers.
     * @param args The generator arguments.
     */
    async generateTemplate(
        generator: string,
        options: { [key: string]: string; },
        answers: { [key: string]: string; },
        args: string[]): Promise<string> {

        // Create a hash based on the generator and the options
        const hash = await this.getTemplateId(generator, options, answers, args);
        // This is where the template is created
        const zipPath = path.join(os.tmpdir(), hash + '.zip');

        // trigger the build, but don't wait for it
        this.buildNewTemplate(generator, options, answers, args, zipPath)
            .catch(e => console.log(e));

        return hash;
    }

    /**
     * Build the template and save it in a temporary directory.
     * @param generator The name of the generator.
     * @param options The generator options.
     * @param answers The generator answers.
     * @param args The generator argumnets.
     * @param zipPath The path to save the template to.
     */
    buildNewTemplate(
        generator: string,
        options: { [key: string]: string; },
        answers: { [key: string]: string; },
        args: string[],
        zipPath: string) {
        const lockFilePath = zipPath + ".lock";
        return new Promise((resolve, reject) => {
            lockFile.lock(lockFilePath, (err: never) => {
                if (err) return reject(err);

                if (!fs.existsSync(zipPath)) {
                    return resolve(this.writeTemplate(generator, options, answers, args, zipPath));
                }

                resolve(zipPath);
            })
        })
            .finally(() => lockFile.unlock(lockFilePath, (err: never) => {
                if (err) {
                    console.error('TemplateGenerator-GenerateTemplate-UnlockFail: Failed to unlock the file: ' + err)
                }
            }));
    }

    /**
     * Write the template to a file.
     * @param generator The name of the generator.
     * @param options The generator options.
     * @param answers The generator answers.
     * @param args The generator arguments.
     * @param zipPath The path to save the generator ZIP file to.
     * @private
     */
    private async writeTemplate(
        generator: string,
        options: { [key: string]: string; },
        answers: { [key: string]: string; },
        args: string[],
        zipPath: string) {

        /*
            Catch issues like missing files and save the uncaught exception, so we can
            handle it gracefully rather than killing the node process.
         */
        let uncaughtException = null;
        const handleException = (err: Error) => {
            uncaughtException = err;
        };
        process.on('uncaughtException', handleException);

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "template"));

        // sanity check the supplied arguments
        const fixedArgs = !!args && Array.isArray(args)
            ? args
            : [];

        const fixedOptions = options
            ? options
            : {};

        const fixedAnswers = answers
            ? answers
            : {};

        try {
            const env = yeoman.createEnv({cwd: tempDir}, {}, new NonInteractiveAdapter(fixedAnswers));
            env.register(await this.resolveGenerator(generator), generator);

            // Not all generators respect the cwd option passed into createEnv
            process.chdir(tempDir);
            // eslint-disable-next-line @typescript-eslint/naming-convention
            await env.run([generator, ...fixedArgs], {...fixedOptions, 'skip-install': true});

            // If there were any exceptions, rethrow them so the caller receives the appropriate
            // error code.
            if (uncaughtException) {
                throw uncaughtException;
            }

            console.log("Zipping up the template");
            const zip = new AdmZip();
            zip.addLocalFolder(tempDir);
            zip.writeZip(zipPath);
            console.log("Zip file generated");

            return zipPath;
        } catch (err) {
            console.log(err);
            throw err;
        } finally {
            process.removeListener('uncaughtException', handleException);
            try {
                process.chdir(cwd);
            } catch (err) {
                console.log("TemplateGenerator-Template-WorkingDirRestoreFailed: Failed to restore the working directory: " + err);
            }
            try {
                fs.rmSync(tempDir, {recursive: true});
            } catch (err) {
                console.error('TemplateGenerator-Template-TempDirCleanupFailed: The temporary directory was not removed because' + err)
            }
        }
    }

    /**
     * Resolve the Yeoman generator, and optionally try to install it if it doesn't exist.
     * @param generator The name of the generator.
     * @param attemptInstall true if we should attempt to install the generator if it doesn't exist. Note the downloading
     * of additional generators is also defined by the enableNpmInstall() feature.
     * @private
     */
    private async resolveGenerator(generator: string, attemptInstall = true): Promise<string> {
        const generatorId = splitGeneratorName(generator);

        try {
            return this.getSubGenerator(generatorId);
        } catch (e) {
            /*
             If the module was not found, we allow module downloading, and this is the first attempt,
             try downloading the module and return it.
             */
            const failedToFindModule = e.code === "MODULE_NOT_FOUND";

            if (failedToFindModule && canInstallPackage(generatorId.namespaceAndName) && attemptInstall) {
                const downloadPath = getDownloadPath(generatorId);
                console.log("Attempting to run npm install --prefix " + downloadPath + " --no-save " + generatorId.namespaceAndName + " in " + process.cwd());
                return new Promise((resolve, reject) => {
                    /*
                        Place any newly download generators into a new directory called downloaded.
                     */
                    exec("npm install --prefix " + downloadPath + " --no-save " + generatorId.namespaceAndName, (error: never) => {
                        if (error) {
                            return reject(error);
                        }

                        return resolve(this.resolveGenerator(generator, false));
                    });
                });
            }

            throw e;
        }
    }

    /**
     * Yeoman allows two different directory structures.
     * It’ll look in ./ and in generators/ to register available generators.
     * https://yeoman.io/authoring/index.html
     * @param generatorId The generator id
     * @private
     */
    private getSubGenerator(generatorId: GeneratorId) {
        try {
            return require.resolve(
                generatorId.namespaceAndName + "/generators/" + generatorId.subGenerator,
                {paths: [getDownloadPath(generatorId), "."]});
        } catch (e) {
            /*
                Some generators, like jhipster, don't list the app subgenerator in the
                package.json exports. This leads to ERR_PACKAGE_PATH_NOT_EXPORTED errors.
                Yeoman itself doesn't care about the exports though, so we treat
                ERR_PACKAGE_PATH_NOT_EXPORTED as evidence that the module exists
                and return the path.
             */
            if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
                return process.cwd() + "/" + getDownloadPath(generatorId) + "/node_modules/" + generatorId.namespaceAndName + "/generators/" + generatorId.subGenerator;
            }

            console.log(e);
            return this.getGenerator(generatorId);
        }
    }

    /**
     * Yeoman allows two different directory structures.
     * It’ll look in ./ and in generators/ to register available generators.
     * https://yeoman.io/authoring/index.html
     * @param generatorId The generator id
     * @private
     */
    private getGenerator(generatorId: GeneratorId) {
        try {
            return require.resolve(
                generatorId.namespaceAndName + "/" + generatorId.subGenerator,
                {paths: [getDownloadPath(generatorId), "."]});
        } catch (e) {
            /*
                Some generators, like jhipster, don't list the app subgenerator in the
                package.json exports. This leads to ERR_PACKAGE_PATH_NOT_EXPORTED errors.
                Yeoman itself doesn't care about the exports though, so we treat
                ERR_PACKAGE_PATH_NOT_EXPORTED as evidence that the module exists
                and return the path.
             */
            if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
                return process.cwd() + "/" + getDownloadPath(generatorId) + "/node_modules/" + generatorId.namespaceAndName + "/" + generatorId.subGenerator;
            }

            console.log(e);
            throw e;
        }
    }
}
