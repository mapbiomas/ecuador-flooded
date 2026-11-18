/**
 * @name
 *      P01-classification.js
 *
 * @description
 *      Flooded forest cross-cutting theme - MapBiomas Ecuador Collection 4.
 *      Step 1: Random Forest classification of flooded forest (6) vs. other
 *      (27), year by year, for one classification region.
 *
 *      The classification is done only inside the region of interest (ROI)
 *      of the theme, i.e. the area where flooded forest can occur.
 *
 *      For each year:
 *        1. Builds the median mosaic of the year (all satellites) with extra
 *           indices (MNDWI, MMRI, clay ratio), Tasseled Cap (brightness,
 *           greenness, wetness) and terrain (altitude, slope), and keeps
 *           the bands in FEATURE_SPACE, inside the ROI.
 *        2. Loads the training samples of the year and, optionally, adds
 *           samples drawn inside polygons (one class per polygon).
 *        3. Trains a Random Forest and classifies the mosaic.
 *        4. Replaces patches smaller than 20 pixels with the most frequent
 *           class around them.
 *        5. Optionally changes classes inside polygons (`remapAreas`).
 *        6. Exports the classification and the samples used.
 *
 * @usage
 *      1. Set PARAMS (region, ROI, samples and output versions, years).
 *      2. (Optional) Draw polygons in the Code Editor for extra samples,
 *         new ROI areas or class changes, and list them in PARAMS.
 *      3. Run, review the classification against the mosaic and the
 *         previous collection, and start the export tasks.
 *
 * @inputs
 *      - ROI of the theme: PARAMS.roiPath (can come from the previous collection)
 *      - Samples: <SAMPLES_PATH>FLOODED-<regionId>-<year>-<samplesInputVersion>
 *      - Annual mosaics (LULC step 1)
 *
 * @outputs
 *      Per year:
 *      - Image  <paths.pathPrelimiarClassificationFlooded>/FLOODED-<regionId>-<year>-<versionOutput>
 *        band 'classification_<year>': 6 = flooded forest, 27 = other; masked outside the ROI.
 *      - Table  <paths.pathTrainingSamplesFloodedAct>/FLOODED-<regionId>-<year>-<versionSamplesOutput>
 *        (samples used, including the extra ones).
 *
 * @author
 *      MapBiomas Ecuador Team - EcoCiencia
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
  regionId: 40203,                  // Classification region (field id_regionC)

  years: [2022, 2023, 2024],

  // Region of interest of the theme (image, 1 = area where flooded forest can occur).
  roiPath: 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP01-ROIS/40203-2',

  samplesInputVersion: 1,           // samples used to train
  versionSamplesOutput: 999,        // samples exported (input + extra samples)
  versionOutput: 999,               // classification

  // Random Forest.
  trees: 120,
  variablesPerSplit: 1,

  // Patches smaller than this (in 30 m pixels) are replaced by their neighbors.
  minPatchSize: 20,

  // Geometries drawn in the Code Editor added to the ROI, e.g. [include].
  includeAreas: [],

  // FeatureCollections drawn in the Code Editor to change classes inside
  // them. Each feature has comma-separated 'from' and 'to' class lists,
  // e.g. from: '27', to: '6'. Example: [remap27to6].
  remapAreas: [],

  // Extra samples drawn inside polygons: polygon i gets points[i] samples
  // of class classes[i].
  additionalSamples: {
    polygons: [],    // e.g. [id_6, id_27]
    classes: [],     // e.g. [6, 27]
    points: []       // e.g. [3500, 2000]
  }
};

// Variables used by the classifier. They must exist in the samples.
var FEATURE_SPACE = [
  // terrain
  'altitude', 'slope',
  // spectral
  'mndwi_median', 'ndsi_median', 'gcvi_median', 'ndwi_mcfeeters_median', 'gcvi_wet',
  'mndwi_wet', 'mndwi_max', 'ndsi_min', 'ndvi_median', 'ndvi_wet', 'ndbi_median',
  'ndsi2_median', 'ndwi_gao_median', 'ndmi_median', 'mndwi_dry', 'ndmir_median',
  'mmri_median', 'cai_median', 'red_wet_max', 'savi_median', 'red_wet', 'evi2_median',
  'clay_median', 'gcvi_dry', 'ndmir_wet', 'ndfib_median', 'ndbi_max', 'ndsi2_max',
  'green_wet_qmo', 'green_median', 'red_median', 'ndwi_gao_dry', 'ndmir_max',
  'ndmi_dry', 'ndsi2_dry', 'cai_wet_min', 'ndrb_wet', 'ndbi_dry', 'red_min',
  'ndwi_gao_wet_min', 'gvs_median', 'cai_min', 'gv_median', 'ndwi_gao_dry_min',
  'ndvi_dry', 'savi_dry',
  // Tasseled Cap
  'brightness', 'greeness', 'wetness'
];


// =============================================================================
// 2. MODULES, ASSETS AND CONSTANTS
// =============================================================================

var paths = require('users/mapbiomasecuador/LULC:COLECCION4/05-modules/CollectionDirectories.js').paths;
var palette = require('users/mapbiomasecuador/LULC:MODULES/Palettes.js').get('EcuadorCol4');

var SAMPLES_PATH = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION4/CROSS_CUTTING_THEMES/FLOODABLE/STEP02-SAMPLES/';

var FLOODED = 6;
var OTHER = 27;

var CLASS_VIS = { min: 0, max: palette.length - 1, palette: palette };
var MOSAIC_VIS = { bands: ['swir1_median', 'nir_median', 'red_median'], min: 100, max: 4500 };


// =============================================================================
// 3. MOSAIC WITH DERIVED BANDS
// =============================================================================

var SLPPOST = ee.Image('projects/mapbiomas-raisg/MOSAICOS/slppost2_30_v1');
var ALTITUDE = ee.Image('JAXA/ALOS/AW3D30_V1_1').select('AVE').rename('altitude');
var SLOPE = ee.Terrain.slope(ALTITUDE).int8().rename('slope');

/** MNDWI = (green - swir1) / (green + swir1), scaled to 0-200. */
function addMndwi(image) {
  var mndwi = image.expression('(GREEN - SWIR1) / (GREEN + SWIR1)', {
    GREEN: image.select('green_median'),
    SWIR1: image.select('swir1_median')
  }).multiply(100).add(100).byte().rename('mndwi_median');
  return image.addBands(mndwi);
}

