const baseConf = {
    'tags': {
        'allowUnknownTags': true,
        'dictionaries': [
            'jsdoc'
        ]
    },
    'plugins': [
        'plugins/markdown'
    ],
    'recurseDepth': 10,
    'source': {
        'include': [
            './docs'
        ],
        'exclude': [
            'node_modules',
            'out',
            'examples',
            'static'
        ]
    },
    'templates': {
        'default': {
            'outputSourceFiles': false,
        },
        'footerText': 'cplaceJS API - Copyright 2018, collaboration Factory AG. All rights reserved.',
        'logo': {
            'url': 'cplace.png',
            'width': '70px',
            'height': '70px',
            'link': 'index.html'
        },
        'better-docs': {
            'name': 'cplaceJS API',
            'navigation': [
                {
                    'label': 'Imprint',
                    'href': 'imprint.html'
                },
                {
                    'label': 'Privacy',
                    'href': 'privacy.html'
                }
            ]
        }
    },
    'tabNames': {
        'api': 'API',
        'tutorials': 'Examples'
    },
    'opts': {
        'encoding': 'utf8',
        'private': true,
        'recurse': true,
        'tutorials': 'examples',
        'template': 'node_modules/better-docs',
        'destination': './out'
    }
};

export default baseConf;