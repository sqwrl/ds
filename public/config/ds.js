// TODO: have dsESIndices output the config, at startup load the file 1x, move ds functions to helpers.js
//var subSystems = [
//    'hr',
//    'pe',
//    'py'
//];
//
//var config = {
//    index: [
//        {   name: 'index',
//            text: 'Sub System',
//            type: [
//                {
//                    name: 'type',
//                    text: 'Information Type',
//                    fields: [
//                        'Field'
//                    ],
//                    facets: []
//                }
//            ]
//        },
//        {   name: 'hr',
//            text: 'Human Resources',
//            type: [
//                {
//                    name: 'employee',
//                    text: 'Employee',
//                    fields: [
//                        'EmpID',
//                        'HRStatus',
//                        'PYStatus',
//                        'FullName',
//                        'FirstName',
//                        'MiddleName',
//                        'LastName',
//                        'Type',
//                        'BargUnit',
//                        'Division',
//                        'Department',
//                        'BirthDt',
//                        'HireDt'
//                    ],
//                    facets: [
//                        'HRStatus',
//                        'PYStatus',
//                        'Type',
//                        'BargUnit',
//                        'Division',
//                        'Department'
//                    ]
//                }
//            ]
//        },
//        {
//            name: 'pe',
//            text: 'Person Entity',
//            type: [
//                {
//                    name: 'name',
//                    text: 'Vendor',
//                    fields: [
//                        'PeId',
//                        'Status',
//                        'FullName',
//                        'FirstName',
//                        'MiddleName',
//                        'LastName',
//                        'Url',
//                        'SecurityCode',
//                        'SelCode1',
//                        'SelCode2'
//                    ],
//                    facets: [
//                        'Status',
//                        'SecurityCode',
//                        'SelCode1',
//                        'SelCode2'
//                    ]
//                },
//                {
//                    name: 'product',
//                    text: 'Products',
//                    fields: [
//                        'ProductID',
//                        'PeId',
//                        'ProductStatus',
//                        'ProductTitle',
//                        'ProductDescription'
//                    ],
//                    facets: [
//                        'ProductStatus',
//                        'PeId'
//                    ]
//                }
//            ]
//        }
//    ]
//};

//function findObject(object, prop, propValue) {
//    for (var i=0; i < object.length; i++) {
//        if (object[i][prop] !== undefined) {
//            // valid object
//            if (object[i][prop] === propValue) {
//                return object[i];
//            }
//        } else {
//            // not a valid object
//            findObject(object[i][prop], prop, propValue);
//        }
//    }
//}
//
//function getIndices () {
//    //return config.indexName;
//    var indices = [];
//    $.each(config.index, function(i, item) {
//        indices.push( {
//            name: item.name,
//            text: item.text
//        });
//    });
//
//    return indices
//}
//
//function getIndexTypes (index) {
//
//    var indexInfo = findObject(config.index, 'name', index);
//    var types = indexInfo.type;
//
//    if (types.length > 0) {
//        return types;
//    } else {
//        return [];
//    }
//}
//
//function getFieldTypes(index, type) {
//    var indexInfo = findObject(config.index, 'name', index);
//    var typeInfo = findObject(indexInfo.type, 'name', type);
//    var fields = typeInfo.fields;
//
//    if (fields.length > 0) {
//        return fields;
//    } else {
//        return [];
//    }
//}

if (typeof module !== 'undefined' && module.exports) {
    exports.config = config;
}