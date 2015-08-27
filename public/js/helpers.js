/**
 * Created by sqwrl on 8/7/15.
 */

/**
 * Login functions
 */

var timer;
var jsonInput = {};
var notificationClassName = {
    'error' : 'alert alert-danger',
    'info' : 'alert alert-info',
    'warning' : 'alert alert-warning',
    'success' : 'alert alert-success'
};

function login() {
    if (validateLogin()) {
        $.ajax({
            url: '/signin/login',
            type: 'POST',
            data: jsonInput
        }).done(function(data) {
            if (data && data.length > 0) {
                showNotification({
                    'status' : 'info',
                    'message' : data
                });
            } else {
                $(location).attr('href', '/main');
            }
        }).fail(function(jqXHR, textStatus) {
            showNotification({
                'status' : 'error',
                'message' : textStatus
            });
        });
        clearJSON();
    }
}

function validateLogin() {
    var flag = true;
    if (typeof jsonInput['emailId'] == 'undefined'
        || typeof jsonInput['password'] == 'undefined'
        || jsonInput['emailId'] == '' || jsonInput['password'] == '') {
        flag = false;
        showNotification({
            'status' : 'info',
            'message' : 'Please enter credential!!'
        });
    }
    return flag;
}


// this will add the key and values to the JSON
// entered by the user
function addToJSON(obj) {
    jsonInput[obj.id] = obj.value;
}

function clearJSON() {
    jsonInput = {};
}

function showNotification(content) {
    var notification = $('#notification');
    notification.attr('class', notificationClassName[content.status]);
    notification.html(content.message);
}


/**
 * Index dropdown functions
 */

function populateIndex() {
    var indexNames = getIndices();
    var text = '';
    var menu = $('#indexNameMenu');

    $('#strSearch').prop( "disabled", true );
    $.each(indexNames, function(i, item) {
        if (i === 0) text = item.text;
        menu.append('<li><a name="' + item.name + '">' + item.text + '</a></li>' );
    });

    // add click event handler
    menu.find("a").click( function(e) {
        var index = e.currentTarget.name;
        setDropDownText('indexName', e.currentTarget.text, e.currentTarget.name);
        populateIndexType(index);
    });
}

function populateIndexType(index) {
    var indexTypes = getIndexTypes(index);
    var type = '';
    var text = '';
    var menu = $('#indexTypeMenu');
    menu.empty();
    $.each(indexTypes, function(i, item) {
        if (i === 0) {
            type = item.name;
            text = item.text;
        }
        menu.append('<li><a name="' + item.name + '">' + item.text + '</a></li>' );
    });

    setDropDownText('indexType', text, type);
    populateIndexTypeField(index, type);

    // add click event handler
    menu.find('a').click( function(e) {
        setDropDownText('indexType', e.currentTarget.text, e.currentTarget.name);
        populateIndexTypeField(index, e.currentTarget.name);
    });

}

function populateIndexTypeField(index, type) {
    var field = '';
    var text = '';
    var indexFields = getFieldTypes(index, type);
    var menu = $('#indexFieldMenu');
    menu.empty();
    $.each(indexFields, function(i, item) {
        if (i === 0) {
            field = item.name;
            text = item.text;
        }
        $('#indexFieldMenu').append('<li><a name="' + item.name + '">' + item.text + '</a></li>' );
    });
    setDropDownText('indexField', text, field);
    enableSearchInput();

    // add click event handler
    menu.find('a').click( function(e) {
        setDropDownText('indexField', e.currentTarget.text, e.currentTarget.name);
    });
}

function enableSearchInput() {
    var search = $('#strSearch');
    if ($('#indexFieldBtnText').text() !== 'Field') {
        search.prop( 'disabled', false );
        manageShopButton(true);
    } else {
        search.prop( 'disabled', true );
        manageShopButton(false);
    }
}

function setDropDownText(buttonId, text, name) {
    var button = $('#' + buttonId + 'BtnText');
    button.text(text);
    $('#' + buttonId).prop('name', name);
}

function manageIndexDropDowns() {
    populateIndex();
}

function manageExportToExcelButton(data) {
    if (data.indexOf('There are no results') > 0) {
        $('#btnExport').prop('disabled', true);
    } else {
        $('#btnExport').prop('disabled', false);
    }
}

function manageShopButton(enable) {
    if (enable) {
        $('#btnShop').prop('disabled', false);
    } else {
        $('#btnShop').prop('disabled', true);
    }
}

