"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const DocsBuilder_1 = __importDefault(require("../builder/DocsBuilder"));
const formatting_1 = require("../utils/formatting");
class CplaceJSDocs {
    constructor(buildConfig) {
        this.buildConfig = buildConfig;
        this.plugins = this.setup();
    }
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugins.size) {
                console.log('No plugins with cplaceJS docs found');
                return new Promise(resolve => resolve());
            }
            const mainRepoPath = this.getMainRepoPath();
            if (mainRepoPath === null) {
                utils_1.debug(`(CplaceJSDocs) Main repo cannot be found...`);
                return new Promise((resolve, reject) => reject('Main repo cannot be found...'));
            }
            const startTime = new Date().getTime();
            console.log(`(CplaceJSDocs) Found ${this.plugins.size} plugins with jsdoc: ${Array.from(this.plugins.keys()).join(', ')}`);
            const docsBuilder = new DocsBuilder_1.default(this.plugins, this.buildConfig.destination);
            docsBuilder.start()
                .then(() => {
                const endTime = new Date().getTime();
                console.log(`CplaceJS docs built successfully (${formatting_1.formatDuration(endTime - startTime)})`);
            });
        });
    }
    setup() {
        let repoPaths;
        const plugins = new Map();
        const mainRepoPath = this.getMainRepoPath();
        if (mainRepoPath === null) {
            console.error(`(CplaceJSDocs) Main repo cannot be found...`);
            process.exit(1);
        }
        utils_1.debug(`(CplaceJSDocs) Building cplaceJS docs for all repos... `);
        repoPaths = this.getAllPotentialRepos();
        repoPaths.forEach(repoPath => {
            const files = fs.readdirSync(repoPath);
            files.forEach(file => {
                const filePath = path.join(repoPath, file);
                if (fs.lstatSync(filePath).isDirectory()) {
                    const potentialPluginName = path.basename(file);
                    if (CplaceJSDocs.directoryLooksLikePlugin(filePath) && CplaceJSDocs.pluginHasCplaceJSDocs(filePath)) {
                        plugins.set(potentialPluginName, filePath);
                    }
                }
            });
        });
        return plugins;
    }
    getAllPotentialRepos() {
        const repos = new Set();
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
    getRepoRoot() {
        return this.buildConfig.repos;
    }
    getMainRepoPath() {
        let mainRepoPath;
        mainRepoPath = path.resolve(path.join(this.getRepoRoot(), CplaceJSDocs.CPLACE_REPO_NAME));
        // if repo is checked out as cplace
        if (!fs.existsSync(mainRepoPath)) {
            mainRepoPath = path.resolve(path.join(this.getRepoRoot(), CplaceJSDocs.CPLACE_REPO_ALT_NAME));
        }
        if (!fs.existsSync(path.join(mainRepoPath, CplaceJSDocs.PLATFORM_PLUGIN_NAME))) {
            return null;
        }
        return mainRepoPath;
    }
    static directoryLooksLikePlugin(pluginPath) {
        return fs.existsSync(path.join(pluginPath, 'src'));
    }
    static pluginHasCplaceJSDocs(pluginPath) {
        const docsPath = path.join(pluginPath, 'assets', 'cplaceJS');
        return fs.existsSync(docsPath) && fs.lstatSync(docsPath).isDirectory();
    }
}
CplaceJSDocs.CPLACE_REPO_NAME = 'main';
CplaceJSDocs.CPLACE_REPO_ALT_NAME = 'cplace';
CplaceJSDocs.PLATFORM_PLUGIN_NAME = 'cf.cplace.platform';
CplaceJSDocs.DESCRIPTOR_FILE_NAME = 'pluginDescriptor.json';
exports.CplaceJSDocs = CplaceJSDocs;
//# sourceMappingURL=CplaceJSDocs.js.map