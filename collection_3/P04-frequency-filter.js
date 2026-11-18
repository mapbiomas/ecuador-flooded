
/**
 * @name
 *      P04-frequency-filter.js
 * 
 * @description
 *      Script that applies frequency-based filtering for flooded areas classification,
 *      identifying persistent wetland pixels based on temporal frequency analysis.
 * 
 * @authors
 *      MapBiomas Team
 * 
 * @theme 
 *      Flooded
 *    
 * @version
 *      1.0.0
 *
 * @Date
 *      2024
 */

var param = {
  regionId: 40203,
  mosaicRegion: 402,
  country: 'ECUADOR',
  cover: 'FLOODED',
  year: 2024,
  collectionId: 'COLLECTION6',
  inputCollection: 'clasificacion-ft',
  outputCollection: 'clasificacion-ft',
  excludeYears: [],
  remaps: [],
  applyArea: null, // remap_to_27, provide geometry name to apply only within that geometry
  majorityPercent: 60,
  inputVersion: 4,
  outputVersion: 5
};

// params
var regionId = param.regionId;
var mosaicRegion = param.mosaicRegion;
var country = param.country;
var cover = param.cover;
var year = param.year;
var majorityPercent = param.majorityPercent;
var collectionId = param.collectionId;
var inputCollection = param.inputCollection;
var outputCollection = param.outputCollection;
var inputVersion = param.inputVersion;
var outputVersion = param.outputVersion;
var excludeYears = param.excludeYears;
var remap = param.remaps;
var applyArea = param.applyArea || null;
var classId = cover === 'FLOODED' ? 6 : 11;
var majorityPercent = param.majorityPercent;
var t0 = 1985;
var t1 = 2024;
var years = ee.List.sequence(t0, t1).getInfo();

/**
 * Imports
 */

// colors
var palette = require('users/mapbiomas/modules:Palettes.js').get('classification2');

// regions
var regionsLayer = ee.FeatureCollection('users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-2')
  .filter(ee.Filter.eq('id_regionC', regionId))
  .map(function(item) { return item.set('version', 1); });

var regionsRaster = regionsLayer
  .reduceToImage(['version'], ee.Reducer.first());

var bandNames = years
  .map(function(year) { return 'classification_' + year; });

// input collection
var fullRegion = cover + '-' + regionId;

var inputDir = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/' + inputCollection;
var classification = ee.Image(inputDir + '/' + fullRegion + '-' + inputVersion);
var image = classification;

// mosaics
var mosaicAmazonPath = 'projects/mapbiomas-raisg/MOSAICOS/mosaics-2';
var mosaicPacificPath = 'projects/mapbiomas-raisg/MOSAICOS/mosaics-pathrow-2';

var mosaics = ee.ImageCollection(mosaicAmazonPath)
  .merge(ee.ImageCollection(mosaicPacificPath))
  .select(['swir1_median', 'nir_median', 'red_median']);

/**
 * Setup masked bands to original image
 */
var bandnameReg = image.bandNames();
var bands = bandnameReg.getInfo();
var classif = ee.Image(0);

var bandNames = ee.List(
  years.map(function(year) {
    return 'classification_' + String(year);
  })
);

if (bands[0] === 'constant') bands = bands.slice(1);

bands.forEach(function(bandName) {
  var year = parseInt(bandName.split('_')[1], 10);
  
  var nodata = ee.Image(27);
  
  var mosaic = mosaics
    .filterMetadata('year', 'equals', year);
  
  var mosaicBand = mosaic
    .select('swir1_median')
    .mosaic()
    .updateMask(regionsRaster);
  
  if (inputVersion === 1) nodata = nodata.updateMask(mosaicBand);
  
  var newImage = ee.Image(0)
    .updateMask(regionsRaster)
    .where(nodata.eq(27), 27)
    .where(image.select(bandName).eq(classId), classId);
  
  var band0 = newImage.updateMask(newImage.unmask().neq(0));
  
  classif = classif.addBands(band0.rename(bandName));
});

image = classif.select(bandnameReg);

// generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
  bandNames.cat(image.bandNames()).reduce(ee.Reducer.frequencyHistogram())
);

// insert a masked band
var bandsDictionary = bandsOccurrence.map(function(key, value) {
  return ee.Image(
    ee.Algorithms.If(
      ee.Number(value).eq(2),
      image.select([key]).byte(),
      ee.Image().rename([key]).byte().updateMask(image.select(0))
    )
  );
});

// convert dictionary to image
var imageAllBands = ee.Image(
  bandNames.iterate(function(band, image) {
    return ee.Image(image).addBands(bandsDictionary.get(ee.String(band)));
  }, ee.Image().select())
);

/**
 * Frequency filter function
 * Calculates the temporal frequency of wetland class and filters based on majority threshold
 */
