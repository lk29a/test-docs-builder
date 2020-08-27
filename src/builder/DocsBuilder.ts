// create temporary working directory
import * as os from 'os';
import {debug} from '../utils';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import {copySync, ensureDirSync, outputFileSync} from 'fs-extra';
import jsdoc2md from 'jsdoc-to-markdown';
import baseJsdocConf from '../utils/baseJsdocConf';
import classTemplate from '../dmd-cplacejs/templates/tmpl-class';
import namespaceTemplate from '../dmd-cplacejs/templates/tmpl-namespace';
import typedefTemplate from '../dmd-cplacejs/templates/tmpl-typedef';
import {generateLinks, groupData} from './BuilderUtils';
import '../dmd-cplacejs/helper/helpers'
import {PluginMetaData} from './constants';
import frontMatterTemplate from "../dmd-cplacejs/templates/tmpl-fromtMatter";


// TODO: finalize docs by copying file to correct folder structure for hugodocs

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

        // // // TODO: remove this
        // for (let key of plugins.keys()) {
        //     if (key === 'cf.cplace.platform') {
        //         plugins.set(key, path.resolve(path.join('docs', key)));
        //     } else {
        //         plugins.delete(key);
        //     }
        // }
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
        // todo fix-this do not require manifest file.
        let metaData: PluginMetaData = DocsBuilder.getMetaData(jsdocPaths.sourceDir, plugin);

        if (!metaData.pluginShortName) {
            metaData.pluginShortName = metaData.pluginShortName.replace(/\s+/g, '-').toLowerCase();
        } else {
            console.error(`(CplaceJSDocs) Incorrect meta data cannot build docs for ${plugin}`);
            return;
        }

        const outputPaths = DocsBuilder.createDirectoryStructure(jsdocPaths.out, plugin, metaData);

        let docsData = jsdoc2md.getTemplateDataSync({
            'no-cache': true,
            files: path.join(jsdocPaths.sourceDir, 'docs', '/**/*.js'),
            configure: jsdocPaths.config,
        });

        // group different types of entities
        const groups = groupData(docsData);
        generateLinks(metaData.pluginShortName, groups);

        Object.keys(groups).forEach((group) => {
            if (group === 'typedef') {
                return;
            }
            const templateClosure = DocsBuilder.getTemplateClosure(group);

            for (const entry of groups[group]) {

                const template = templateClosure(entry);
                debug(`rendering ${entry}, template: ${template}`);
                const output = jsdoc2md.renderSync({
                    data: docsData,
                    template: template,
                    helper: require.resolve('../dmd-cplacejs/helper/helpers'),
                });
                fs.writeFileSync(path.resolve(outputPaths.docs, `${entry}.md`), output);
            }
        });

        // do it for global typedefs
        const templateClosure = DocsBuilder.getTemplateClosure('typedef');
        const template = templateClosure('Helper types');
        const output = jsdoc2md.renderSync({
            data: docsData,
            helper: require.resolve('../dmd-cplacejs/helper/helpers'),
            template: template,
            partials: require.resolve('../dmd-cplacejs/partials/typedef/docs'),
        });
        fs.writeFileSync(path.resolve(outputPaths.docs, 'helper-types.md'), output);

        copySync(path.resolve(jsdocPaths.sourceDir, 'examples'), outputPaths.examples);
        // copy example files.
        // link between docs
    }

    /**
     * Directory structure will be as follows eg.
     *  - cf.cplace.platform
     *      - _index.md
     *      - docs
     *          - _index.md
     *      - examples
     *          - _index.md
     *  - cf.cplace.officeReports
     *    ...
     *
     * If a directory already exists i.e. plugin name is duplicate a numeric suffix will be added
     */
    private static createDirectoryStructure(outputPath: string, pluginName: string, metaData: PluginMetaData) {
        const pluginOut = path.join(outputPath, pluginName);

        const pluginFm = frontMatterTemplate(metaData.displayName);
        outputFileSync(path.join(pluginOut, '_index.md'), pluginFm);

        const docsOut = path.join(pluginOut, 'docs');
        const docsFm = frontMatterTemplate(metaData.apiTitle);
        outputFileSync(path.join(docsOut, '_index.md'), docsFm);

        const examplesOut = path.join(pluginOut, 'examples');
        const examplesFm = frontMatterTemplate(metaData.examplesTitle);
        outputFileSync(path.join(examplesOut, '_index.md'), examplesFm);

        return {
            docs: docsOut,
            examples: examplesOut
        }
    }

    private static getMetaData(dir: string, plugin: string): PluginMetaData {
        const file = path.resolve(dir, 'manifest.json');
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } else {
            const shortName = plugin.split('.').pop()
            return {
                pluginShortName: shortName || plugin,
                displayName: shortName || plugin,
                examplesTitle: 'Examples',
                apiTitle: 'API'
            }
        }
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
            docsPaths[pluginName] = path.join(this.workingDir, 'allDocs', pluginName);
        }
        return docsPaths;
    }


    private static getTemplateClosure(type) {
        switch (type) {
            case 'clazz':
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


