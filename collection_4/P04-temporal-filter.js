/**
 * @name
 *      P04-temporal-filter.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 4: temporal filter, applied to the output of the gap fill (P03).
 *
 *      It removes short, implausible class changes in the time series: if a
 *      class is interrupted for 1 to 3 years and then comes back, the
 *      interruption is replaced by that class. Example for flooded forest
 *      (6) and other (27):
 *          6 27 6         -> 6 6 6          (middle3)
 *          6 27 27 6      -> 6 6 6 6        (middle4 + middle3)
 *          6 27 27 27 6   -> 6 6 6 6 6      (middle5 + middle4 + middle3)
 *      The first and last years, which have a neighbor on one side only,
 *      use two years of context:
 *          6 27 27 -> 27 27 27   (first3 with class 27, first year)
 *          6  6 27 ->  6  6  6   (last3 with class 6, last year)
 *
 *      Filters are applied in the order of `filterExecution`, and for each
 *      filter, class by class in the order of `order`: the first classes
 *      have priority because later classes see their result.
 *
 * @usage
 *      1. Set PARAMS (region, years, versions, filters).
 *      2. Run and compare "Original <year>" and "Temporal filter <year>"
 *         over the mosaics, and the area charts in the console.
 *      3. Start the export task from the Tasks tab.
 *
 * @inputs
 *      <paths.pathClassificationFloodedFilterAct>/FLOODED-<regionId>-<inputVersion>  (P03)
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

  // First and last year of the series (must match the bands of the input).
  years: { first: 1985, last: 2025 },

  yearsPreview: [2007, 2012, 2018, 2022, 2023, 2024, 2025],

  inputVersion: 996,                // P03 gap fill
  outputVersion: 995,               // same folder as P03: use a different version

  // Filters, applied in this order. For each filter, classes are processed
  // in the order given (the first class has priority).
  //   first3  : fixes the first year          (a b b -> b b b)
  //   middle3 : fixes 1-year interruptions    (b a b -> b b b)
  //   middle4 : fixes the first year of a 2-year interruption; follow it
  //             with middle3 to fix the second one
  //   middle5 : fixes the first year of a 3-year interruption; follow it
  //             with middle4 and middle3
  //   last3   : fixes the last year           (b b a -> b b b)
  filterExecution: [
    { name: 'first3',  order: [27] },
    { name: 'last3',   order: [6] },
    { name: 'middle3', order: [6] },
    { name: 'middle4', order: [6] },
    { name: 'middle3', order: [6] },
    { name: 'middle5', order: [6] },
    { name: 'middle4', order: [6] },
    { name: 'middle3', order: [6] },
    { name: 'middle3', order: [6, 27] }
  ],

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

var PREFIX = 'classification';

var YEARS = [];
for (var y = PARAMS.years.first; y <= PARAMS.years.last; y++) { YEARS.push(y); }

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1_median', 'nir_median', 'red_median'], gain: [0.085, 0.05, 0.25] };


// =============================================================================
// 3. TEMPORAL RULES
// =============================================================================
// Each rule returns the corrected band of one year. Masks are always
// computed on the input of the current pass (`image`), not on the bands
// already corrected in the same pass.

function band(image, year) {
  return image.select(PREFIX + '_' + year);
}

function bandNames(years) {
  return years.map(function (year) { return PREFIX + '_' + year; });
}

/** Sets `value` where `mask` is 1 (also on masked pixels of `target`). */
function setWhere(target, mask, value) {
  return target.blend(target.mask(mask.eq(1)).where(mask.eq(1), value));
}

