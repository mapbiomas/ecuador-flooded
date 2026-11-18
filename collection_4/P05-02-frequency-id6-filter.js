/**
 * @name
 *      P05-02-frequency-id6-filter.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 5.2: frequency filter for class 6 (flooded forest), applied to
 *      the output of the temporal filter (P04).
 *
 *      Pixels classified as 6 in more than `majorityPercent` % of the years
 *      are set to 6 in every year (persistent flooded forest).
 *
 *          majorityPercent = 75, 41 years (75 % = 30.75 years):
 *          6 6 27 6 ... 6   (35 years of 6, 85.4 %)  ->  6 6 6 6 ... 6
 *          6 27 27 6 ... 27 (20 years of 6, 48.8 %)  ->  unchanged
 *
 *      Options:
 *        - excludeYears: years not used to compute the frequency and kept
 *          unchanged.
 *        - hidden: apply the filter only inside (or only outside) drawn
 *          polygons.
 *        - remapAreas: change classes inside drawn polygons (applied last).
 *
 * @usage
 *      1. Set PARAMS (region, versions, threshold and options).
 *      2. Run and compare "Original <year>" and "Frequency filter <year>"
 *         over the mosaics, the layer "Frequency of class 6" and the area
 *         charts in the console.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <paths.pathClassificationFloodedFilterAct>/FLOODED-<regionId>-<inputVersion>  (P04)
 *
 * @outputs
 *      <paths.pathClassificationFloodedFilterAct>/FLOODED-<regionId>-<outputVersion>
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

  // Years of the series (the input must have one band per year).
  years: { first: 1985, last: 2025 },

  yearsPreview: [2007, 2012, 2018, 2022, 2023, 2024, 2025],

  inputVersion: 995,                // P04 temporal filter
  outputVersion: 994,               // same folder as P03/P04: use a different version

  // Class filtered and frequency threshold (% of the years used).
  classId: 6,
  majorityPercent: 75,

  // Years not used to compute the frequency and kept unchanged, e.g. [2012].
  excludeYears: [],

  // Restrict the filter to drawn polygons.
  hidden: {
    areas: null,     // FeatureCollection drawn in the Code Editor, with a numeric property 'id' = 1. null = whole region
    inside: false    // true: filter only inside the polygons; false: only outside
  },

  // FeatureCollections drawn in the Code Editor whose features have the
  // properties 'from' and 'to' (comma-separated classes, e.g. from: '6',
  // to: '27'). Classes are changed inside the polygons after the filter.
  // Example: [remap_to_27]
  remapAreas: [],

  // Area charts (ha) in the console: input, filtered and previous collection.
  charts: {
    show: true,
    classes: [6]
  },

  // *** CAUTION *** true deletes the existing asset with the same name before exporting.
  overwrite: false
};


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

// General map of Collection 3, used only in the charts.
var PREVIOUS_COLLECTION_ASSET = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/INTEGRATION/ECUADOR-3';
var PREVIOUS_COLLECTION_YEARS = { first: 1985, last: 2024 };

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
 * appears in more than `majorityPercent` % of the years used. With a hidden
 * mask, only pixels where the mask is 0 are changed.
 */
