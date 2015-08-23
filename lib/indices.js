/**
 * Created by sqwrl on 8/21/15.
 */

(function() {
    var config = require('config'),
        request = require('request'),
        fs = require('fs'),
        path = require('path'),
        _ = require('lodash'),
        logger = global.ds.logger;

    /**
     * Generate an indices file for retrieval by the client
     */

    generateIndicesFile();

    function generateIndicesFile() {

        // issue the generic mapping request
        request({
                method: 'GET',
                uri: config.es.server + '/_mapping/'
            },
            function (err, res, body) {
                if (err) {
                    logger.error(err, 'ERROR: retrieving index information');
                } else {
                    // cache in de ds global variable
                    global.ds['index'] = parseMapping(JSON.parse(body));

                    // write to file for browser consumption
                    fs.writeFileSync(config.web.publicFolder + '/config/indexInfo.js','var ds = ' + JSON.stringify(global.ds.index));
                }
            }
        );
    }

    /**
     * Parse the retrieved mapping file for suitable consumption
     */
    function parseMapping(mapping) {
        var index = {};
        var indices = [];
        var indexKeys = _.keysIn(mapping);
        for (var i = 0; i < indexKeys.length; i++) {
            index = {
                name: indexKeys[i],
                types: []
            };

            var typeKeys = _.keysIn(mapping[indexKeys[i]].mappings);
            for (var t=0; t < typeKeys.length; t++) {
                var type = {
                    type: typeKeys[t],
                    fields: []
                };

                var fieldKeys = _.keysIn(mapping[indexKeys[i]].mappings[typeKeys[t]]._meta);
                for (var f=0; f < fieldKeys.length; f++) {
                    type.fields.push({
                        id: fieldKeys[f],
                        text: mapping[indexKeys[i]].mappings[typeKeys[t]]._meta[fieldKeys[f]].text,
                        facet: mapping[indexKeys[i]].mappings[typeKeys[t]]._meta[fieldKeys[f]].facet
                    });
                }

                index.types.push(type);
            }

            indices.push(index);
        }

        return indices;
    }
})();