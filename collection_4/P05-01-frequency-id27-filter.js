/**
 * @name
 *      P05-01-frequency-id27-filter.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 5.1: frequency filter for class 27 (other).
 *
 *      Pixels classified as 27 in more than `majorityPercent` % of the years
 *      are set to 27 in every year: isolated flooded forest (6) years inside
 *      a pixel that is almost always "other" are removed.
 *
 *          majorityPercent = 85, 41 years:
 *          27 27 6 27 ... 27   (40 x 27 = 97.6 %)  ->  27 27 27 27 ... 27
 *          27  6 6 27 ...  6   (60 % of 27)        ->  unchanged
 *
 *      Options:
 *        - excludeYears: years not used to compute the frequency and kept
 *          unchanged.
 *        - applyArea: apply the filter only inside drawn polygons.
 *        - remapAreas: change classes inside drawn polygons (applied last).
 *
 * @usage
 *      1. Set PARAMS (region, versions, threshold and options).
 *      2. Run and compare "Original <year>" and "Frequency filter <year>"
 *         over the mosaics, and the layer "Frequency of class 27".
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <FOLDER><inputCollection>/FLOODED-<regionId>-<inputVersion>
 *      One band per year, 'classification_<firstYear>' to 'classification_<lastYear>'.
 *
 * @outputs
 *      <FOLDER><outputCollection>/FLOODED-<regionId>-<outputVersion>
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
  regionId: 40201,                  // Flooded classification region (field 'id_regionC')

  // Years of the series (the input must have one band per year).
  years: { first: 1985, last: 2025 },

  yearsPreview: [2023, 2024, 2025],

  // Input and output: <FOLDER><collection>/FLOODED-<regionId>-<version>
  inputCollection: 'classification-ft',
  inputVersion: 2,
  outputCollection: 'classification-ft',
  outputVersion: 98,

  // Class filtered and frequency threshold (% of the years used).
  classId: 27,
  majorityPercent: 85,

  // Years not used to compute the frequency and kept unchanged, e.g. [2012].
  excludeYears: [],

  // FeatureCollection drawn in the Code Editor: the filter is applied only
  // inside it. null = whole region.
  applyArea: null,

  // FeatureCollections drawn in the Code Editor whose features have the
  // properties 'from' and 'to' (comma-separated classes, e.g. from: '6',
  // to: '27'). Classes are changed inside the polygons after the filter.
  // Example: [remap6to27]
  remapAreas: [],

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');


var FOLDER = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/';

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

var BAND_NAMES = YEARS.map(function (year) { return 'classification_' + year; });

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1_median', 'nir_median', 'red_median'], gain: [0.085, 0.05, 0.25] };
var FREQUENCY_VIS = { min: 0, max: 100, palette: ['dadada', 'ff6f2b', '97cbff', '3590ff', '230aff'] };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

/**
 * Sets `classId` in every year (except the excluded ones) where the class
 * appears in more than `majorityPercent` % of the years used.
 */
function frequencyFilter(image, classId, majorityPercent, excludeYears) {
  var excludedBands = excludeYears.map(function (year) { return 'classification_' + year; });
  var usedBands = BAND_NAMES.filter(function (name) { return excludedBands.indexOf(name) === -1; });

  var used = image.select(usedBands);

  var frequency = used.eq(classId)
    .reduce('sum')
    .divide(usedBands.length)
    .multiply(100);

  // classId where the frequency is above the threshold, masked elsewhere.
  var majority = ee.Image(0).where(frequency.gt(majorityPercent), classId);
  majority = majority.updateMask(majority.neq(0));

  var filtered = used.where(majority, majority);

  if (excludedBands.length > 0) {
    print('Excluded years', excludeYears);
    filtered = filtered.addBands(image.select(excludedBands)).select(BAND_NAMES);
  }

  Map.addLayer(frequency, FREQUENCY_VIS,
    'Frequency of class ' + classId + ' (' + usedBands.length + ' years)', false);

  return filtered;
}

/**
 * Changes classes inside polygons ('from' -> 'to' properties of each feature).
 */
