/**
 * Created by sqwrl on 8/7/15.
 */

var config          = require('config'),
    request         = require('request'),
    _               = require('lodash'),
    clientConfig    = require('./../public/config/ds').config.index,
    logger          = global.logger;

/**
 * Main page rendering entry
 */
function index(req, res) {
    res.render('main', {title:'Shop!'});
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
        var params = [req.query.indexName, req.query.indexType, req.query.indexField, req.query.strSearch, req.query.filters];

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
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"filtered\":{\"query\":{\"match_all\":{}},\"filter\":{}}},\"aggs\":{}}');
            } else {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"match_all\":{}},\"aggs\":{}}');
            }
            break;
        default:
            if (applyFilter) {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"filtered\":{\"query\":{\"match\":{\"' + params[2] + '\":\"' + params[3] + '\"}},\"filter\":{}}},\"aggs\":{}}');
            } else {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"match\":{\"' + params[2] + '\":\"' + params[3] + '\"}},\"aggs\":{}}');
            }
    }

    // load the facets
    var facets = [];
    _.find(clientConfig, function (index) {
        if (index.name === params[0]) {
            for (var i=0; i < index.type.length; i++) {
                if (index.type[i].name === params[1]) {
                    facets = index.type[i].facets;
                }
            }
        }
    });

    // create the facet object
    var facetObject = {};
    for (var f=0; f<facets.length; f++) {
        facetObject[facets[f]] = JSON.parse('{\"terms\":{\"field\":\"' + facets[f] + '.raw\",\"order\":{\"_count\":\"desc\"}}}');
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
            if (field.values.length === 1) {
                filterObj.bool.must.push(
                    JSON.parse('{"term":{"' + field.field + '.raw":"' + field.values[0] + '"}}')
                );
            } else {
                var valueList = '';
                for (var v=0; v < field.values.length; v++) {
                    valueList += '\"' + field.values[v] + '\"';
                    if (v !== field.values.length - 1) {
                        valueList += ',';
                    }
                }
                filterObj.bool.must.push(
                    JSON.parse('{"terms":{"' + field.field + '.raw":[' + valueList + ']}}')
                );
            }
        }
        q.query.filtered.filter = filterObj;

    } else {
        q.aggs = facetObject;
    }

    logger.info(q, 'doSearch query');

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
                getIndexMapping(params[0], params[1], function(err, result) {
                    if (!err) {
                        searchResult._meta = JSON.parse(result.body)[params[0]].mappings[params[1]]._meta;
                        var results = formatSearchResultsForTable(searchResult, facets, params);
                        callback(null, results);
                    }
                });

            }
        });
    }

/**
 * Process the data into html
 */
function formatSearchResultsForTable(data, facets, params) {
    // TODO: order columns
    // TODO: add # of left columns to fix
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
            columnHeaders.push(data._meta[row].text);
        });

        // add each column
        _.each(columnHeaders, function (column) {
            streamTable += '\<th\>';
            streamTable += column;
            streamTable += '\</th\>';
        });
        streamTable += '\</tr\>';
        streamTable += '\<\/thead\>';

        // add each row
        streamTable += '\<tbody\>';
        _.each(rows, function(row) {
            streamTable += '\<tr\>';
            _.forEach(row._source, function(f, field) {
                if (typeof f !== 'object') {
                    streamTable += '\<td\>' + f + '\<\/td\>';
                } else {
                    // TODO: add class for sub-table icon functionality and add hidden row(s) with sub-table format
                    streamTable += '\<td\>' + field + '\<\/td\>';
                }
            });
            streamTable += '\<\/tr\>';
        });
        streamTable += '\<\/tbody\/\>';
    } else {
        if (data.error !== undefined) {
            logger.error(data.error, 'ERROR: formatSearchResultsForTable');
            streamTable += '\<tr\>\<td\>\"' + data.error + '\"\<\/tr\>\<\/td\>';
        } else {
            streamTable += noData;
        }
    }

    results['table'] = streamTable;

    /**
     * Generate the facets html
     */
    // only generate the facets for display if no filters are defined
    var filtered = JSON.parse(params[4]);
    if (filtered.fields.length === 0) {
        var streamFacets = '';
        var eventHandlers = [];
        for (var f = 0; f < facets.length; f++) {
            if (typeof facetsData[facets[f]] === 'object') {
                var buckets = facetsData[facets[f]].buckets;
                streamFacets += '<li class="h5" id="' + params[0] + '-' + params[1] + '">' + data._meta[facets[f]].text;
                for (var b = 0; b < buckets.length; b++) {
                    var id = params[0] + '-' + params[1] + '-' + buckets[b].key.replace(' ', '*');
                    eventHandlers.push(id);
                    streamFacets += '<div class="checkbox">';
                    streamFacets += '<label><input type="checkbox" id="' + id + '"/>';
                    streamFacets += buckets[b].key + ' (' + buckets[b].doc_count + ')</label>';
                    streamFacets += '</div>';
                }
                streamFacets += '</li><br>';
            }
        }

        // add click event handlers
        streamFacets += '<script>';
        streamFacets += '$("#facets").find("input").click( function(e) { updateResultsWithFilter(e) });';
        streamFacets += '</script>';
        results['facets'] = streamFacets;
    }

    return results;
}

function addClickEventHandler(selector) {
    return selector + '.click( function(e) { updateResultsWithFilter(e);});';
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