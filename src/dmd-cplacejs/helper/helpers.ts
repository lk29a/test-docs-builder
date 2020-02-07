import handlebars from 'handlebars';
import ddata from 'dmd/helpers/ddata';


export function typeDefs(options) {
    options.hash.kind = 'typedef';
    return handlebars.helpers.each(ddata._identifiers(options), options);
}

export function inlineLinks(text, options) {
    if (text) {
        let links = ddata.parseLink(text);
        links.forEach(function (link) {
            let linked = ddata._link(link.url, options);
            if (link.caption === link.url) link.caption = linked.name;
            if (linked.url) link.url = linked.url;
            text = text.replace(link.original, '[' + link.caption + '](' + link.url + ')');
        })
    }

    return text;
}