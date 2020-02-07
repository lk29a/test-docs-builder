interface IGroups {
    className: Set<string>,
    namespace: Set<string>
}


export function groupData(templateData: Array<any>): IGroups {
    return templateData.reduce((groups: IGroups, identifier) => {

        switch (identifier.kind) {
            case 'namespace':
                groups.namespace.add(identifier.name);
                break;

            case 'class':
                groups.className.add(identifier.name);
                break;
        }

        // if (identifier.meta && identifier.meta.filename == 'Search.js') {
        //     console.log(identifier);
        // }

        return groups;
    }, {
        className: new Set<string>(),
        namespace: new Set<string>()
    });
}