var RULES = {

  // y-1 = c, y != c, y+1 = c  ->  y = c
  middle3: function (image, value, years, i) {
    var current = band(image, years[i]);
    var mask = band(image, years[i - 1]).eq(value)
      .and(current.neq(value))
      .and(band(image, years[i + 1]).eq(value));
    return setWhere(current, mask, value);
  },

  // y-1 = c, y != c, y+1 != c, y+2 = c  ->  y = c   (y+1 is fixed by a later middle3)
  middle4: function (image, value, years, i) {
    var current = band(image, years[i]);
    var mask = band(image, years[i - 1]).eq(value)
      .and(current.neq(value))
      .and(band(image, years[i + 1]).neq(value))
      .and(band(image, years[i + 2]).eq(value));
    return setWhere(current, mask, value);
  },

  // y-1 = c, y, y+1, y+2 != c, y+3 = c  ->  y = c   (the rest is fixed by middle4 + middle3)
  middle5: function (image, value, years, i) {
    var current = band(image, years[i]);
    var mask = band(image, years[i - 1]).eq(value)
      .and(current.neq(value))
      .and(band(image, years[i + 1]).neq(value))
      .and(band(image, years[i + 2]).neq(value))
      .and(band(image, years[i + 3]).eq(value));
    return setWhere(current, mask, value);
  }
};

// Number of years after `y` needed by each middle rule.
var RULE_SPAN = { middle3: 1, middle4: 2, middle5: 3 };

/**
 * Applies one rule for one class to every year of the series.
 */
function applyWindow(image, filterName, value, years) {
  var n = years.length;

  if (filterName === 'first3') {
    // y0 != c, y1 = c, y2 = c  ->  y0 = c
    var first = band(image, years[0]);
    var firstMask = first.neq(value)
      .and(band(image, years[1]).eq(value))
      .and(band(image, years[2]).eq(value));
    return setWhere(first, firstMask, value)
      .addBands(image.select(bandNames(years.slice(1))));
  }

  if (filterName === 'last3') {
    // yn-2 = c, yn-1 = c, yn != c  ->  yn = c
    var last = band(image, years[n - 1]);
    var lastMask = band(image, years[n - 3]).eq(value)
      .and(band(image, years[n - 2]).eq(value))
      .and(last.neq(value));
    return image.select(bandNames(years.slice(0, n - 1)))
      .addBands(setWhere(last, lastMask, value));
  }

  var span = RULE_SPAN[filterName];
  var bands = years.map(function (year, i) {
    var applies = i > 0 && i < n - span;
    return applies ? RULES[filterName](image, value, years, i) : band(image, year);
  });

  return ee.Image.cat(bands);
}

/**
 * Applies one filter (all its classes, in order).
 */
function applyFilter(image, filter, years) {
  filter.order.forEach(function (classId) {
    image = applyWindow(image, filter.name, classId, years);
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
// 4. TEMPORAL FILTER
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
  .select(bandNames(YEARS))
  .updateMask(regionMask);

print('Input image', input);

var filtered = input;

PARAMS.filterExecution.forEach(function (filter) {
  filtered = applyFilter(filtered, filter, YEARS);
});

filtered = filtered.set({
  step: 'temporal-filter',
  theme: 'Flooded',
  region: PARAMS.regionId,
  version: PARAMS.outputVersion,
  country: PARAMS.country
});

print('Output image', filtered);


// =============================================================================
// 5. MAP
// =============================================================================

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.yearsPreview.forEach(function (year) {
  var bandName = PREFIX + '_' + year;
  Map.addLayer(mosaics.filter(ee.Filter.eq('year', year)), MOSAIC_VIS, 'Mosaic ' + year, false);
  Map.addLayer(input.select(bandName), CLASS_VIS, 'Original ' + year, false);
  Map.addLayer(filtered.select(bandName), CLASS_VIS, 'Temporal filter ' + year, false);
});


// =============================================================================
// 6. CHARTS
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
    print(areaChart(filtered, classId, region, YEARS, 'Temporal filter'));
    print(areaChart(previousCollection, classId, region, previousYears, 'Collection 3 (general map)'));
  });
}


// =============================================================================
// 7. EXPORT
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