function remapWithPolygons(image, polygons) {
  polygons.forEach(function (polygon) {
    var remapped = polygon.map(function (feature) {
      var toNumber = function (item) { return ee.Number.parse(item); };
      var from = ee.String(feature.get('from')).split(',').map(toNumber);
      var to = ee.String(feature.get('to')).split(',').map(toNumber);
      return image.clip(feature).remap(from, to)
        .clipToBoundsAndScale({ geometry: feature.geometry(), scale: 30 });
    });

    image = ee.ImageCollection(remapped).mosaic().unmask(image).rename('classification');
    image = image.mask(image.neq(0));
  });

  return image;
}


// =============================================================================
// 4. INPUTS
// =============================================================================

var region = ee.FeatureCollection(paths.pathRegionsFlooded)
  .filter(ee.Filter.eq('id_regionC', PARAMS.regionId));

var regionMask = region
  .map(function (f) { return f.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

var mosaics = ee.ImageCollection(paths.mosaicRaisgAct)
  .merge(ee.ImageCollection(paths.mosaicPacificoAct))
  .filter(ee.Filter.eq('country', PARAMS.country))
  .filterBounds(region);

var inputName = 'FLOODED-' + PARAMS.regionId + '-' + PARAMS.inputVersion;
var original = ee.Image(FOLDER + PARAMS.inputCollection + '/' + inputName).select(BAND_NAMES);

print('Input: ' + inputName, original);


// =============================================================================
// 5. FREQUENCY FILTER
// =============================================================================

var filtered = frequencyFilter(original, PARAMS.classId, PARAMS.majorityPercent, PARAMS.excludeYears);

// Keep the result only inside the region.
var regionStack = ee.Image.cat(BAND_NAMES.map(function (name) {
  return ee.Image(27).byte().updateMask(regionMask).rename(name);
}));
filtered = regionStack.where(regionStack.gte(1), filtered);

// Outside `applyArea`, the input is kept.
if (PARAMS.applyArea) {
  var applyImage = PARAMS.applyArea
    .map(function (f) { return f.set('id', 1); })
    .reduceToImage(['id'], ee.Reducer.first())
    .clipToBoundsAndScale({ geometry: PARAMS.applyArea.geometry(), scale: 30 });

  var outsideApplyArea = applyImage.unmask().eq(0).selfMask();

  filtered = filtered.blend(original.updateMask(outsideApplyArea));
}

if (PARAMS.remapAreas.length > 0) {
  filtered = ee.Image.cat(BAND_NAMES.map(function (name) {
    return remapWithPolygons(filtered.select([name]), PARAMS.remapAreas).rename([name]);
  }));
}

filtered = filtered.select(BAND_NAMES).set({
  step: 'frequency filter',
  theme: 'Flooded',
  region: PARAMS.regionId,
  version: PARAMS.outputVersion,
  country: PARAMS.country
});

print('Output image', filtered);


// =============================================================================
// 6. MAP
// =============================================================================

Map.setOptions('SATELLITE');

PARAMS.yearsPreview.forEach(function (year) {
  var bandName = 'classification_' + year;
  Map.addLayer(mosaics.filter(ee.Filter.eq('year', year)), MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(original.select(bandName), CLASS_VIS, 'Original ' + year, false);
  Map.addLayer(filtered.select(bandName), CLASS_VIS, 'Frequency filter ' + year, false);
});

Map.addLayer(region.style({ color: 'ffffff', fillColor: 'ff000000' }), {}, 'Region ' + PARAMS.regionId, false);


// =============================================================================
// 7. EXPORT
// =============================================================================

var fileName = 'FLOODED-' + PARAMS.regionId + '-' + PARAMS.outputVersion;
var assetId = FOLDER + PARAMS.outputCollection + '/' + fileName;

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: filtered.byte(),
  description: fileName,
  assetId: assetId,
  pyramidingPolicy: { '.default': 'mode' },
  region: region.geometry().bounds(),
  crs: 'EPSG:4326',
  scale: 30,
  maxPixels: 1e13
});
