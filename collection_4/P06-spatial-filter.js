/**
 * @name
 *      P06-spatial-filter.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 6: spatial filter, applied year by year to the output of the
 *      frequency filters (P05).
 *
 *      Patches smaller than `minConnectedPixels` pixels take the most
 *      frequent class of their neighborhood (5-pixel square window). Larger
 *      patches are not changed.
 *
 *          minConnectedPixels = 20
 *          patch of 6 with 12 pixels inside 27  ->  becomes 27
 *          patch of 6 with 35 pixels            ->  unchanged
 *
 *      The result depends on the scale: the preview layers are reprojected
 *      to 30 m so they show what will be exported at any zoom level.
 *
 * @usage
 *      1. Set PARAMS (region, versions, patch size).
 *      2. Run and compare "Original <year>" and "Spatial filter <year>"
 *         over the mosaics, and the area charts in the console.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <paths.pathClassificationFloodedFilterAct>/FLOODED-<regionId>-<inputVersion>  (P05)
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

  inputVersion: 994,                // P05 frequency filter
  outputVersion: 993,               // same folder as P03-P05: use a different version

  // Patches with fewer pixels than this are replaced by their neighborhood.
  minConnectedPixels: 20,
  // true: diagonal neighbors belong to the same patch (8 directions); false: 4 directions.
  eightConnected: true,

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

// Maximum patch size counted by connectedPixelCount (must be >= minConnectedPixels).
var MAX_PATCH_SIZE = 500;

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

var BAND_NAMES = YEARS.map(function (year) { return 'classification_' + year; });

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1_median', 'nir_median', 'red_median'], gain: [0.085, 0.05, 0.25] };


// =============================================================================
// 3. FUNCTIONS
// =============================================================================

/**
 * Year by year, replaces the patches smaller than `minConnectedPixels` with
 * the most frequent class of a 5-pixel square window.
 */
function applySpatialFilter(image, minConnectedPixels, eightConnected) {
  return ee.Image.cat(BAND_NAMES.map(function (name) {
    var classification = image.select(name);
    var patchSize = classification.connectedPixelCount(MAX_PATCH_SIZE, eightConnected);

    var neighborhood = classification
      .focal_mode(5, 'square', 'pixels')
      .mask(patchSize.lt(minConnectedPixels));

    return classification.blend(neighborhood);
  }));
}

/**
 * Mosaic of a year for display. From 2022 on, Landsat 8 is used.
 * There is no 2026 mosaic: the 2025 Landsat 9 mosaic is shown instead.
 */
function getYearMosaic(mosaics, year) {
  if (year === 2026) {
    return mosaics.filter(ee.Filter.eq('year', 2025)).filter(ee.Filter.eq('satellite', 'l9')).mosaic();
  }
  var yearMosaics = mosaics.filter(ee.Filter.eq('year', year));
  if (year >= 2022) {
    yearMosaics = yearMosaics.filter(ee.Filter.eq('satellite', 'l8'));
  }
  return yearMosaics.mosaic();
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
// 5. SPATIAL FILTER
// =============================================================================

var filtered = applySpatialFilter(input, PARAMS.minConnectedPixels, PARAMS.eightConnected)
  .updateMask(regionMask)
  .set({
    step: 'spatial-filter',
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
  Map.addLayer(getYearMosaic(mosaics, year).updateMask(regionMask), MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(input.select(bandName).reproject('EPSG:4326', null, 30), CLASS_VIS, 'Original ' + year, false);
  Map.addLayer(filtered.select(bandName).reproject('EPSG:4326', null, 30), CLASS_VIS, 'Spatial filter ' + year, false);
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
    print(areaChart(filtered, classId, region, YEARS, 'Spatial filter'));
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
