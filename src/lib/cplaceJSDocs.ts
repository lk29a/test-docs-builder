/**
 * Plugin to help in cplaceJS docs generation
 */

import * as fs from 'fs';
import * as path from 'path';

const env = require('jsdoc/env');
const logger = require('jsdoc/util/logger');

function getDocDirectories(path) {
    const _dirs: Array<string> = [];

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

exports.handlers = {
    /**
     * read manifest.json from all plugin directories and store them
     */
    parseBegin: () => {
        env.cplaceJSDocs = {};
        const sourceDir = env.conf.source.include[0];
        const pluginDirs = getDocDirectories(sourceDir);
        pluginDirs.forEach((pluginDir, index) => {
            const manifestFile = path.resolve(path.join(sourceDir, pluginDir, 'manifest.json'));
            if (fs.existsSync(manifestFile)) {
                const manifest = fs.readFileSync(manifestFile, 'utf-8');
                env.cplaceJSDocs[pluginDir] = JSON.parse(manifest);
            } else {
                logger.warn('No manifest file found. Skipping', pluginDir);
            }
        });
    },

    // taken from better-docs category plugin
    newDoclet: ({doclet}) => {
        if (doclet.tags && doclet.tags.length > 0) {
            const categoryTag = doclet.tags.find(tag => tag.title === 'category');
            if (categoryTag) {
                doclet.category = categoryTag.value
            }
        }
    },

    fileBegin: ({filename}) => {
        console.log(filename);
    }
};