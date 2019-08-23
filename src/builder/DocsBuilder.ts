// create temporary working directory
import * as os from 'os';
import {debug} from '../utils';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import {copySync, ensureDirSync} from 'fs-extra';
import baseJsdocConf from '../utils/baseJsdocConf';

const {getInstalledPathSync} = require('get-installed-path');
const jsdoc = require('jsdoc-api');

interface JsdocPaths {
    source: Array<string>;
    config: string;
    template: string;
    plugin: string;
    out: string;
    examples: string;
}

export default class DocsBuilder {

    private workingDir: string;

    constructor(private readonly plugins: Map<string, string>, private readonly destination: string, private readonly outputHtml) {
        this.workingDir = DocsBuilder.createTemporaryWorkingDir();
        plugins.keys()
    }

    static createTemporaryWorkingDir(): string {
        const osTempDir = os.tmpdir();
        const tmpDir = path.join(osTempDir, 'cplaceJS-docs-builder');
        rimraf.sync(tmpDir);
        fs.mkdirSync(tmpDir);
        debug(`Using temp directory ${tmpDir}`);
        return tmpDir
    }

    public async start(): Promise<void> {
        console.log('Collecting docs from plugins...');
        this.copyDocsFromPlugins();
        const jsdocConfPath = path.join(this.workingDir, 'jsdoc.json');
        const docsSource = this.getAllDocsPaths();
        const templatePath = getInstalledPathSync('better-docs', {
            local: true
        });

        let destinationPath = path.join(this.workingDir, 'out');
        if (this.destination) {
            destinationPath = this.destination;
        }
        ensureDirSync(destinationPath);

        const pathsForJsdoc: JsdocPaths = {
            source: docsSource,
            config: jsdocConfPath,
            template: templatePath,
            plugin: require.resolve('../lib/cplaceJSDocs'),
            out: destinationPath,
            examples: path.join(this.workingDir, 'allDocs')
        };

        DocsBuilder.generateConfiguration(pathsForJsdoc);
        const output = jsdoc.renderSync({
            configure: jsdocConfPath,
            files: docsSource
        });

        debug(output);
        console.log('Docs generated in folder: ' + destinationPath);
    }

    private copyDocsFromPlugins() {
        this.plugins.forEach((pluginPath, pluginName) => {
            copySync(
                path.join(pluginPath, 'assets', 'cplaceJS'),
                path.join(this.workingDir, 'allDocs', pluginName)
            );
        });
    }

    private static generateConfiguration(jsdocPaths: JsdocPaths) {
        debug('Generating jsdoc configuration...');
        const jsDocConf = Object.assign({}, baseJsdocConf);
        // set path of all docs folders
        jsDocConf.source.include = jsdocPaths.source;
        // add out jsdoc plugin path
        jsDocConf.plugins.push(jsdocPaths.plugin);
        // set template path
        jsDocConf.opts.template = jsdocPaths.template;
        // set output path
        jsDocConf.opts.destination = jsdocPaths.out;
        // set tutorials path
        jsDocConf.opts.tutorials = jsdocPaths.examples;
        // setup template specific paths
        // jsDocConf.templates.default.staticFiles.include = [path.join(jsdocPaths.template)]

        const content = JSON.stringify(jsDocConf, null, 4);
        debug('Writing jsdoc configuration... \n' + content);
        fs.writeFileSync(
            jsdocPaths.config,
            content,
            {encoding: 'utf8'}
        );
    }

    private getAllDocsPaths(): Array<string> {
        const docsPaths: Array<string> = [];
        for (const pluginName of this.plugins.keys()) {
            const docPath = path.join(this.workingDir, 'allDocs', pluginName, 'docs');
            docsPaths.push(docPath);
        }
        return docsPaths;
    }
}