function getIndices () {
    //return config.indexName;
    var indices = [];
    $.each(ds, function(i, item) {
        if (item.types.length > 0 && item.types[0].fields.length > 0) {
            indices.push({
                name: item.name,
                text: item.types[0].fields[0].text
            });
        }
    });

    return indices
}

function getIndexTypes (index) {

    var indexInfo = findObject(ds, 'name', index);
    var types = [];

    for (var t=0; t < indexInfo.types.length; t++) {
        types.push({
            name: indexInfo.types[t].type,
            text: indexInfo.types[t].fields[1].text
        });
    }

    return types;
}

function getFieldTypes(index, type) {
    var indexInfo = findObject(ds, 'name', index);
    var typeInfo = findObject(indexInfo.types, 'type', type);
    var fields = [];

    if (typeInfo.fields.length > 2) {
        for (var f=2; f < typeInfo.fields.length; f++) {
            fields.push({
                name: typeInfo.fields[f].id,
                text: typeInfo.fields[f].text
            });
        }
    }

    return fields;
}

/**
 * Get search results functions
 */

function updateResults(index) {
    if (index.indexName !== 'index') {
        $.ajax({
            method: 'GET',
            url: '/main/shop',
            data: index
        }).done(function (data) {
            redrawResultsTable(data);
            if (index.first) redrawFacets(data);
            manageExportToExcelButton(data.table);
        }).fail(function (jqXHR, textStatus) {
            $('#results').html(textStatus);
        });
    }
}

function redrawResultsTable(data) {
    // clean out any existing table info
    $('#resultsTable').html('<table id="results" class="table"></table>');
    // fill with new table data
    $('#results').html(data.table);
    // apply the header/column freezes
    if (data.table.indexOf('There are no results') === -1) {
        makeTable();
    }
}

function redrawFacets(data) {
    $('#facets').html(data.facets);
}

function redrawTableOnResize() {
    // get existing table html
    var tableHtml = $('#results').html();
    // redraw
    $('#resultsTable').empty();
    $('#resultsTable').html('<table id="results" class="table"></table>');
    $('#results').html(tableHtml);
    makeTable();
}

function updateResultsWithFilter(delay) {

    var doUpdate = function() {
        // loop through the facets and capture the state
        var index = '';
        var type = '';
        var state = [];
        var addedFieldValue = false;
        var fieldObject = {};
        // get all the UI facets
        var facets = $('#facets').find('li');
        for (var f = 0; f < facets.length; f++) {
            var facet = facets[f];
            // only 1x capture the index and type so that we know how to resubmit the search
            if (f === 0) {
                var id = $(facet).prop('id');
                var firstIdx = id.indexOf('-');
                index = id.substring(0, firstIdx);
                var secondIdx = id.indexOf('-', firstIdx + 1);
                type = id.substring(firstIdx + 1, secondIdx);
                state = {
                    index: index,
                    type: type,
                    fields: []
                };
            }
            // loop through the facets
            for (var n = 0; n < facet.childNodes.length; n++) {
                var node = facet.childNodes[n];
                // the first node is the title of the checkbox list: create the field in the state object
                if (n === 0) {
                    var parentId = node.parentElement.id;
                    fieldObject = {
                        field: parentId.substring(parentId.lastIndexOf('-') + 1, parentId.length),
                        type: 'text',
                        values: []
                    };
                    state.fields.push(fieldObject);
                    addedFieldValue = false;
                } else {
                    // capture only those values that need to be used for the filter query
                    var input = $(node).find('input');
                    if (input.length > 0) {
                        var idCb = $(input).prop('id');
                        var from = $('#' + idCb).val();
                        var to = $('#' + idCb.replace('_from','_to')).val();
                        switch ($(input).prop('type')) {
                            case 'checkbox':
                                if ($(input).prop('checked')) {
                                    state.fields[state.fields.length - 1].values.push(idCb.substr(idCb.lastIndexOf('-') + 1));
                                    addedFieldValue = true;
                                }
                                break;
                            case 'text':
                                state.fields[state.fields.length - 1].type = 'number';
                                state.fields[state.fields.length - 1].values.push(Number(from));
                                state.fields[state.fields.length - 1].values.push(Number(to));
                                addedFieldValue = true;
                                break;
                            case 'date':
                                state.fields[state.fields.length - 1].type = 'date';
                                state.fields[state.fields.length - 1].values.push(new Date(from).getTime());
                                state.fields[state.fields.length - 1].values.push(new Date(to).getTime());
                                addedFieldValue = true;
                                break;
                        }
                    }
                }
            }
            if (!addedFieldValue) {
                // remove the field node as we don't need to filter on it since no values are selected
                state.fields.pop();
            }
        }

        // submit another search with the selected filters
        updateResults({
            indexName: state.index,
            indexType: state.type,
            indexField: $('#indexField').prop('name'),
            strSearch: $('#strSearch').val(),
            filters: JSON.stringify(state),
            first: false
        });
    };

    function manageSliderUpdate() {
        // since the events are set to change, it's not capturing a lot of intermediate steps
        // so this timeout is not super necessary and timeout is reducd to 50 miliseconds
        window.clearTimeout(timer);
        timer = window.setTimeout(doUpdate, 50);
    }

    // if this update is from a slider, delay the update as subsequent updates might come in
    if (delay) {
        manageSliderUpdate();
    } else if (!delay && delay !== undefined) {
        doUpdate();
    }
}

