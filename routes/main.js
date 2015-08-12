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
        var params = [req.query.indexName, req.query.indexType, req.query.indexField, req.query.strSearch];

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

    var path = config.es.server + '/';
    path += params[0];
    path += (params[1] !== '') ? '/' + params[1] : '';
    path += '/_search';
    logger.info(path, 'doSearch path');

    var q = {};
    switch (params[3]) {
        case '':
            q = JSON.parse('{\"query\":{\"match_all\":{}},\"aggs\":{}}');
            break;
        default:
            q = JSON.parse('{\"query\":{\"match\":{\"' + params[2] + '\":\"' + params[3] + '\"}},\"aggs\":{}}');
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
        facetObject[facets[f]] = JSON.parse('{\"terms\":{\"field\":\"' + facets[f] + '\",\"order\":{\"_count\":\"desc\"}}}');
    }

    // assign the object to aggs
    q.aggs = facetObject;

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
                var results = formatSearchResultsForTable(body, facets);
                callback(null, results);
            }
        });
    }

/**
 * Process the data into html
 */
function formatSearchResultsForTable(data, facets) {
    // TODO: order columns
    // TODO: add header fixation
    // TODO: add columns to fix
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
        // generate the column headers
        var column = rows[0];
        _.each(column._source, function (o, row) {
            columnHeaders.push(row);
        });

        // add each column
        _.each(columnHeaders, function (column) {
            streamTable += '\<th\>';
            streamTable += column;
            streamTable += '\</th\>';
        });
        streamTable += '\<tr\/\>';
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
            streamTable += '\<\/tbody\/\>';
        });
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
    var streamFacets = '';
    for (var f=0; f < facets.length; f++) {
        if (typeof facetsData[facets[f]] === 'object') {
            var buckets = facetsData[facets[f]].buckets;
            streamFacets += '<li class="h5">' + facets[f];
            for (var b=0; b < buckets.length; b++) {
                streamFacets += '<div class="checkbox">';
                streamFacets += '<label><input type="checkbox" value="' + buckets[b].key + '">' + buckets[b].key + ' (' + buckets[b].doc_count + ')</label>';
                streamFacets += '</div><li>';
            }
        }
        streamFacets += '<br>';
    }


    results['facets'] = streamFacets;

    return results;
}

exports.index = index;
exports.shop = shop;