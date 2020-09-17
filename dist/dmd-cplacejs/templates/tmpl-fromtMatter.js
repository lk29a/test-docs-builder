"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
const template_1 = __importDefault(require("./template"));
const frontMatterTemplate = template_1.default`
---
title: ${0}
weight: 30
type: "section"
---
`;
exports.default = frontMatterTemplate;
//# sourceMappingURL=tmpl-fromtMatter.js.map