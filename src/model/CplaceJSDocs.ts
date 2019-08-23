import * as fs from 'fs';
import * as path from 'path';
import {cerr, debug} from '../utils';
import DocsBuilder from '../builder/DocsBuilder';
import {formatDuration} from '../utils/formatting';

export interface ICplaceJSDocsConfig {
    /**
     * Repos to build documentation for
     */
    repos: Array<string>;

    /**
     * Destination for generated output
     */
    destination: string;

    /**
     * Decide should the files be uploaded to the server. Requires users public key to be added to the server
     */
    uploadToServer: boolean;

    /**
     * Generate documentation only for the repo the command is executed in. This will ignore repos setting.
     */
    localOnly: boolean;

    /**
     * Output type of generated docs. Default is markdown.
     */
    html: boolean;
}

export class CplaceJSDocs {
    public static readonly CPLACE_REPO_NAME = 'main';
    public static readonly PLATFORM_PLUGIN_NAME = 'cf.cplace.platform';

    private plugins: Map<string, string>;

    constructor(private readonly buildConfig: ICplaceJSDocsConfig) {
        this.plugins = this.setup();
    }

    public async build(): Promise<void> {
        if (!this.plugins.size) {
            console.log('Now Promise<void plugins with cplaceJS docs found');
            return new Promise<void>(resolve => resolve());
        }

        const mainRepoPath = this.getMainRepoPath();
        if (mainRepoPath === null) {
            debug(`(CplaceJSDocs) Main repo cannot be found...`);
            return new Promise<void>((resolve, reject) => reject(
                'Main repo cannot be found...'
            ));
        }

        const startTime = new Date().getTime();

        const docsBuilder = new DocsBuilder(this.plugins, this.buildConfig.destination, this.buildConfig.html);
        docsBuilder.start()
            .then(() => {
                const endTime = new Date().getTime();
                console.log(`CplaceJS docs built successfully (${formatDuration(endTime - startTime)})`)
            })
    }

    private setup(): Map<string, string> {
        let repoPaths = new Set<string>();
        const plugins = new Map<string, string>();
        const mainRepoPath = this.getMainRepoPath();
        if (mainRepoPath === null) {
            console.error(`(CplaceJSDocs) Main repo cannot be found...`);
            process.exit(1);
        }

        if (this.buildConfig.localOnly) {
            debug(`(CplaceJSDocs) Building cplaceJS docs only for current repo since localOnly execution... `);
            repoPaths.add(path.dirname(CplaceJSDocs.getRepoRoot()));
        } else {
            if (this.buildConfig.repos.length) {
                debug(`(CplaceJSDocs) Building cplaceJS docs for ${this.buildConfig.repos.join(', ')}`);
                this.buildConfig.repos.forEach((repoName) =>
                    // @ts-ignore
                    repoPaths.add(path.resolve(mainRepoPath, '..', 'repoName')));
            } else {
                debug(`(CplaceJSDocs) Building cplaceJS docs for all repos... `);
                repoPaths = this.getAllPotentialRepos()
            }
        }

        repoPaths.forEach(repoPath => {
            const files = fs.readdirSync(repoPath);
            files.forEach(file => {
                const filePath = path.join(repoPath, file);
                if (fs.lstatSync(filePath).isDirectory()) {
                    const potentialPluginName = path.basename(file);
                    if (CplaceJSDocs.directoryLooksLikePlugin(filePath, potentialPluginName) && CplaceJSDocs.pluginHasCplaceJSDocs(filePath)) {
                        plugins.set(potentialPluginName, filePath);
                    }
                }
            });
        });

        return plugins;
    }

    private getAllPotentialRepos(): Set<string> {
        const repos = new Set<string>();
        const mainRepoPath = this.getMainRepoPath();
        if (mainRepoPath != null) {
            const containingDir = path.resolve(path.join(mainRepoPath, '..'));
            const files = fs.readdirSync(containingDir);
            files.forEach(file => {
                const filePath = path.join(containingDir, file);
                if (fs.lstatSync(filePath).isDirectory()) {
                    repos.add(filePath);
                }
            });
        }
        return repos;
    }

    private static getRepoRoot() {
        return '/Users/pragatisureka/software/collaboration-factory/repos/main';
        // return process.cwd();
    }

    private getMainRepoPath(): string | null {
        let mainRepoPath = '';
        if (this.buildConfig.localOnly) {
            mainRepoPath = path.resolve(CplaceJSDocs.getRepoRoot());
        } else {
            mainRepoPath = path.resolve(path.join(CplaceJSDocs.getRepoRoot(), '..', CplaceJSDocs.CPLACE_REPO_NAME));
        }

        if (!fs.existsSync(mainRepoPath)
            || !fs.existsSync(path.join(mainRepoPath, CplaceJSDocs.PLATFORM_PLUGIN_NAME))) {
            return null;
        }
        return mainRepoPath;
    }

    private static directoryLooksLikePlugin(pluginPath: string, potentialPluginName: string): boolean {
        return fs.existsSync(path.join(pluginPath, `${potentialPluginName}.iml`)) // IML file
            && fs.existsSync(path.join(pluginPath, 'src')); // path to src directory - release-notes will be excluded
    }

    private static pluginHasCplaceJSDocs(pluginPath: string): boolean {
        const docsPath = path.join(pluginPath, 'assets', 'cplaceJS');
        return fs.existsSync(docsPath) && fs.lstatSync(docsPath).isDirectory();
    }

    private static findPluginPath(pluginName: string, repoDependencies: string[], buildConfig: ICplaceJSDocsConfig): string {
        let relativePath = pluginName;
        if (fs.existsSync(path.join(CplaceJSDocs.getRepoRoot(), relativePath))) {
            return path.join(CplaceJSDocs.getRepoRoot(), relativePath);
        }
        for (const repoName of repoDependencies) {
            relativePath = path.join('..', repoName, pluginName);
            if (fs.existsSync(relativePath)) {
                return relativePath;
            }
        }
        console.error(cerr`Could not locate plugin ${pluginName}`);
        throw Error(`Could not locate plugin ${pluginName}`);
    }

}