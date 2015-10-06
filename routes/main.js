/**
 * Created by sqwrl on 8/7/15.
 */

var config          = require('config'),
    request         = require('request'),
    _               = require('lodash'),
    logger          = global.ds.logger;

/**
 * Main page rendering entry
 */
function index(req, res) {
    logger.info(req.session.userName, 'user');
    if (req.session.hasOwnProperty('userName') && req.session.userName !== 'Guest') {
        logger.info('render main');
        res.render('main', {title: 'Shop!', user: req.session.userName});
    } else {
        logger.info('render signin');
        res.redirect('/signin');
    }
}


/**
 * Function called from client to do fetch the data
 */
function shop (req, res) {
    if (req.query.indexName && req.query.indexType) {
        logger.debug(req.query.indexName, 'shop: index');
        logger.debug(req.query.indexType, 'shop: type');
        logger.debug(req.query.indexField, 'shop: field');
        logger.debug(req.query.strSearch, 'shop: for');
        logger.debug(req.query.filters, 'shop: filters');
        logger.debug(req.query.sort, 'shop: sort');
        var params = [req.query.indexName, req.query.indexType, req.query.indexField, req.query.strSearch, req.query.filters, req.query.sort];

        var callback = function (err, results) {
            if (err) {
                logger.error(err, 'ERROR: shop');
                res.status(500).json(err);
            } else {
                logger.debug(results, 'shop: result');
                res.send(results);
                res.end();
            }
        };

        doSearch(params, res, callback);
    }

}

/**
 * Formulate the elasticsearch request, initiate data processing, and send back to the client
 */