function makeTable () {
    var $table = $('#results');

    if ($table.hasClass('disabled')) return;

    var windowTop = $(window).scrollTop();
    var footerTop = $('.navbar-fixed-bottom').offset().top;
    var top = footerTop - windowTop - 110;

    // get the headers
    var th = $table.find('th');
    var colModal = [];
    for (var t = 0; t < th.length; t++) {
        colModal.push({
            width: th[t].clientWidth,
            align: th[t].align
        });
    }

    // get the # of fixed columns
    var i = findObject(ds, 'name', $('#indexName').prop('name'));
    var tp = findObject(i.types, 'type', $('#indexType').prop('name'));
    var fc = tp.fixedColumns;

    // create the table
    $table.fxdHdrCol({
        fixedCols:fc,
        width: '100%',
        height: top,
        colModal: colModal,
        sort: true
    });

    $table.addClass('disabled');
}

/**
 * Generic functions
 */

function findObject(object, prop, propValue) {
    for (var i=0; i < object.length; i++) {
        if (object[i][prop] !== undefined) {
            // valid object
            if (object[i][prop] === propValue) {
                return object[i];
            }
        } else {
            // not a valid object
            findObject(object[i][prop], prop, propValue);
        }
    }
}

function createSlider(slider, min, max) {
    var sliderFrom = $("#" + slider.id + "_from");
    var sliderTo = $("#" + slider.id + "_to");
    var type = $(sliderFrom).attr("type");

    if (type !== "date") {
        sliderFrom.val(min);
        sliderTo.val(max);
    } else {
        sliderFrom.val(new Date(min).toISOString().split("T")[0]);
        sliderTo.val(new Date(max).toISOString().split("T")[0]);
    }

    var sl = {
        start: [min, max],
        range: {"min": [Math.floor(min)], "max": [Math.floor(max) + 1] },
        connect: true,
        pips: {mode: "positions", values: [0, 33, 67, 100], density: 4}
    };

    if (type === "date") {
        sl.pips.format = {
            to: function (value) {
                var dt = new Date(value);
                return dt.getMonth()+1 +'/'+dt.getDate()+'/'+dt.getFullYear().toString().substr(2);
            }
        };
    }

    noUiSlider.create(slider, sl);

    slider.noUiSlider.on("change", function (values, handle) {
        if (handle === 0) {
            if (type !== "date") {
                sliderFrom.val(values[0]);
            } else {
                sliderFrom.val(new Date(Math.floor(values[0])).toISOString().split("T")[0]);
            }
        } else {
            if (type !== "date") {
                sliderTo.val(values[1]);
            } else {
                sliderTo.val(new Date(Math.floor(values[1])).toISOString().split("T")[0]);
            }
        }
        updateResultsWithFilter(true);
    });

    $("#" + slider.id + "_from").on("change", function () {
        if (type !== "date") {
            slider.noUiSlider.set([this.value, null]);
        } else {
            slider.noUiSlider.set([new Date(this.value).getTime(), null]);
        }
        updateResultsWithFilter(true);
    });
    $("#" + slider.id + "_to").on("change", function () {
        if ($(sliderTo).attr("type") !== "date") {
            slider.noUiSlider.set([null, this.value]);
        } else {
            slider.noUiSlider.set([null, new Date(this.value).getTime()]);
        }
        updateResultsWithFilter(true);
    });
}