var frequencyFilter = function(inputImage) {
  var bands = inputImage.bandNames();
  var mainImage = inputImage;
  
  // Exclude specified years from analysis
  if (excludeYears && excludeYears.length > 0) {
    var excludedBands = excludeYears.map(function(yr) {
      return 'classification_' + yr;
    });
    
    bands = bands.removeAll(excludedBands);
    inputImage = inputImage.select(bands);
    print('EXCLUDED YEARS: ', excludeYears.join(', '));
  }
  
  // Get frequency percentage
  var usedBands = bands.size().getInfo();
  
  var frequency = inputImage.eq(classId)
    .reduce('sum')
    .divide(bands.size())
    .multiply(100);
  
  // Wetland image based on frequency > majorityPercent
  var wetlandMap = ee.Image(0).where(frequency.gt(majorityPercent), classId);
  wetlandMap = wetlandMap.updateMask(wetlandMap.neq(0));
  
  // Apply frequency mask over the multiband input image
  var filtered = inputImage.where(wetlandMap, wetlandMap);
  
  // Re-add excluded years if any
  if (excludeYears && excludeYears.length > 0) {
    filtered = filtered
      .addBands(mainImage.select(excludedBands))
      .select(mainImage.bandNames());
  }
  
  // Display frequency image
  Map.addLayer(
    frequency,
    {
      min: 0,
      max: 100,
      palette: 'dadada,ff6f2b,97cbff,3590ff,230aff'
    },
    'FREQUENCY OF WETLANDS (' + usedBands + ' bands)',
    false
  );
  
  return filtered;
};

/**
 * Implementation
 */
var inputImage = imageAllBands;

var filtered, original;
if (inputVersion === 1) {
  filtered = frequencyFilter(inputImage);
  original = inputImage;
} else {
  filtered = frequencyFilter(classification);
  original = classification;
}

filtered = inputImage
  .select(bandNames)
  .where(inputImage.gte(1), filtered);

// Setting up the unique area to apply, if declared
if (applyArea) {
  var applyImage = applyArea
    .map(function(item) { return item.set('id', 1); })
    .reduceToImage(['id'], ee.Reducer.first())
    .clipToBoundsAndScale({
      geometry: applyArea.geometry(),
      scale: 30
    });
  
  var noApplyImage = ee.Image(0)
    .where(applyImage.unmask().eq(1), 1)
    .eq(0)
    .selfMask();
  
  var noAppliedArea = original.updateMask(noApplyImage);
  filtered = filtered.blend(noAppliedArea);
}

// Remap by geometries
if (remap && remap.length > 0) {
  var bands = filtered.bandNames();
  
  var remapped = bands.map(function(band) {
    var selected = filtered.select([band]);
    return remapWithPolygons(selected, remap).rename([band]);
  });
  
  filtered = ee.ImageCollection(remapped)
    .toBands()
    .rename(bands);
}

/**
 * Visualizations
 */
Map.setOptions('SATELLITE');

var vis = {
  'bands': ['classification_' + year],
  'min': 0,
  'max': 34,
  'palette': palette,
  'format': 'png'
};

Map.addLayer(
  mosaics
    .mosaic()
    .updateMask(regionsRaster),
  {
    'bands': ['swir1_median', 'nir_median', 'red_median'],
    'gain': [0.08, 0.06, 0.08],
    'gamma': 0.65
  },
  'MOSAIC ' + year,
  false
);

Map.addLayer(
  original.unmask(27).updateMask(regionsRaster),
  vis,
  'ORIGINAL ' + year,
  false
);

Map.addLayer(
  filtered,
  vis,
  'FILTERED ' + year
);

Map.addLayer(
  regionsLayer.style({
    "color": "ffffff",
    "fillColor": "ff000000"
  }),
  {},
  'EXPORT REGION'
);

/**
 * Export images to asset
 */
var fileName = cover + '-' + regionId;
var outputAsset = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/classification-ft/';
var imageName = fileName + '-' + outputVersion;

filtered = filtered
  .select(bandNames)
  .byte()
  .set({
    code_region: regionId,
    country: country,
    version: outputVersion.toString(),
    description: 'frequency filter',
    cover: cover
  });

print('INPUT: ' + fileName + '-' + inputVersion, classification);
print('OUTPUT: ' + imageName, filtered);

Export.image.toAsset({
  image: filtered,
  description: imageName,
  assetId: outputAsset + imageName,
  pyramidingPolicy: { '.default': 'mode' },
  region: regionsLayer.geometry().bounds(),
  scale: 30,
  maxPixels: 1e13
});

/**
 * Functions
 */

function firstYearContinuityClass(year, previousImage2) {
  var currentImage = firstYearSelect.select(ee.Number(year).subtract(t0));
  previousImage2 = ee.Image(previousImage2);
  
  var num = ee.Number(year).subtract(t0);
  currentImage = currentImage.where(previousImage2.select(num).eq(0), 0);
  
  return ee.Image(previousImage2).addBands(currentImage);
}

function lastYearContinuityClass(year, previousImage2) {
  var currentImage = lastYearSelectRev.select(ee.Number(year).subtract(t0));
  previousImage2 = ee.Image(previousImage2);
  
  var num = ee.Number(year).subtract(t0);
  currentImage = currentImage.where(previousImage2.select(num).eq(0), 0);
  
  return ee.Image(previousImage2).addBands(currentImage);
}

/**
 * Remap image using polygons
 */
function remapWithPolygons(image, polygons) {
  if (polygons.length > 0) {
    polygons.forEach(function(polygon) {
      var excluded = polygon.map(function(layer) {
        var area = image.clip(layer);
        
        var from = ee.String(layer.get('from'))
          .split(',')
          .map(function(item) { return ee.Number.parse(item); });
        
        var to = ee.String(layer.get('to'))
          .split(',')
          .map(function(item) { return ee.Number.parse(item); });
        
        return area.remap(from, to)
          .clipToBoundsAndScale({
            geometry: layer.geometry(),
            scale: 30
          });
      });
      
      excluded = ee.ImageCollection(excluded).mosaic();
      image = excluded.unmask(image).rename('classification');
      image = image.mask(image.neq(0));
    });
  }
  
  return image;
}