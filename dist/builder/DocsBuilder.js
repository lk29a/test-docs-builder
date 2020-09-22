"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }

        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
// create temporary working directory
const os = __importStar(require("os"));
const utils_1 = require("../utils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const rimraf = __importStar(require("rimraf"));
const fs_extra_1 = require("fs-extra");
const jsdoc_to_markdown_1 = __importDefault(require("jsdoc-to-markdown"));
const baseJsdocConf_1 = __importDefault(require("../utils/baseJsdocConf"));
const tmpl_class_1 = __importDefault(require("../dmd-cplacejs/templates/tmpl-class"));
const tmpl_namespace_1 = __importDefault(require("../dmd-cplacejs/templates/tmpl-namespace"));
const tmpl_typedef_1 = __importDefault(require("../dmd-cplacejs/templates/tmpl-typedef"));
const BuilderUtils_1 = require("./BuilderUtils");
require("../dmd-cplacejs/helper/helpers");
class DocsBuilder {
    constructor(plugins, destination) {
        this.plugins = plugins;
        this.destination = destination;
        this.workingDir = DocsBuilder.createTemporaryWorkingDir();
    }

    static createTemporaryWorkingDir() {
        const osTempDir = os.tmpdir();
        const tmpDir = path.join(osTempDir, 'cplaceJS-docs-builder');
        rimraf.sync(tmpDir);
        fs.mkdirSync(tmpDir);
        utils_1.debug(`Using temp directory ${tmpDir}`);
        return tmpDir;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Collecting docs from plugins...');
            this.copyDocsFromPlugins();
            const jsdocConfPath = path.join(this.workingDir, 'jsdoc.json');
            let destinationPath = path.join(this.workingDir, 'out');
            if (this.destination) {
                destinationPath = this.destination;
            }
            fs_extra_1.ensureDirSync(destinationPath);
            const docsSource = this.getAllDocsPaths();
            Object.keys(docsSource).forEach((plugin) => {
                const pathsForJsdoc = {
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
        });
    }
    buildForPlugin(plugin, jsdocPaths) {
        // todo fix-this do not require manifest file.
        let metaData = DocsBuilder.getMetaData(jsdocPaths.sourceDir, plugin);
        if (metaData.pluginShortName) {
            metaData.pluginShortName = metaData.pluginShortName.replace(/\s+/g, '-').toLowerCase();
        } else {
            console.error(`(CplaceJSDocs) Incorrect meta data cannot build docs for ${plugin}`);
            return;
        }
        const outputPath = path.join(jsdocPaths.out, plugin, 'api');
        fs_extra_1.mkdirpSync(outputPath);
        let docsData = jsdoc_to_markdown_1.default.getTemplateDataSync({
            'no-cache': true,
            files: path.join(jsdocPaths.sourceDir, 'docs', '/**/*.js'),
            configure: jsdocPaths.config,
        });
        // group different types of entities
        const groups = BuilderUtils_1.groupData(docsData);
        BuilderUtils_1.generateLinks(plugin, groups);
        Object.keys(groups).forEach((group) => {
            if (group === 'typedef') {
                return;
            }
            const templateClosure = DocsBuilder.getTemplateClosure(group);
            for (const entry of groups[group]) {
                const template = templateClosure(entry);
                utils_1.debug(`rendering ${entry}, template: ${template}`);
                const output = jsdoc_to_markdown_1.default.renderSync({
                    data: docsData,
                    template: template,
                    helper: require.resolve('../dmd-cplacejs/helper/helpers'),
                });
                fs.writeFileSync(path.resolve(outputPath, `${entry}.md`), output);
            }
        });
        // do it for global typedefs
        const templateClosure = DocsBuilder.getTemplateClosure('typedef');
        const template = templateClosure('Helper types');
        const output = jsdoc_to_markdown_1.default.renderSync({
            data: docsData,
            helper: require.resolve('../dmd-cplacejs/helper/helpers'),
            template: template,
            partials: require.resolve('../dmd-cplacejs/partials/typedef/docs'),
        });
        fs.writeFileSync(path.resolve(outputPath, 'helper-types.md'), output);
    }
    static getMetaData(dir, plugin) {
        const file = path.resolve(dir, 'manifest.json');
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } else {
            const shortName = plugin.split('.').pop();
            return {
                pluginShortName: shortName || plugin,
                displayName: shortName || plugin,
                examplesTitle: 'Examples',
                apiTitle: 'API'
            };
        }
    }
    copyDocsFromPlugins() {
        this.plugins.forEach((pluginPath, pluginName) => {
            fs_extra_1.copySync(path.join(pluginPath, 'assets', 'cplaceJS'), path.join(this.workingDir, 'allDocs', pluginName));
        });
    }
    static generateConfiguration(jsdocPaths) {
        utils_1.debug('Generating jsdoc configuration...');
        const jsDocConf = Object.assign({}, baseJsdocConf_1.default);
        // set path of all docs folders
        jsDocConf.opts.docsDir = jsdocPaths.sourceDir;
        // add our jsdoc plugin path
        // jsDocConf.plugins.push(jsdocPaths.jsdocPlugin);
        const content = JSON.stringify(jsDocConf, null, 4);
        utils_1.debug('Writing jsdoc configuration... \n' + content);
        fs.writeFileSync(jsdocPaths.config, content, {encoding: 'utf8'});
    }
    getAllDocsPaths() {
        const docsPaths = {};
        for (const pluginName of this.plugins.keys()) {
            docsPaths[pluginName] = path.join(this.workingDir, 'allDocs', pluginName);
        }
        return docsPaths;
    }
    static getTemplateClosure(type) {
        switch (type) {
            case 'clazz':
                return tmpl_class_1.default;
            case 'namespace':
                return tmpl_namespace_1.default;
            case 'typedef':
                return tmpl_typedef_1.default;
            default:
                return () => {
                    return '{{>docs}}';
                };
        }
    }
}
exports.default = DocsBuilder;
//# sourceMappingURL=DocsBuilder.js.map