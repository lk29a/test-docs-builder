"use strict";
/**
 * Plugin to help in cplaceJS docs generation
 */
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", {value: true});
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const env = require('jsdoc/env');
const logger = require('jsdoc/util/logger');
function getDocDirectories(path) {
    const _dirs = [];
    const files = fs.readdirSync(path);
    for (let i = 0, l = files.length; i < l; i++) {
        let file = String(files[i]);
        // skip dot files
        if (file.match(/^\.[^./\\]/)) {
            continue;
        }
        if (fs.statSync(path + '/' + file).isDirectory()) {
            _dirs.push(file);
        }
    }
    return _dirs;
}
/**
 * This is supposed to work only with a single cplace plugin
 */
exports.handlers = {
    /**
     * read manifest.json from all plugin directories and store them
     */
    parseBegin: () => {
        env.cplaceJSDocs = {};
        env.cplaceJSDocs.pluginDocs = {};
        env.cplaceJSDocs.files = {};
        const sourceDirs = env.opts.docsDirs;
        Object.keys(sourceDirs).forEach(plugin => {
            const base = sourceDirs[plugin];
            const manifestFile = path.join(base, '../manifest.json');
            if (fs.existsSync(manifestFile)) {
                const manifest = fs.readFileSync(manifestFile, 'utf-8');
                env.cplaceJSDocs.pluginDocs = JSON.parse(manifest);
                env.cplaceJSDocs.pluginDocs.base = base;
            } else {
                logger.warn('No manifest file found. Skipping', plugin);
            }
        });
    },
    fileBegin: ({filename}) => {
        const pluginDocs = env.cplaceJSDocs.pluginDocs;
        const plugins = Object.keys(pluginDocs);
        for (let i = 0; i < plugins.length; i++) {
            if (filename.startsWith(pluginDocs[plugins[i]].base)) {
                env.cplaceJSDocs.files[filename] = plugins[i];
                break;
            }
        }
    },
    newDoclet: ({doclet}) => {
        const filename = path.join(doclet.meta.path, doclet.meta.filename);
        if (env.cplaceJSDocs.files[filename] && doclet.scope === 'global') {
            const plugin = env.cplaceJSDocs.files[filename];
            doclet.category = env.cplaceJSDocs.pluginDocs[plugin].displayName;
            doclet.plugin = plugin;
        }
    }
};
//# sourceMappingURL=cplaceJsdocPlugin.js.map