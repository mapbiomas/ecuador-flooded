/**
 * @name
 *      P02-stack-multiband.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 2: stacks the annual flooded forest classifications of one region
 *      (P01) into a single multiband image, one band per year
 *      ('classification_<year>').
 *
 *      The stack can combine two sources:
 *        - new years classified with P01 (one image per year),
 *        - years taken from a previous stack (one multiband image), for
 *          example the Collection 3 result.
 *      If a year is in both, the new classification replaces the previous one.
 *
 * @usage
 *      1. Set PARAMS: region, years from each source and versions.
 *      2. Run, review the preview years and start the export task.
 *
 * @inputs
 *      - New years: <CURRENT_COLLECTION_PATH>FLOODED-<regionId>-<year>-<currentCollectionVersion>
 *      - Previous stack (optional): <PARAMS.previousCollectionPath><COUNTRY>-<regionId>-<previousCollectionVersion>
 *
 * @outputs
 *      <paths.pathClassificationFloodedAct>/FLOODED-<regionId>-<outputVersion>
 *      bands 'classification_<year>': 6 = flooded forest, 27 = other.
 *
 * @author
 *      Fabricio Garcés - EcoCiencia; MapBiomas Ecuador team
 *
 * @version
 *      1.0.0 (2026)
 *
 * @theme
 *      Flooded forest
 *
 * @collection
 *      4
 */


// =============================================================================
// 1. PARAMETERS
// =============================================================================

var PARAMS = {
  country: 'ECUADOR',
  regionId: 40203,                  // Flooded classification region (field 'id_regionC')

  // New years, classified with P01 (version currentCollectionVersion).
  newYears: [2024],
  currentCollectionVersion: 999,

  // Years taken from a previous stack. [] = none.
  // Example: years 1985-2023 from Collection 3:
  //   previousCollectionYears: [1985, 1986, ..., 2023]
  previousCollectionYears: [],
  previousCollectionVersion: 1,
  previousCollectionPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/clasificacion-ft/',   // must end with '/'

  yearsPreview: [2024],

  outputVersion: 997,

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

// Folder of the P01 classifications.
// TODO: confirm it is the same as paths.pathPrelimiarClassificationFlooded (used by P01).
var CURRENT_COLLECTION_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/preliminar/';

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };


// =============================================================================
// 3. STACK
// =============================================================================

var region = ee.FeatureCollection(paths.pathRegionsFlooded)
  .filter(ee.Filter.eq('id_regionC', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

// New years: one image per year, band 'classification_<year>'.
var newYearsImage = ee.Image.cat(PARAMS.newYears.map(function (year) {
  return ee.Image(CURRENT_COLLECTION_PATH + 'FLOODED-' + PARAMS.regionId + '-' +
    year + '-' + PARAMS.currentCollectionVersion).updateMask(regionMask);
})).byte();

var stack = newYearsImage;

// Previous years; new years replace them if repeated.
if (PARAMS.previousCollectionYears.length > 0) {
  var previousBands = PARAMS.previousCollectionYears.map(function (year) {
    return 'classification_' + year;
  });

  stack = ee.Image(PARAMS.previousCollectionPath + PARAMS.country + '-' + PARAMS.regionId + '-' +
    PARAMS.previousCollectionVersion)
    .select(previousBands)
    .updateMask(regionMask)
    .byte()
    .addBands(newYearsImage, null, true);
}

stack = stack.set({
  regions: PARAMS.regionId.toString(),
  country: PARAMS.country,
  version: PARAMS.outputVersion,
  step: 'stack multiband',
  theme: 'Flooded'
});

print('Stack', stack);


// =============================================================================
// 4. MAP
// =============================================================================

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.yearsPreview.forEach(function (year) {
  Map.addLayer(stack.select('classification_' + year), CLASS_VIS, 'Stack ' + year);
});


// =============================================================================
// 5. EXPORT
// =============================================================================

var fileName = 'FLOODED-' + PARAMS.regionId + '-' + PARAMS.outputVersion;
var assetId = paths.pathClassificationFloodedAct + '/' + fileName;   // path without a trailing '/'

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: stack.byte().reproject('EPSG:4326', null, 30),
  description: fileName,
  assetId: assetId,
  scale: 30,
  pyramidingPolicy: { '.default': 'mode' },
  maxPixels: 1e13,
  region: region.geometry().bounds()
});
