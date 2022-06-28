import {enableNpmInstall} from "../features/enbaleNpmInstall";
import {NonInteractiveAdapter} from "../yeoman/adapter";

const yeoman = require('yeoman-environment');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require("adm-zip");
const argon2 = require('argon2');
const lockFile = require('lockfile');
const {execSync} = require('child_process')

export class TemplateGenerator {
    constructor() {
    }

    /**
     * Build a file system safe hash that represents the generator and the specified options.
     * @param generator The name of the Yeoman generator.
     * @param options The options applied to the generator.
     * @private
     */
    private async getTemplateId(generator: string, options: { [key: string]: string; }): Promise<string> {
        const hash = await argon2.hash(generator + Object.keys(options).sort().map(k => k + options[k]).join(""));
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
     */
    async generateTemplateSync(generator: string, options: { [key: string]: string; }): Promise<string> {

        // Create a hash based on the generator and the options
        const hash = await this.getTemplateId(generator, options);
        // This is where the template is created
        const zipPath = path.join(os.tmpdir(), hash + '.zip');

        await this.buildNewTemplate(generator, options, zipPath);

        return zipPath;
    }

    /**
     * Generate a template in a background operation, and return the hash for use with getTemplate().
     * @param generator The name of the generator.
     * @param options The generator options.
     */
    async generateTemplate(generator: string, options: { [key: string]: string; },): Promise<string> {

        // Create a hash based on the generator and the options
        const hash = await this.getTemplateId(generator, options);
        // This is where the template is created
        const zipPath = path.join(os.tmpdir(), hash + '.zip');

        // trigger the build, but don't wait for it
        this.buildNewTemplate(generator, options, zipPath)
            .catch(e => console.log(e));

        return hash;
    }

    /**
     * Build the template and save it in a temporary directory.
     * @param generator The name of the generator.
     * @param options The generator options.
     * @param zipPath The path to save the template to.
     */
    buildNewTemplate(generator: string, options: { [key: string]: string; }, zipPath: string) {
        const lockFilePath = zipPath + ".lock";
        return new Promise((resolve, reject) => {
            lockFile.lock(lockFilePath, (err: never) => {
                if (err) return reject(err);

                if (!fs.existsSync(zipPath)) {
                    return this.writeTemplate(generator, options, zipPath)
                        .then(() => resolve(zipPath))
                        .catch((err3) => reject(err3));
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
     * @param zipPath The path to save the generator ZIP file to.
     * @private
     */
    private async writeTemplate(generator: string, options: { [key: string]: string; }, zipPath: string) {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "template"));

        try {
            const env = yeoman.createEnv({cwd: tempDir}, {}, new NonInteractiveAdapter({}));
            env.register(this.resolveGenerator(generator), 'octopus-generator:app');

            await env.run('octopus-generator:app', options);

            const zip = new AdmZip();
            zip.addLocalFolder(tempDir);
            zip.writeZip(zipPath);
        } finally {
            try {
                fs.rmSync(tempDir, {recursive: true});
            } catch {
                console.error('TemplateGenerator-Template-TempDirCleanupFailed: The temporary directory was not removed.')
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
    private resolveGenerator(generator: string, attemptInstall = true): string {
        try {
            return require.resolve(generator + "/generators/app")
        } catch (e) {
            /*
             If the module was not found, we allow module downloading, and this is the first attempt,
             try downloading the module and return it.
             */
            if (e.code === "MODULE_NOT_FOUND" && enableNpmInstall() && attemptInstall) {
                console.log("Attempting to run npm install " + generator);
                execSync("npm install " + generator);
                return this.resolveGenerator(generator, false)
            } else {
                throw e;
            }
        }
    }
}