/** MMRI = (MNDWI - NDVI) / (MNDWI + NDVI), scaled to 0-200. */
function addMmri(image) {
  var mmri = image.expression('(MNDWI - NDVI) / (MNDWI + NDVI)', {
    MNDWI: image.select('mndwi_median'),
    NDVI: image.select('ndvi_median')
  }).multiply(100).add(100).byte().rename('mmri_median');
  return image.addBands(mmri);
}

/** Clay ratio = swir1 / swir2. */
function addClay(image) {
  var clay = image.expression('SWIR1 / SWIR2', {
    SWIR1: image.select('swir1_median'),
    SWIR2: image.select('swir2_median')
  }).multiply(100).add(100).int16().rename('clay_median');
  return image.addBands(clay);
}

/**
 * Tasseled Cap brightness, greenness and wetness. Landsat 8 coefficients
 * when the mosaic satellite is 'l8'; Landsat 5/7 coefficients otherwise.
 * TODO: Landsat 9 mosaics ('l9') currently use the Landsat 5/7 coefficients.
 * TODO: in the Landsat 5/7 wetness the blue coefficient has a minus sign
 *       (-0.1509); the published coefficient is +0.1509. Changing it must be
 *       done together with the script that builds the samples.
 */
function addTasseledCap(image) {
  var sensor = ee.String(image.get('satellite')).slice(1);
  var isL8 = ee.Algorithms.IsEqual(sensor, '8');

  var bands = {
    BLUE: image.select('blue_median'),
    GREEN: image.select('green_median'),
    RED: image.select('red_median'),
    NIR: image.select('nir_median'),
    SWIR1: image.select('swir1_median'),
    SWIR2: image.select('swir2_median')
  };

  var component = function (l8Expression, tmExpression, name) {
    return ee.Image(ee.Algorithms.If(
      isL8,
      image.expression(l8Expression, bands),
      image.expression(tmExpression, bands)
    )).rename(name).toInt16();
  };

  var brightness = component(
    '(BLUE * 0.3029) + (GREEN * 0.2786) + (RED * 0.4733) + (NIR * 0.5599) + (SWIR1 * 0.508) + (SWIR2 * 0.1872)',
    '(BLUE * 0.3037) + (GREEN * 0.2793) + (RED * 0.4743) + (NIR * 0.5585) + (SWIR1 * 0.5082) + (SWIR2 * 0.1863)',
    'brightness'
  );

  var greeness = component(
    '-(BLUE * 0.2941) - (GREEN * 0.243) - (RED * 0.5424) + (NIR * 0.7276) + (SWIR1 * 0.0713) - (SWIR2 * 0.1608)',
    '-(BLUE * 0.2848) - (GREEN * 0.2435) - (RED * 0.5436) + (NIR * 0.7243) + (SWIR1 * 0.0840) - (SWIR2 * 0.1800)',
    'greeness'
  );

  var wetness = component(
    '(BLUE * 0.1511) + (GREEN * 0.1973) + (RED * 0.3283) + (NIR * 0.3407) - (SWIR1 * 0.7117) - (SWIR2 * 0.4559)',
    '-(BLUE * 0.1509) + (GREEN * 0.1973) + (RED * 0.3279) + (NIR * 0.3406) - (SWIR1 * 0.7112) - (SWIR2 * 0.4572)',
    'wetness'
  );

  return image.addBands(brightness).addBands(greeness).addBands(wetness);
}

