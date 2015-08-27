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
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"filtered\":{\"query\":{\"wildcard\":{\"' + params[2] + '\":\"*' + params[3].toLowerCase() + '*\"}},\"filter\":{}}},\"aggs\":{}}');
            } else {
                q = JSON.parse('{\"from\":0,\"size\":1000,\"query\":{\"wildcard\":{\"' + params[2] + '\":\"*' + params[3].toLowerCase() + '*\"}},\"aggs\":{}}');
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
                        if (fields[f].facet) {
                            facets.push({
                                id: fields[f].id,
                                type: fields[f].type
                            });
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
                facetObject[facets[f].id] = JSON.parse('{\"terms\":{\"field\":\"' + facets[f].id + '.raw\",\"order\":{\"_count\":\"desc\"}}}');
                break;
            case 'float':
            case 'integer':
            case 'long':
            case 'date':
                facetObject[facets[f].id] = JSON.parse('{\"stats\": { \"field\":\"' + facets[f].id + '\"}}');
                break;
        }
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
            if (typeof facetsData[facets[f].id] === 'object') {
                if (facets[f].type === 'string') {
                    // create li with checkboxes
                    var id = '';
                    var buckets = facetsData[facets[f].id].buckets;
                    if (buckets.length > 0) {
                        streamFacets += '<li class="h5" id="' + params[0] + '-' + params[1] + '-' + facets[f].id + '">' + data._meta[facets[f].id].text;
                        for (var b = 0; b < buckets.length; b++) {
                            id = params[0] + '-' + params[1] + '-' + buckets[b].key.replace(' ', '*');
                            eventHandlers.push(id);
                            streamFacets += '<div class="checkbox">';
                            streamFacets += '<label><input type="checkbox" id="' + id + '"/>';
                            streamFacets += buckets[b].key + ' (' + buckets[b].doc_count + ')</label>';
                            streamFacets += '</div>';
                        }
                        streamFacets += '</li><br>';
                    }
                } else {
                    // create a range slider
                    var slider = facetsData[facets[f].id];
                    id = params[0] + '-' + params[1] + '-' + facets[f].id;
                    var type = (data._meta[facets[f].id].type === 'date') ? 'date' : 'text';
                    streamFacets += '<li class="h5" id="' + id + '">' + data._meta[facets[f].id].text;
                    streamFacets += '<div class="range" id="' + id + '_slider" name="' + slider.min + '|' + slider.max + '"></div>';
                    if (type !== 'date') {
                        streamFacets += '<div><label class="facetlabel">From:</label><input class="facetinput" id="' + id + '_slider_from" type="' + type + '"><label class="facetlabel"> To:</label><input class="facetinput" id="' + id + '_slider_to" type="' + type + '"></div>';
                    } else {
                        streamFacets += '<div><label class="facetlabel">From:</label><input class="facetdateinput" id="' + id + '_slider_from" type="' + type + '"><label class="facetlabel"> To:</label><input class="facetdateinput" id="' + id + '_slider_to" type="' + type + '"></div>';
                    }
                    streamFacets += '</li><br>';
                }
            }
        }

        // add click event handlers
        streamFacets += '<script>\n';
        streamFacets += 'var sliders = $("#facets").find("div.range");\n';
        streamFacets += 'function createSlider (slider, min, max) {\n';
        streamFacets += '   var sliderFrom = $("#" + slider.id + "_from");\n';
        streamFacets += '   var sliderTo = $("#" + slider.id + "_to");\n';
        streamFacets += '   if ($(sliderFrom).attr("type") !== "date") {\n';
        streamFacets += '      sliderFrom.val(min); sliderTo.val(max);\n';
        streamFacets += '   } else {\n';
        streamFacets += '      sliderFrom.val(new Date(min).toISOString().split("T")[0]); sliderTo.val(new Date(max).toISOString().split("T")[0]);\n';
        streamFacets += '   }\n';
        streamFacets += '   noUiSlider.create(slider, {\n';
        streamFacets += '      start: [ min, max],\n';
        streamFacets += '      range: { "min": [ min ], "max": [ max ]},\n';
        streamFacets += '      connect: true\n';
        streamFacets += '   });\n';
        streamFacets += '   slider.noUiSlider.on("change", function( values, handle ){\n';
        streamFacets += '      if (handle === 0) {\n';
        streamFacets += '         if ($(sliderFrom).attr("type") !== "date") {\n';
        streamFacets += '            sliderFrom.val(values[0]);\n';
        streamFacets += '         } else {\n';
        streamFacets += '            sliderFrom.val(new Date(Math.floor(values[0])).toISOString().split("T")[0]);\n';
        streamFacets += '         }\n';
        streamFacets += '      } else {\n';
        streamFacets += '         if ($(sliderTo).attr("type") !== "date") {\n';
        streamFacets += '            sliderTo.val(values[1]);\n';
        streamFacets += '         } else {\n';
        streamFacets += '            sliderTo.val(new Date(Math.floor(values[1])).toISOString().split("T")[0]);\n';
        streamFacets += '         }\n';
        streamFacets += '      }\n';
        streamFacets += '         updateResultsWithFilter(true);\n';
        streamFacets += '   });\n';
        streamFacets += '   $("#" + slider.id + "_from").on("change", function(){\n';
        streamFacets += '      if ($(sliderFrom).attr("type") !== "date") {\n';
        streamFacets += '         slider.noUiSlider.set([this.value, null]);\n';
        streamFacets += '      } else {\n';
        streamFacets += '         slider.noUiSlider.set([new Date(this.value).getTime(), null]);\n';
        streamFacets += '      }\n';
        streamFacets += '      updateResultsWithFilter(true);\n';
        streamFacets += '   });\n';
        streamFacets += '   $("#" + slider.id + "_to").on("change", function(){\n';
        streamFacets += '      if ($(sliderTo).attr("type") !== "date") {\n';
        streamFacets += '         slider.noUiSlider.set([null, this.value]);\n';
        streamFacets += '      } else {\n';
        streamFacets += '         slider.noUiSlider.set([null, new Date(this.value).getTime()]);\n';
        streamFacets += '      }\n';
        streamFacets += '      updateResultsWithFilter(true);\n';
        streamFacets += '   });\n';
        streamFacets += '};\n';
        streamFacets += 'for (var s=0; s < sliders.length; s++) {\n';
        streamFacets += '  var id = $(sliders[s]).prop("id");\n';
        streamFacets += '  var name = $("#" + id).attr("name");\n';
        streamFacets += '  var min = Number(name.substring(0, name.indexOf("|")));\n';
        streamFacets += '  var max = Number(name.substring(name.indexOf("|") + 1, name.length));\n';
        streamFacets += '  var slider = document.getElementById(id);\n';
        streamFacets += '  createSlider(slider, min, max);\n';
        streamFacets += '}\n';
        streamFacets += '$("#facets").find("input:checkbox").click( function(e) { updateResultsWithFilter(false) });\n';
        streamFacets += '</script>';
        results['facets'] = streamFacets;
    }

    return results;
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