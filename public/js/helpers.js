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
var tableResults = '<thead>';
var tableSettings = {
    sortColumnId: '',
    sortColumnDirection: 'asc',
    numberOfFixedColumns: 0,
    data: []
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
        search.prop('disabled', true );
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
    var optionExport = $('#optionExport');
    var optionFixedCoumns = $('#optionFixedColumns');
    var inputNumberOfCoumns = $('#numberOfColumns');
    if (data.indexOf(tableResults) === -1) {
        if (!optionExport.hasClass('disabled')) {
            optionExport.addClass('disabled');
        }
        if (!optionFixedCoumns.hasClass('disabled')) {
            optionFixedCoumns.addClass('disabled');
        }
        if (!inputNumberOfCoumns.hasClass('disabled')) {
            inputNumberOfCoumns.addClass('disabled');
        }
    } else {
        if (optionExport.hasClass('disabled')) {
            optionExport.removeClass('disabled');
        }
        if (optionFixedCoumns.hasClass('disabled')) {
            optionFixedCoumns.removeClass('disabled');
        }
        if (inputNumberOfCoumns.hasClass('disabled')) {
            inputNumberOfCoumns.removeClass('disabled');
        }
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
            if (index.first) {
                drawFacets(data)
            } else {
                updateFacetCounts(data);
            };
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
    if (data.table.indexOf(tableResults) > -1) {
        tableSettings.data = data.raw;
        makeTable();
    }
}

function updateFacetCounts(data) {
    var mainFacets = $('#facets').find('li.h6');
    for (var f=0; f < mainFacets.length; f++) {
        var facetId = $(mainFacets[f]).attr('id');
        var strBucket = facetId.substring(facetId.lastIndexOf('-')+1, facetId.length);

        //get the aggregation data
        var aggData = data.raw.aggregations[strBucket].buckets || [];

        //loop through each of the facets
        var subFacets = $('#' + facetId).find('label');
        for (var s=0; s < subFacets.length; s++) {
            var sf = $(subFacets[s]);
            if (!sf.hasClass('moreOrLessLabel')) {
                var label = sf.text();
                var lioOpen = label.lastIndexOf('(');
                var lioClose = label.lastIndexOf(')');
                var ioSledge = label.lastIndexOf('/');
                var mainCount = 0, newCount = 0;

                //loop through the buckets to find the new count
                for (var b = 0; b < aggData.length; b++) {
                    if (aggData[b].key === label.substring(0, lioOpen - 1)) {
                        newCount = aggData[b].doc_count;
                        break;
                    }
                }

                //create the new count string
                var strCount = '';
                if (ioSledge == -1) {
                    //there's no x/y and we need to insert/format
                    mainCount = Number(label.substring(lioOpen + 1, lioClose));
                } else {
                    //there's already a x/y count: replace
                    mainCount = Number(label.substring(ioSledge + 1, lioClose));
                }
                strCount = newCount + '/' + mainCount;

                //update the facet
                // - capture the before state and remove the listener
                var sfcb1 = sf.find('input:checkbox')[0];
                var checked = $(sfcb1).prop('checked');
                $(sfcb1).off('click');

                // - update the label
                var newLabel = label.substring(0, lioOpen - 1) + ' (' + strCount + ')';
                var html = sf.html();
                var newHtml = html.replace(label, newLabel);
                sf.html(newHtml);

                // - reset the state and add back the event listener
                var sfcb2 = sf.find('input:checkbox')[0];
                $(sfcb2).click( function() {
                    updateResultsWithFilter(false, null, this);
                });
                $(sfcb2).prop('checked', checked);
            }
        }
    }
}

function drawFacets(data) {
    var facets = $('#facets');
    facets.html(data.facets);
    facets.find('input:checkbox').off('click');
    facets.find('input:checkbox').click( function() {
        updateResultsWithFilter(false, null, this);
    });

    var sliders = $('#facets').find('div.range');
    for (var s=0; s < sliders.length; s++) {
        var id = $(sliders[s]).prop('id');
        var name = $('#' + id).attr('name');
        var min = Number(name.substring(0, name.indexOf('|')));
        var max = Number(name.substring(name.indexOf('|') + 1, name.length));
        var slider = document.getElementById(id);
        createSlider(slider, min, max);
    }
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

function updateResultsWithFilter(delay, sort, source) {

    // if this is a More/Less checkbox then manage facet list and return without submitting a query
    if (source && source !== undefined && (source.id.substring(0,4) === 'more' || source.id.substring(0,4) === 'less')) {
        $(source).prop('checked', false);
        var expand = (source.id.substring(0,4) === 'more');
        var parent = $(source).parent().parent().parent();
        var li = $(parent).find('div.checkbox');
        for (var c=0; c < li.length; c++) {
            var chkb = $(li[c]);
            switch(expand) {
                case true:
                    if (chkb.hasClass('collapsed')) {
                        chkb.removeClass('collapsed');
                    }
                    if (c === li.length - 2) {
                        // set More to hidden
                        chkb.addClass('collapsed');
                    }
                    break;
                case false:
                    if (!chkb.hasClass('collapsed') && c > 4) {
                        chkb.addClass('collapsed');
                    }
                    if (c === li.length - 2) {
                        chkb.removeClass('collapsed');
                    }
                    break;
            }
        }

        return;
    }

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
                var firstIdx = id.indexOf('--');
                index = id.substring(0, firstIdx);
                var secondIdx = id.indexOf('--', firstIdx + 1);
                type = id.substring(firstIdx + 2, secondIdx);
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
                        field: parentId.substring(parentId.lastIndexOf('--') + 2, parentId.length),
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
                        var from = $(document.getElementById(idCb)).val();
                        var idTo = idCb.replace('_from','_to');
                        var to = $(document.getElementById(idTo)).val();
                        switch ($(input).prop('type')) {
                            case 'checkbox':
                                if ($(input).prop('checked')) {
                                    state.fields[state.fields.length - 1].values.push(idCb.substr(idCb.lastIndexOf('--') + 2).replace(/@%/g,' '));
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
        setPopupSubTableHidden();
        updateResults({
            indexName: state.index,
            indexType: state.type,
            indexField: $('#indexField').prop('name'),
            strSearch: $('#strSearch').val(),
            filters: JSON.stringify(state),
            sort: sort,
            first: false
        });
    };

    function manageSliderUpdate() {
        // since the events are set to the change event, it's not capturing a lot of intermediate steps
        // so this timeout is not super necessary and timeout is reduced to 50 miliseconds
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

function makeTable() {
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

    // create the table
    $table.fxdHdrCol({
        fixedCols: tableSettings.numberOfFixedColumns,
        width: '100%',
        height: top,
        colModal: colModal,
        sort: true
    });

    // recreating the table removes the existing sorting indicators.
    // reapply if applicable
    if (tableSettings.sortColumnId !== '') {
        var column1 = $('#results').find('[id="' + tableSettings.sortColumnId + '"]');
        var column2 = $('table.ft_r [id="' + tableSettings.sortColumnId + '"]');
        if (tableSettings.sortColumnDirection === 'desc') {
            $(column2).addClass('fx_sort_desc');
            $(column1).addClass('sorttable_sorted_reverse');
            var sortrevind = document.createElement('span');
            sortrevind.id = "sorttable_sortrevind";
            sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : '&nbsp;&#x25B4;';
            $(column1).append(sortrevind);
        }
        if (tableSettings.sortColumnDirection === 'asc') {
            $(column2).addClass('fx_sort_asc');
            $(column1).addClass('sorttable_sorted');
            var sortfwdind = document.createElement('span');
            sortfwdind.id = "sorttable_sortfwdind";
            sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
            $(column1).append(sortfwdind);
        }
    }

    $table.addClass('disabled');
    $('#numberOfColumns').val(tableSettings.numberOfFixedColumns);
    addSubTableClickHandlers();

    // check for nested document columns and remove sorting ability
    $('table').find('.nosort').removeClass('fx_sort_bg');

}

function doSort(column) {
    var name = $(column).attr('id');
    var css = $('#results').find('[id="' + name + '"]').attr('class');
    var idxr = css.indexOf('sorttable_sorted_reverse');
    var idx = css.indexOf('sorttable_sorted');
    var direction = 'asc';
    if (idxr > -1) direction = 'asc';
    if (idxr === -1 && idx > -1) direction = 'desc';
    var sort = {
        field: name,
        asc: direction
    };
    tableSettings.sortColumnId = name;
    tableSettings.sortColumnDirection = direction;
    updateResultsWithFilter(false, sort);
}

/**
 * Showing/hiding facets
 */
function moreOrLess() {
    console.log(this);
    console.log(e);
}

/**
 * Showing/hiding subtables
 */
function addSubTableClickHandlers() {
    var btnSubTables = $('button.btnSubTable');
    btnSubTables.off('click');
    btnSubTables.click(function () {
        addSubTableToPopup(this);
        var parent = this.parentElement;
        var st = $('#popSubTable');
        var bodyRect = document.body.getBoundingClientRect();
        var tdRect = parent.getBoundingClientRect();
        var t = tdRect.top - bodyRect.top + parent.offsetHeight;
        st.removeClass('hidden');
        var l = tdRect.left + tdRect.width - document.getElementById('popSubTable').getBoundingClientRect().width;

        st.css('top', t);
        st.css('left', l);
        // add close click handler
        $('.closemsg').on('click', function() {
            $('.closemsg').off('click');
            st.css('top', -2000);
            setPopupSubTableHidden();
        });

    });
}

function addSubTableToPopup(btn) {
    var popup = $('#popSubTable');
    var target = $(btn).prop('name').split('|');
    var field = target[0];
    var rowIndex = Number(target[1]);
    var tblData = tableSettings.data.hits.hits[rowIndex];

    // create the subtable
    var t = '<table class="table-responsive"><thead>';
    var firstRow = tblData._source[field][0];
    var columnHeaders = [];

    // generate the column headers
    forEach(firstRow, function (o, row) {
        columnHeaders.push({
            id: row,
            text: tableSettings.data._meta[field].fields[row].text
        });
    });

    // add each column
    forEach(columnHeaders, function (column) {
        t += '\<th id="' + column.id + '"\>';
        t += column.text;
        t += '\</th\>';
    });
    t += '\</tr\>';
    t += '\<\/thead\>';

    // add the rows
    t += '\<tbody\>';
    var rowCount = 0;
    forEach(tblData._source[field], function(row) {
        t += '\<tr\>';
        forEach(row, function(f, field) {
            if (typeof f !== 'object') {
                t += '\<td id="' + f + '"\>' + f + '\<\/td\>';
            } else {
                var number = '(' + f.length + ')';
                var link = '\<button class="btnSubTable" name="' + field + '|' + rowCount + '\"\>' + number + '\<\/button\>';
                t += '\<td\>' + link +  '\<\/td\>';

            }
        });
        t += '\<\/tr\>';
        rowCount ++;
    });

    t += '\<\/tbody\>';
    t += '\<\/table\>';

    popup.html(t);
}

function setPopupSubTableHidden() {
    var popup = $('#popSubTable');
    if (!popup.hasClass('hidden')) {
        popup.addClass('hidden');
    }
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
    var sliderFrom = $('#' + slider.id + '_from');
    var sliderTo = $('#' + slider.id + '_to');
    var type = $(sliderFrom).attr('type');

    if (type !== 'date') {
        sliderFrom.val(min);
        sliderTo.val(max);
    } else {
        sliderFrom.val(new Date(min).toISOString().split('T')[0]);
        sliderTo.val(new Date(max).toISOString().split('T')[0]);
    }

    var sl = {
        start: [min, max],
        range: {'min': [Math.floor(min)], 'max': [Math.floor(max) + 1] },
        connect: true,
        pips: {mode: 'positions', values: [0, 33, 67, 100], density: 4}
    };

    if (type === 'date') {
        sl.pips.format = {
            to: function (value) {
                var dt = new Date(value);
                return dt.getMonth()+1 +'/'+dt.getDate()+'/'+dt.getFullYear().toString().substr(2);
            }
        };
    }

    noUiSlider.create(slider, sl);

    slider.noUiSlider.on('change', function (values, handle) {
        if (handle === 0) {
            if (type !== 'date') {
                sliderFrom.val(values[0]);
            } else {
                sliderFrom.val(new Date(Math.floor(values[0])).toISOString().split('T')[0]);
            }
        } else {
            if (type !== 'date') {
                sliderTo.val(values[1]);
            } else {
                sliderTo.val(new Date(Math.floor(values[1])).toISOString().split('T')[0]);
            }
        }
        updateResultsWithFilter(true);
    });

    $(sliderFrom).on('change', function () {
        if (type !== 'date') {
            slider.noUiSlider.set([this.value, null]);
        } else {
            slider.noUiSlider.set([new Date(this.value).getTime(), null]);
        }
        updateResultsWithFilter(true);
    });
    $(sliderTo).on('change', function () {
        if ($(sliderTo).attr('type') !== 'date') {
            slider.noUiSlider.set([null, this.value]);
        } else {
            slider.noUiSlider.set([null, new Date(this.value).getTime()]);
        }
        updateResultsWithFilter(true);
    });
}

function setFixedColumns() {
    if (!$('#optionFixedColumns').hasClass('disabled')) {
        tableSettings.numberOfFixedColumns = Number($('#numberOfColumns').val());
        var $table = $('#results');
        var html = $table.html();
        if (html.indexOf(tableResults) > -1) {
            if (tableSettings.numberOfFixedColumns >= 0) {
                // remove first any sorting attributes if applicable
                html = html.replace(/ class="fx_sort_bg sorttable_sorted_reverse"/g, '');
                html = html.replace(/ class="fx_sort_bg sorttable_sorted"/g, '');
                html = html.replace(/ class="fx_sort_bg"/g, '');
                html = html.replace(/<span id="sorttable_sortfwdind">&nbsp;▾<\/span>/g, '');
                html = html.replace(/<span id="sorttable_sortrevind">&nbsp;▴<\/span>/g, '');
                $table.html(html);
                redrawTableOnResize();
            }
        }
    }
}