/**
 * Median of all mosaics of the year (all satellites) with derived bands
 * and terrain.
 */
function getMosaic(mosaics, year) {
  return mosaics
    .filter(ee.Filter.eq('year', year))
    .map(addMndwi)
    .map(addMmri)
    .map(addClay)
    .map(addTasseledCap)
    .map(function (image) { return image.addBands([SLPPOST, ALTITUDE, SLOPE]); })
    .median();
}


// =============================================================================
// 4. OTHER FUNCTIONS
// =============================================================================

/** Adds drawn geometries to the ROI (value 1). */
function includeNewArea(image, included) {
  if (included.length === 0) {
    return image;
  }

  var includedAreas = ee.FeatureCollection(included)
    .map(function (item) { return item.set('version', 1); })
    .reduceToImage(['version'], ee.Reducer.first())
    .rename('constant')
    .byte();

  return ee.ImageCollection([image, includedAreas]).mosaic().byte();
}

/** Draws `points[i]` random samples of `classes[i]` inside `polygons[i]`. */
function sampleFromPolygons(image, options) {
  return ee.FeatureCollection(options.polygons.map(function (polygon, i) {
    return image.sample({
      numPixels: options.points[i],
      region: polygon.geometry(),
      scale: 30,
      projection: 'EPSG:4326',
      seed: 1,
      geometries: true,
      tileScale: 16
    }).map(function (item) { return item.set('reference', options.classes[i]); });
  })).flatten();
}

/**
 * Changes classes inside polygons. Each feature has comma-separated 'from'
 * and 'to' class lists; 0 removes the pixel.
 */
function remapWithPolygons(image, polygons) {
  polygons.forEach(function (polygon) {
    var remapped = polygon.map(function (feature) {
      var toNumber = function (item) { return ee.Number.parse(item); };
      var from = ee.String(feature.get('from')).split(',').map(toNumber);
      var to = ee.String(feature.get('to')).split(',').map(toNumber);
      return image.clip(feature).remap(from, to);
    });

    image = ee.ImageCollection(remapped).mosaic().unmask(image).rename('reference');
    image = image.mask(image.neq(0));
  });

  return image.rename('classification');
}

/**
 * Replaces patches smaller than `minSize` pixels with the most frequent
 * class of their neighborhood (5-pixel window).
 */
function removeSmallPatches(image, minSize) {
  var patchSize = image.int16().connectedPixelCount(100, true).reproject('EPSG:4326', null, 30);
  var neighborhood = image.focal_mode(5, 'square', 'pixels')
    .mask(patchSize.lt(minSize))
    .reproject('EPSG:4326', null, 30);
  return image.blend(neighborhood);
}