function doSearch(params, res, callback) {

    var filtered = JSON.parse(params[4]);
    var applyFilter = (filtered.fields.length > 0);

    var path = config.es.server + '/';
    path += params[0];
    path += (params[1] !== '') ? '/' + params[1] : '';
    path += '/_search';
    logger.debug(path, 'doSearch path');

    var q = {};
    switch (params[3]) {
        case '':
            if (applyFilter) {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"filtered\":{\"query\":{\"match_all\":{}},\"filter\":{}}},\"sort\":{},\"aggs\":{}}');
            } else {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"match_all\":{}},\"sort\":{},\"aggs\":{}}');
            }
            break;
        default:
            if (applyFilter) {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"filtered\":{\"query\":{\"wildcard\":{\"' + params[2] + '\":\"*' + params[3].toLowerCase() + '*\"}},\"filter\":{}}},\"sort\":{},\"aggs\":{}}');
            } else {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"wildcard\":{\"' + params[2] + '\":\"*' + params[3].toLowerCase() + '*\"}},\"sort\":{},\"aggs\":{}}');
            }
    }

    // load the facets
    var facets = [];
    _.find(global.ds.index, function (index) {
        if (index.name === params[0]) {
            for (var i=0; i < index.types.length; i++) {
                if (index.types[i].type === params[1]) {
                    var fields = index.types[i].fields;
                    for (var f=0; f < fields.length; f++) {
                        if (fields[f].type !== 'nested') {
                            if (fields[f].facet) {
                                facets.push({
                                    id: fields[f].id,
                                    type: fields[f].type
                                });
                            }
                        } else {
                            var nestedFields = fields[f].fields;
                            for (var n=0; n < nestedFields.length; n++) {
                                if (nestedFields[n].facet) {
                                    facets.push({
                                        id: fields[f].id + '.' + nestedFields[n].id,
                                        type: nestedFields[n].type
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // create the facet object
    var facetObject = {};
    for (var f=0; f<facets.length; f++) {
        switch (facets[f].type) {
            case 'string':
                facetObject[facets[f].id] = JSON.parse('{' + '\"terms\":{' + '\"field\":\"' + facets[f].id + '.raw\", \"size\": 0, \"order\":{\"_count\":\"desc\"}}}');
                break;
            case 'float':
            case 'integer':
            case 'long':
            case 'date':
                facetObject[facets[f].id] = JSON.parse('{' +
                    '\"stats\": { ' +
                        '\"field\":\"' + facets[f].id + '\"' +
                        '}' +
                    '}');
                break;
        }
    }

    // create the sort object
    if (params[5] && params[5].hasOwnProperty('field')) {
        var sort = [];
        var sortObject = {};
        sortObject[params[5].field] = {order: params[5].asc };
        sort.push(sortObject);
        q.sort = sort;
    }

    // assign the object to aggs
    if (applyFilter) {
        q.aggs = facetObject;

        // generate the filter format
        var filterObj = {
            "bool": {
                "must": []
            }
        };
        for (var fl=0; fl < filtered.fields.length; fl++) {
            var field = filtered.fields[fl];
            switch (field.type) {
                case 'text':
                    if (field.values.length === 1) {
                        filterObj.bool.must.push(
                            JSON.parse('{"term":{"' + field.field + '.raw":"' + field.values[0] + '"}}')
                        );
                    } else {
                        var valueList = '';
                        for (var v = 0; v < field.values.length; v++) {
                            valueList += '\"' + field.values[v] + '\"';
                            if (v !== field.values.length - 1) {
                                valueList += ',';
                            }
                        }
                        filterObj.bool.must.push(
                            JSON.parse('{"terms":{"' + field.field + '.raw":[' + valueList + ']}}')
                        );
                    }
                    break;
                case 'number':
                case 'date':
                    filterObj.bool.must.push(
                        JSON.parse('{"range":{"' + field.field + '": { "gte":' + field.values[0] + ', "lte":' + field.values[1] + '}}}')
                    );
                    break;
            }
        }
        q.query.filtered.filter = filterObj;

    } else {
        q.aggs = facetObject;
    }

    logger.debug(q, 'doSearch query');

    request({
        method: 'POST',
        uri: path,
        gzip: true,
        json: true,
        body: q
        },
        function (err, res, body) {
            if (err) {
                logger.error(err, 'ERROR: doSearch');
                callback(err, {});
            } else {
                var searchResult = body;
                logger.info(searchResult, 'search results');
                getIndexMapping(params[0], params[1], function(err, result) {
                    if (!err) {
                        if (result.body.length > 2) {
                            searchResult._meta = JSON.parse(result.body)[params[0]].mappings[params[1]]._meta;
                            var results = formatSearchResultsForTable(searchResult, facets, params);
                            callback(null, results);
                        }
                    }
                });

            }
        });
    }

/**
 * Process the data into html
 */
function formatSearchResultsForTable(data, facets, params) {
    var results = {};
    var streamTable = '';
    var facetsData = data.aggregations;

    /**
     * Generate the table html
     */
    var noData = '\<tr\>\<td\>There are no results\<\/tr\>\<\/td\>';
    if (data.error === undefined && data.hits.hits.length > 0) {
        var columnHeaders = [];
        var rows = data.hits.hits;

        // create the html table
        streamTable += '\<table\>';

        // when there is data
        streamTable += '\<thead\>';
        streamTable += '\<tr\>';

        // generate the column headers (caching opportunity)
        var dataRow = rows[0];
        _.each(dataRow._source, function (o, row) {
            columnHeaders.push({
                id: row,
                text: data._meta[row].text,
                type: data._meta[row].type
            });
        });

        // add each column
        _.each(columnHeaders, function (column) {
            var noSortClass = '';
            if (column.type === 'nested') {
                noSortClass = 'class=\"nosort\"';
            }
            streamTable += '\<th id="' + column.id + '" ' + noSortClass + '\>';
            streamTable += column.text;
            streamTable += '\</th\>';
        });
        streamTable += '\</tr\>';
        streamTable += '\<\/thead\>';

        // add each row
        streamTable += '\<tbody\>';
        var rowIndex = 0;
        _.each(rows, function(row) {
            streamTable += '\<tr\>';
            _.forEach(row._source, function(f, field) {
                if (typeof f !== 'object') {
                    streamTable += '\<td\>' + f + '\<\/td\>';
                } else {
                    var number = '(' + f.length + ')';
                    var link = '\<button class="btnSubTable" name="' + field + '|' + rowIndex + '\"\>' + number + '\<\/button\>';
                    streamTable += '\<td\>' + link +  '\<\/td\>';

                }
            });
            streamTable += '\<\/tr\>';
            rowIndex ++;
        });
        streamTable += '\<\/tbody\>';
        streamTable += '\<\/table\>';

        results['raw'] = data;
    } else {
        if (data.error !== undefined) {
            logger.error(data.error, 'ERROR: formatSearchResultsForTable');
            streamTable += '\<tr\>\<td\>\"' + data.error + '\"\<\/tr\>\<\/td\>';
        } else {
            streamTable += noData;
            results['raw'] = [];
        }
    }

    results['table'] = streamTable;

    /**
     * Generate the facets html
     */
    results['facets'] = '<span></span>';
    if (data.error === undefined && data.hits.hits.length > 0) {
        // only generate the facets for display if no filters are defined
        var filtered = JSON.parse(params[4]);
        if (filtered.fields.length === 0) {
            var streamFacets = '';
            var eventHandlers = [];
            for (var f = 0; f < facets.length; f++) {
                if (typeof facetsData[facets[f].id] === 'object') {
                    if (facets[f].type === 'string') {
                        // create li with checkboxes
                        var id = '';
                        var buckets = facetsData[facets[f].id].buckets;
                        if (buckets.length > 0) {
                            var facetTitle = generateFacetText(facets[f], data);
                            var facetId = params[0] + '--' + params[1] + '--' + facets[f].id;
                            streamFacets += '<li class="h6" id="' + facetId + '">' + facetTitle;
                            for (var b = 0; b < buckets.length; b++) {
                                id = params[0] + '--' + params[1] + '--' + buckets[b].key.replace(/ /g,'@%');
                                eventHandlers.push(id);
                                streamFacets += (b <= 4) ? '<div class="checkbox">' : '<div class="checkbox collapsed">';
                                streamFacets += '<label><input type="checkbox" id="' + id + '"/>';
                                streamFacets += buckets[b].key + ' (' + buckets[b].doc_count + ')</label>';
                                streamFacets += '</div>';
                            }
                            if (b > 4) {
                                streamFacets += '<div class="checkbox">';
                                streamFacets += '<label class="moreOrLessLabel"><input type="checkbox" class="moreOrLessCheckbox" id="more--' + facetId + '"/>More</label>';
                                streamFacets += '</div>';
                                streamFacets += '<div class="checkbox collapsed">';
                                streamFacets += '<label class="moreOrLessLabel"><input type="checkbox" class="moreOrLessCheckbox" id="less--' + facetId + '"/>Less</label>';
                                streamFacets += '</div>';
                            }
                            streamFacets += '</li>';
                        }
                    } else {
                        // create a range slider
                        var slider = facetsData[facets[f].id];
                        id = params[0] + '--' + params[1] + '--' + facets[f].id;
                        var type = (data._meta[facets[f].id].type === 'date') ? 'date' : 'text';
                        streamFacets += '<li class="h6" id="' + id + '">' + data._meta[facets[f].id].text;
                        streamFacets += '<div class="range" id="' + id + '_slider" name="' + slider.min + '|' + slider.max + '"></div>';
                        if (type !== 'date') {
                            streamFacets += '<div class="rangeFromTo"><label class="facetlabel">From:</label><input class="facetinput" id="' + id + '_slider_from" type="' + type + '"><label class="facetlabel"> To:</label><input class="facetinput" id="' + id + '_slider_to" type="' + type + '"></div>';
                        } else {
                            streamFacets += '<div class="rangeFromTo"><label class="facetlabel">From:</label><input class="facetdateinput" id="' + id + '_slider_from" type="' + type + '"><label class="facetlabel"> To:</label><input class="facetdateinput" id="' + id + '_slider_to" type="' + type + '"></div>';
                        }
                        streamFacets += '</li>';
                    }
                }
            }

            results['facets'] = streamFacets;
        }
    }

    return results;
}

function generateFacetText(facet, data) {
    var facetText = '';
    if (facet['id'].indexOf('.') > 0) {
        var prefix = '';
        var pget = '';
        var count = 0;
        var p = 0, l = 0;
        while (facet['id'].indexOf('.', l) > 0) {
            p = facet['id'].indexOf('.', l);
            if (count === 0) {
                pget = facet.id.substring(0, p);
            } else {
                // we're diving into nested object of nested objects
                // this logic is untested
                pget = prefix + '.fields.' + facet.id.substring(l, p);
            }
            prefix += data._meta[pget].text + ': ';
            l = p + 1;
        }
        var path = facet['id'].replace('.','.fields.') + '.text';
        facetText = prefix + _.get(data._meta, path);
    } else {
        facetText = data._meta[facet.id].text;
    }

    return facetText;

}

function getIndexMapping(index, type, callback) {
    request({
            method: 'GET',
            uri: config.es.server + '/' + index + '/_mapping/' + type
        },
        function (err, res) {
            if (err) {
                logger.error(err, 'ERROR: getIndexMapping');
                callback(err, {});
            } else {
                callback(null, res);
            }
        }
    )
}

exports.index = index;
exports.shop = shop;