// create temporary working directory
import * as os from 'os';
import {debug} from '../utils';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import {copySync, ensureDirSync} from 'fs-extra';
import jsdoc2md from 'jsdoc-to-markdown';
import baseJsdocConf from '../utils/baseJsdocConf';
import classTemplate from '../dmd-cplacejs/templates/tmpl-class';
import namespaceTemplate from '../dmd-cplacejs/templates/tmpl-namespace';
import typedefTemplate from '../dmd-cplacejs/templates/tmpl-typedef';
import {groupData} from './BuilderUtils';
import '../dmd-cplacejs/helper/helpers'
// const {getInstalledPathSync} = require('get-installed-path');
// const jsdoc = require('jsdoc-api');

interface JsdocPaths {
    sourceDir: string;
    config: string;
    jsdocPlugin: string;
    cplacePlugin: string;
    out: string;
}

export default class DocsBuilder {

    private workingDir: string;

    constructor(private readonly plugins: Map<string, string>, private readonly destination: string, private readonly outputHtml) {
        this.workingDir = DocsBuilder.createTemporaryWorkingDir();

        for (let key of plugins.keys()) {
            if (key === 'cf.cplace.platform') {
                plugins.set(key, path.resolve(path.join('docs', key)));
            } else {
                plugins.delete(key);
            }
        }
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

        let destinationPath = path.join(this.workingDir, 'out');
        if (this.destination) {
            destinationPath = this.destination;
        }
        ensureDirSync(destinationPath);

        const docsSource = this.getAllDocsPaths();

        Object.keys(docsSource).forEach((plugin) => {
            console.log(docsSource[plugin]);

            const pathsForJsdoc: JsdocPaths = {
                cplacePlugin: plugin,
                sourceDir: docsSource[plugin],
                config: jsdocConfPath,
                jsdocPlugin: require.resolve('../lib/cplaceJsdocPlugin'),
                out: destinationPath,
            };
            DocsBuilder.generateConfiguration(pathsForJsdoc);
            this.buildForPlugin(plugin, pathsForJsdoc);
        });
        console.log('Docs generated in folder: ' + destinationPath);
    }

    buildForPlugin(plugin: string, jsdocPaths: JsdocPaths) {
        let docsData = jsdoc2md.getTemplateDataSync({
            'no-cache': true,
            files: jsdocPaths.sourceDir + '/**/*.js',
            configure: jsdocPaths.config,

        });

        const groups = groupData(docsData);

        Object.keys(groups).forEach((group) => {
            const templateClosure = DocsBuilder.getTemplateClosure(group);

            for (const entry of groups[group]) {
                const template = templateClosure(entry);
                // console.log(`rendering ${entry}, template: ${template}`);
                const output = jsdoc2md.renderSync({data: docsData, template: template});
                fs.writeFileSync(path.resolve(jsdocPaths.out, `${entry}.md`), output);
            }
        });

        // do it for global typedefs
        const templateClosure = DocsBuilder.getTemplateClosure('typedef');
        const template = templateClosure('Helper types');
        // console.log(`rendering Helper types, template: ${template}`);
        const output = jsdoc2md.renderSync({
            data: docsData,
            helper: require.resolve('../dmd-cplacejs/helper/helpers'),
            template: template
        });
        fs.writeFileSync(path.resolve(jsdocPaths.out, 'helper-types.md'), output);
        // copy example files.
        // link between docs
    }

    private copyDocsFromPlugins() {
        this.plugins.forEach((pluginPath, pluginName) => {
            copySync(
                // path.join(pluginPath, 'assets', 'cplaceJS'),
                pluginPath,
                path.join(this.workingDir, 'allDocs', pluginName)
            );
        });
    }

    private static generateConfiguration(jsdocPaths: JsdocPaths) {
        debug('Generating jsdoc configuration...');
        const jsDocConf = Object.assign({}, baseJsdocConf);
        // set path of all docs folders
        jsDocConf.opts.docsDir = jsdocPaths.sourceDir;
        // add our jsdoc plugin path
        // jsDocConf.plugins.push(jsdocPaths.jsdocPlugin);

        const content = JSON.stringify(jsDocConf, null, 4);
        debug('Writing jsdoc configuration... \n' + content);
        fs.writeFileSync(
            jsdocPaths.config,
            content,
            {encoding: 'utf8'}
        );
    }

    private getAllDocsPaths(): Object {
        const docsPaths = {};
        for (const pluginName of this.plugins.keys()) {
            docsPaths[pluginName] = path.join(this.workingDir, 'allDocs', pluginName, 'docs');
        }
        return docsPaths;
    }


    private static getTemplateClosure(type) {
        switch (type) {
            case 'className':
                return classTemplate;
            case 'namespace':
                return namespaceTemplate;
            case 'typedef':
                return typedefTemplate;
            default:
                return () => {
                    return '{{>docs}}';
                };
        }
    }
}


