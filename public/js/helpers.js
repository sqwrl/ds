/**
 * Created by sqwrl on 8/7/15.
 */

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

function populateIndex() {
    var indexNames = getIndices();
    var text = '';
    var menu = $('#indexNameMenu');

    $('#strSearch').prop( "disabled", true );
    $.each(indexNames, function(i, item) {
        if (i === 0) text = item.text;
        menu.append('<li><a name="' + item.name + '">' + item.text + '</a></li>' );
    });
    setDropDownText('indexName', text);

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
    var menu = $("#indexTypeMenu");
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
    var text = '';
    var indexFields = getFieldTypes(index, type);
    var menu = $('#indexFieldMenu');
    menu.empty();
    $.each(indexFields, function(i, item) {
        if (i === 0) text = item;
        $("#indexFieldMenu").append('<li><a name="' + item + '">' + item + '</a></li>' );
    });
    setDropDownText('indexField', text, text);
    enableSearchInput();

    // add click event handler
    menu.find("a").click( function(e) {
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
    $( document ).ready(function() {
        // load the indices
        populateIndex();
    });
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

function updateResults(index) {
    if (index.indexName !== 'index') {
        $.ajax({
            method: 'GET',
            url: '/main/shop',
            data: index
        }).done(function (data) {
            $('#results').html(data.table);
            $('#facets').html(data.facets);
            manageExportToExcelButton(data.table);
        }).fail(function (jqXHR, textStatus) {
            $('#results').html(textStatus);
        });
    }
}

function updateResultsWithFilter() {

    // loop through the facets and capture the state
    var index = '';
    var type = '';
    var state = [];
    var addedFieldValue = false;
    var fieldObject = {};
    // get all the UI facets
    var facets = $("#facets").find("li");
    for (var f=0; f < facets.length; f++) {
        var facet = facets[f];
        // only 1x capture the index and type so that we know how to resubmit the search
        if (f === 0) {
            var id = $(facet).prop('id');
            var firstIdx = id.indexOf('-');
            index = id.substring(0, firstIdx);
            type = id.substring(id.indexOf('-') + 1, id.length);
            state = {
                index: index,
                type: type,
                fields: []
            };
        }
        // loop through the checkboxes
        for (var n=0; n < facet.childNodes.length; n++) {
            var node = facet.childNodes[n];
            // the first node is the title of the checkbox list: create the field in the state object
            if (n === 0) {
                fieldObject = {
                    field: node.data,
                    values: []
                };
                state.fields.push(fieldObject);
                addedFieldValue = false;
            } else {
                // capture only those values that need to be used for the filter query
                var input = $(node).find('input');
                var idCb = $(input).prop('id');
                switch ($(input).prop('type')) {
                    case 'checkbox':
                        if ($(input).prop('checked')) {
                            state.fields[state.fields.length - 1].values.push(idCb.substr(idCb.lastIndexOf('-') + 1));
                            addedFieldValue = true;
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
        indexField: $('#indexFieldBtnText').text(),
        strSearch: $('#strSearch').val(),
        filters: JSON.stringify(state)
    });
}