function frequencyFilter(image, classId, majorityPercent, excludeYears, hiddenMask) {
  var excludedBands = excludeYears.map(function (year) { return 'classification_' + year; });
  var usedBands = BAND_NAMES.filter(function (name) { return excludedBands.indexOf(name) === -1; });

  var used = image.select(usedBands);

  var frequency = used.eq(classId)
    .reduce('sum')
    .divide(usedBands.length)
    .multiply(100);

  var condition = frequency.gt(majorityPercent);
  if (hiddenMask) {
    condition = condition.and(hiddenMask.eq(0));
  }

  // classId where the condition is met, masked elsewhere.
  var majority = ee.Image(0).where(condition, classId);
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
 * Hidden mask: 0 where the filter is applied, 1 where it is not.
 */
function getHiddenMask(hidden, region, regionMask) {
  var mask = hidden.areas
    .reduceToImage(['id'], ee.Reducer.first())
    .clipToBoundsAndScale(region, null, null, null, 30)
    .unmask(0)
    .updateMask(regionMask);

  if (hidden.inside) {
    mask = mask.remap([0, 1], [1, 0]);
  }

  Map.addLayer(mask, { min: 0, max: 1 }, 'Hidden mask (1 = not filtered)', false);
  return mask;
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

/**
 * Line chart of the area (ha) of one class per year, at 250 m
 * (one 250 m pixel = 6.25 ha). Reference only: values are approximate.
 */
function areaChart(image, classId, region, xLabels, title) {
  return ui.Chart.image.regions({
    image: image.eq(classId).multiply(6.25).selfMask(),
    regions: region.geometry().bounds(),
    reducer: ee.Reducer.sum(),
    scale: 250,
    seriesProperty: 'system:id',
    xLabels: xLabels
  })
    .setChartType('LineChart')
    .setOptions({
      title: 'Class ' + classId + ' - ' + title + ' (250 m)',
      hAxis: { title: 'Year', titleTextStyle: { italic: false, bold: true } },
      vAxis: { title: 'Area (ha)', titleTextStyle: { italic: false, bold: true } },
      colors: ['#' + palette[classId]],
      lineSize: 2
    });
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

var input = ee.Image(paths.pathClassificationFloodedFilterAct + '/FLOODED-' + PARAMS.regionId + '-' + PARAMS.inputVersion)
  .select(BAND_NAMES)
  .updateMask(regionMask);

print('Input image', input);


// =============================================================================
// 5. FREQUENCY FILTER
// =============================================================================

var hiddenMask = PARAMS.hidden.areas ? getHiddenMask(PARAMS.hidden, region, regionMask) : null;

var filtered = frequencyFilter(input, PARAMS.classId, PARAMS.majorityPercent, PARAMS.excludeYears, hiddenMask);

if (PARAMS.remapAreas.length > 0) {
  filtered = ee.Image.cat(BAND_NAMES.map(function (name) {
    return remapWithPolygons(filtered.select([name]), PARAMS.remapAreas).rename([name]);
  }));
}

filtered = filtered.set({
  step: 'frequency-filter',
  theme: 'Flooded',
  region: PARAMS.regionId,
  version: PARAMS.outputVersion,
  country: PARAMS.country
});

print('Output image', filtered);


// =============================================================================
// 6. MAP
// =============================================================================

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.yearsPreview.forEach(function (year) {
  var bandName = 'classification_' + year;
  Map.addLayer(mosaics.filter(ee.Filter.eq('year', year)), MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(input.select(bandName), CLASS_VIS, 'Original ' + year, false);
  Map.addLayer(filtered.select(bandName), CLASS_VIS, 'Frequency filter ' + year, false);
});


// =============================================================================
// 7. CHARTS
// =============================================================================

if (PARAMS.charts.show) {
  var previousCollection = ee.Image(PREVIOUS_COLLECTION_ASSET);

  var previousYears = [];
  for (var py = PREVIOUS_COLLECTION_YEARS.first; py <= PREVIOUS_COLLECTION_YEARS.last; py++) {
    previousYears.push(py);
  }

  print('Note: the charts are a reference only. Classifications are resampled ' +
        'from 30 m to 250 m to compute them, so use them with caution.');

  PARAMS.charts.classes.forEach(function (classId) {
    print(areaChart(input, classId, region, YEARS, 'Original'));
    print(areaChart(filtered, classId, region, YEARS, 'Frequency filter'));
    print(areaChart(previousCollection, classId, region, previousYears, 'Collection 3 (general map)'));
  });
}


// =============================================================================
// 8. EXPORT
// =============================================================================

var fileName = 'FLOODED-' + PARAMS.regionId + '-' + PARAMS.outputVersion;
var assetId = paths.pathClassificationFloodedFilterAct + '/' + fileName;   // path without a trailing '/'

if (PARAMS.overwrite) {
  try {
    ee.data.deleteAsset(assetId);
  } catch (error) {
    print('Nothing to delete: ' + assetId);
  }
}

Export.image.toAsset({
  image: filtered.byte().reproject('EPSG:4326', null, 30),
  description: fileName,
  assetId: assetId,
  scale: 30,
  pyramidingPolicy: { '.default': 'mode' },
  maxPixels: 1e13,
  region: region.geometry().bounds()
});
