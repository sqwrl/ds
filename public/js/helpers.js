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
            url : '/signin/login',
            type : 'POST',
            data: jsonInput
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
    ($('#indexFieldBtnText').text() !== 'Field') ? search.prop( 'disabled', false ) : search.prop( 'disabled', true );
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

function updateResults(index) {

    $.ajax({
        method: 'GET',
        url: '/main/shop',
        data: index
    }).done(function(data) {
        $('#results').html(data.html);
    }).fail(function(jqXHR, textStatus) {
        $('#results').html(textStatus);
    });

}