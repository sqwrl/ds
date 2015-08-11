// TODO: have dsESIndices output the config, at startup load the file 1x, move ds functions to helpers.js

var config = {
    index: [
        {   name: 'index',
            text: 'Sub System',
            type: [
                {
                    name: 'type',
                    text: 'Information Type',
                    fields: [
                        'Field'
                    ],
                    facets: []
                }
            ]
        },
        {   name: 'hr',
            text: 'Human Resources',
            type: [
                {
                    name: 'employee',
                    text: 'Employee',
                    fields: [
                        'Emp ID',
                        'HR Status',
                        'PY Status',
                        'Full Name',
                        'First Name',
                        'Middle Name',
                        'Last Name',
                        'Type',
                        'Bargaining Unit',
                        'Division',
                        'Department',
                        'Birth Date',
                        'Hire Date'
                    ],
                    facets: [
                        'HR Status',
                        'PY Status',
                        'Type',
                        'Bargaining Unit',
                        'Division',
                        'Department'
                    ]
                }
            ]
        },
        {
            name: 'pe',
            text: 'Person Entity',
            type: [
                {
                    name: 'name',
                    text: 'Vendor',
                    fields: [
                        'PE ID',
                        'Status',
                        'Full Name',
                        'First Name',
                        'Middle Name',
                        'Last Name',
                        'url',
                        'Security Code',
                        'Select Code 1',
                        'Select Code 2',
                        'Affiliation Code',
                        'Email Type',
                        'Email Address Code',
                        'Email',
                        'Address Code',
                        'Street',
                        'City',
                        'State',
                        'Zip'
                    ],
                    facets: [
                        'Status',
                        'Security Code',
                        'Select Code 1',
                        'Select Code 2',
                        'Affiliation Code'
                    ]
                },
                {
                    name: 'product',
                    text: 'Products',
                    fields: [
                        'Product ID',
                        'PE ID',
                        'Product Status',
                        'Product Title',
                        'Product Description'
                    ],
                    facets: [
                        'Product Status',
                        'PE ID'
                    ]
                }
            ]
        }
    ]
};

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

function getIndices () {
    //return config.indexName;
    var indices = [];
    $.each(config.index, function(i, item) {
        indices.push( {
            name: item.name,
            text: item.text
        });
    });

    return indices
}

function getIndexTypes (index) {

    var indexInfo = findObject(config.index, 'name', index);
    var types = indexInfo.type;

    if (types.length > 0) {
        return types;
    } else {
        return [];
    }
}

function getFieldTypes(index, type) {
    var indexInfo = findObject(config.index, 'name', index);
    var typeInfo = findObject(indexInfo.type, 'name', type);
    var fields = typeInfo.fields;

    if (fields.length > 0) {
        return fields;
    } else {
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    exports.config = config;
}