// =============================================================================
// 5. CLASSIFICATION, YEAR BY YEAR
// =============================================================================

var region = ee.FeatureCollection(paths.pathRegionsFlooded)
  .filter(ee.Filter.eq('id_regionC', PARAMS.regionId));

var mosaics = ee.ImageCollection(paths.mosaicRaisgAct)
  .merge(ee.ImageCollection(paths.mosaicPacificoAct))
  .filter(ee.Filter.eq('country', PARAMS.country))
  .filterBounds(region);

var previousCollection = ee.Image(paths.integrationCol3);

var roi = includeNewArea(ee.Image(PARAMS.roiPath).rename('constant'), PARAMS.includeAreas);

Map.addLayer(region.style({ fillColor: 'FF000000', color: 'FF0000' }), {}, 'Region ' + PARAMS.regionId, false);

PARAMS.years.forEach(function (year) {
  var bandName = 'classification_' + year;

  var yearMosaic = getMosaic(mosaics, year);
  var features = yearMosaic.select(FEATURE_SPACE).updateMask(roi);

  // Samples.
  var samples = ee.FeatureCollection(SAMPLES_PATH + 'FLOODED-' + PARAMS.regionId + '-' + year + '-' + PARAMS.samplesInputVersion);

  if (PARAMS.additionalSamples.polygons.length > 0) {
    samples = samples.merge(sampleFromPolygons(features, PARAMS.additionalSamples));
  }

  // A Random Forest needs at least two classes.
  var nClasses = samples.aggregate_array('reference').distinct().size().getInfo();
  if (nClasses < 2) {
    print('WARNING: ' + year + ' has fewer than 2 classes in the samples. Year skipped.');
    return;
  }

  // Classify, remove small patches and apply manual changes.
  var classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: PARAMS.trees,
    variablesPerSplit: PARAMS.variablesPerSplit
  }).train(samples, 'reference', features.bandNames());

  var classified = remapWithPolygons(
    removeSmallPatches(features.classify(classifier), PARAMS.minPatchSize),
    PARAMS.remapAreas
  )
    .rename(bandName)
    .set({
      country: PARAMS.country,
      region: PARAMS.regionId,
      version: PARAMS.versionOutput
    });

  print('Output image ' + year, classified);

  // Exports.
  var name = 'FLOODED-' + PARAMS.regionId + '-' + year + '-';

  Export.image.toAsset({
    image: classified.byte().reproject('EPSG:4326', null, 30),
    description: name + PARAMS.versionOutput,
    assetId: paths.pathPrelimiarClassificationFlooded + '/' + name + PARAMS.versionOutput,   // path without a trailing '/'
    pyramidingPolicy: { '.default': 'mode' },
    region: region.geometry().bounds(),
    scale: 30,
    crs: 'EPSG:4326',
    maxPixels: 1e13
  });

  Export.table.toAsset(
    samples,
    name + PARAMS.versionSamplesOutput,
    paths.pathTrainingSamplesFloodedAct + '/' + name + PARAMS.versionSamplesOutput   // path without a trailing '/'
  );

  // Map: mosaic, previous collection, classification and samples.
  Map.addLayer(yearMosaic.clip(region), MOSAIC_VIS, 'Mosaic ' + year, false);

  // The previous collection covers up to 2024.
  if (year <= 2024) {
    Map.addLayer(
      previousCollection.select(bandName).clip(region).eq(FLOODED).selfMask().multiply(FLOODED),
      CLASS_VIS, 'Collection 3 - flooded forest ' + year, false
    );
  }

  Map.addLayer(classified.clip(region).reproject('EPSG:4326', null, 30), CLASS_VIS, 'Classification ' + year, false);

  var styledSamples = samples.map(function (feature) {
    var color = ee.Algorithms.If(feature.getNumber('reference').eq(FLOODED), '#39a9b1', 'gray');
    return feature.set('style', { color: color, pointSize: 5 });
  });
  Map.addLayer(styledSamples.style({ styleProperty: 'style' }), {}, 'Samples ' + year, false);
});
