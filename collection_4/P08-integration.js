/**
 * @name
 *      P08-integration.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 8: integrates the final filtered classifications of all flooded
 *      regions into the national flooded forest map.
 *
 *      1. Mosaics the final image of each region (REGION_VERSIONS).
 *         Where regions overlap, the region listed LAST is kept.
 *      2. Pixels of Ecuador with no value (outside the flooded regions or
 *         masked in them) become 27 (other); pixels outside Ecuador are masked.
 *      3. Exports the national image (one band per year).
 *
 * @usage
 *      1. Update REGION_VERSIONS with the final version of each region.
 *      2. Set the output version, run, review the years and start the export task.
 *
 * @inputs
 *      <CLASSIFICATION_FT_PATH>/FLOODED-<regionId>-<version>  (one per region)
 *
 * @outputs
 *      <PARAMS.outputPath>/ECUADOR-FLOODED-<outputVersion>
 *      bands 'classification_<year>': 6 = flooded forest, 27 = other.
 *
 * @author
 *      Fabricio Garcés - EcoCiencia; MapBiomas Amazonía development team
 *
 * @version
 *      1.0.0 (2026-09-15)
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
  theme: 'FLOODED',
  collection: '4.0',
  source: 'EcoCiencia',

  outputVersion: 1,
  outputPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/FLOODABLE/STEP04-INTEGRATION',

  // Years added to the map.
  yearsPreview: { first: 1985, last: 2025 },

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};

// Final version of each flooded region [regionId, version].
// Order matters where regions overlap: later regions are drawn on top.
var REGION_VERSIONS = [
  [40201, 5],
  [40203, 6],
  [40205, 5],
  [40901, 5]
];


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

// TODO: confirm that this is paths.pathClassificationFloodedFilterAct
// (output folder of P03-P06).
var CLASSIFICATION_FT_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/classification-ft';
var COUNTRY_ASSET = 'projects/mapbiomas-ecuador/assets/AUXILIAR-DATA/VECTOR/COLLECTION-4/nivel_politico_1_col4';

var OTHER = 27;

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };


// =============================================================================
// 3. INTEGRATION
// =============================================================================

var country = ee.FeatureCollection(COUNTRY_ASSET);

var countryMask = country
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var assets = REGION_VERSIONS.map(function (item) {
  return CLASSIFICATION_FT_PATH + '/' + PARAMS.theme + '-' + item[0] + '-' + item[1];
});

print('Regions integrated', assets);

var integration = ee.ImageCollection(assets)
  .mosaic()
  .unmask(OTHER)
  .updateMask(countryMask)
  .set({
    version: PARAMS.outputVersion,
    collection: PARAMS.collection,
    country: PARAMS.country,
    source: PARAMS.source,
    theme: PARAMS.theme,
    created: ee.Date(Date.now()).format('YYYY-MM-dd HH:mm:ss')
  });

print('Output image', integration);


// =============================================================================
// 4. MAP
// =============================================================================

for (var year = PARAMS.yearsPreview.first; year <= PARAMS.yearsPreview.last; year++) {
  Map.addLayer(integration.select('classification_' + year), CLASS_VIS, PARAMS.theme + ' ' + year, false);
}


// =============================================================================
// 5. EXPORT
// =============================================================================

var outputName = PARAMS.country + '-' + PARAMS.theme + '-' + PARAMS.outputVersion;
var assetId = PARAMS.outputPath + '/' + outputName;

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: integration.byte().reproject('EPSG:4326', null, 30),
  description: outputName,
  assetId: assetId,
  pyramidingPolicy: { '.default': 'mode' },
  region: country.geometry().bounds(),
  scale: 30,
  maxPixels: 1e13
});
