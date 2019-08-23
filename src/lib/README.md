A jsdoc plugin for generating cplaceJS docs

This plugin expects following directory structure
  
<pre>   
docs/
├── plugin1/
|   ├── manifest.json
│   ├── docs/
|   |   ├── file1.js
|   |   ├── file2.js
│   └── examples/
|       └── tut1.md 
├── plugin2/
|   ├── manifest.json
│   ├── docs/
|   |   ├── file1.js
|   |   ├── file2.js
│   └── examples/
|       └── tut1.md 
└── plugin3/
    ├── manifest.json
    ├── ...
   
</pre>

### manifest.json
Every plugin must provide <code>manifest.json</code>. This file contains meta data for the plugin docs 

```json5
{
    "displayName": "Title for this plugin doc section",
    "examplesTitle": "Title for examples section of this plugin",
    "apiTitle": "Title for api docs section of this plugin",
    "examples": { 
        // same structure as examples.json  
    }
}
```

