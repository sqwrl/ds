/**
 * Created by sqwrl on 8/7/15.
 */

var config      = require('config'),
    request     = require('request'),
    _           = require('lodash'),
    logger      = global.logger,
    empty       = { data: [] };

function index(req, res) {
    res.render('main');
}

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
    var clientConfig = require('./../public/config/ds').config.index;
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
                var results = formatSearchResultsForTable(body);
                callback(null, results);
            }
        });
    }

// TODO: order columns
// TODO: add header fixation
// TODO: add columns to fix
function formatSearchResultsForTable(data) {
    var results = {};
    var stream = '';
    var facets = [];
    var noData = '\<tr\>\<td\>There are no results\<\/tr\>\<\/td\>';
    if (data.error === undefined && data.hits.hits.length > 0) {
        var columnHeaders = [];
        var rows = data.hits.hits;

        // create the html table
        stream += '\<table\>';

        // when there is data
        stream += '\<thead\>';
        stream += '\<tr\>';
        // generate the column headers
        var column = rows[0];
        _.each(column._source, function (o, row) {
            columnHeaders.push(row);
        });

        // add each column
        _.each(columnHeaders, function (column) {
            stream += '\<th\>';
            stream += column;
            stream += '\</th\>';
        });
        stream += '\<tr\/\>';
        stream += '\<\/thead\>';

        // add each row
        stream += '\<tbody\>';
        _.each(rows, function(row) {
            stream += '\<tr\>';
            _.forEach(row._source, function(f, field) {
                if (typeof f !== 'object') {
                    stream += '\<td\>' + f + '\<\/td\>';
                } else {
                    // TODO: add class for sub-table icon functionality and add hidden row(s) with sub-table format
                    stream += '\<td\>' + field + '\<\/td\>';
                }
            });
            stream += '\<\/tr\>';
            stream += '\<\/tbody\/\>';
        });

        // assign that facet information
        facets = data.aggregations;
    } else {
        if (data.error !== undefined) {
            logger.error(data.error, 'ERROR: formatSearchResultsForTable');
            stream += '\<tr\>\<td\>\"' + data.error + '\"\<\/tr\>\<\/td\>';
        } else {
            stream += noData;
        }
    }

    results['html'] = stream;
    results['facets'] = facets;

    return results;
}

exports.index = index;
exports.shop = shop;