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
Every plugin must provide <code>manifest.json</code>. This file contains metadata for plugin docs 

```json5
{
    "pluginShortName": "Must be a unique string, will be used to generate links",
    "displayName": "Title for this plugin doc section",
    "examplesTitle": "Title for examples section of this plugin",
    "apiTitle": "Title for api docs section of this plugin",
}
```


*pluginShortName* should be common name of the plugin. _Spaces will be replaced by hypens_. 
Examples 
cf.cplace.platform => platform // link will use platform

cf.cplace.office-reports => Office Reports // link will use office-reports


    
    
