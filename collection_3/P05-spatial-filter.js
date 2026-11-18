/**
 * @name
 *      P05-spatial-filter.js
 * 
 * @description
 *      Script that applies spatial filtering to flooded areas classification,
 *      removing isolated pixels based on connected component analysis.
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
  country: 'ECUADOR',
  regionId: 40205,
  cover: 'FLOODED',
  collectionId: 'COLLECTION6',
  inputCollection: 'clasificacion-ft',
  minConnectedPixels: 20,
  years: [
    1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996,
    1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008,
    2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
    2021, 2022, 2023, 2024
  ],
  yearsPreview: [2024],
  inputVersion: 5,
  outputVersion: 6,
};

// params
var country = param.country;
var regionId = param.regionId;
var cover = param.cover;
var inputVersion = param.inputVersion;
var outputVersion = param.outputVersion;
var yearsPreview = param.yearsPreview;
var collectionId = param.collectionId;
var inputCollection = param.inputCollection;
var optionalFilters = param.optionalFilters;
var minConnectedPixels = param.minConnectedPixels;
var eightConnected = true;
var years = param.years;

// inputs
var fullRegion = cover + '-' + regionId;

var inputDir = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/' + inputCollection;

var outputDir = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/clasificacion-ft/';

var classification = ee.Image(inputDir + '/' + fullRegion + '-' + inputVersion);

var image = classification;

print('Input classification:', image);

// Load region of interest
var regions = ee.FeatureCollection('users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-2')
  .filter(ee.Filter.eq('id_regionC', regionId));

var regionRaster = regions
  .map(function(item) { return item.set('version', 1); })
  .reduceToImage(['version'], ee.Reducer.first());

// Get band names list
var bandNames = ee.List(
  years.map(function(year) {
    return 'classification_' + String(year);
  })
);

// Prepare image with masked bands
var classif = ee.Image();
var bandnameReg = image.bandNames();
var bands = bandnameReg.getInfo();

if (bands[0] === 'constant') {
  bands = bands.slice(1);
}

bands.forEach(function(bandName) {
  var yearImage = image.select(bandName);
  var band0 = yearImage.updateMask(yearImage.unmask().neq(0));
  classif = classif.addBands(band0.rename(bandName));
});

image = classif.select(bands).unmask().updateMask(regionRaster);

// Generate a histogram dictionary of [bandNames, image.bandNames()]
var bandsOccurrence = ee.Dictionary(
  bandNames
    .cat(image.bandNames())
    .reduce(ee.Reducer.frequencyHistogram())
);

// Insert a masked band
var bandsDictionary = bandsOccurrence.map(function(key, value) {
  var output = ee.Image(
    ee.Algorithms.If(
      ee.Number(value).eq(2),
      image.select([key]),
      ee.Image(27).rename([key])
    )
  );
  
  return output.byte();
});

// Convert dictionary to image
var allBandsImage = ee.Image(
  bandNames.iterate(
    function(band, image) {
      var newImage = ee.Image(bandsDictionary.get(ee.String(band)))
        .remap([0, 6], [27, 6], 27)
        .rename(ee.String(band));
      return ee.Image(image)
        .addBands(newImage)
        .updateMask(regionRaster);
    },
    ee.Image().select()
  )
);

var classificationImage = allBandsImage;

/**
 * Spatial filter
 * Calculate connected pixel count and filter isolated pixels
 */
var imageWithConnected = classificationImage.addBands(
  classificationImage
    .connectedPixelCount(100, eightConnected)
    .rename(bandNames.map(
      function(band) {
        return ee.String(band).cat('_connected');
      }
    ))
);

var filteredResult = ee.Image(0).updateMask(regionRaster);

years.forEach(function(year) {
  var imageBand = imageWithConnected.select('classification_' + year);
  var connectedBand = imageWithConnected.select('classification_' + year + '_connected');
  
  // Calculate mode filter and mask pixels below threshold
  var mode = imageBand
    .focal_mode(1, 'square', 'pixels')
    .mask(connectedBand.lte(minConnectedPixels));
  
  var filteredYear = imageBand.blend(mode);
  
  filteredResult = filteredResult.addBands(filteredYear);
  
  return filteredResult;
});

/**
 * Visualizations
 */
Map.setOptions('SATELLITE');

var palette = require('users/mapbiomas/modules:Palettes.js').get('classification2');

filteredResult = filteredResult
  .select(bandNames)
  .updateMask(regionRaster);

var reprojected = filteredResult.reproject({
  crs: 'EPSG:4326',
  scale: 30
});

yearsPreview.forEach(function(year) {
  var selector = 'classification_' + year;
  
  var vis = {
    'bands': [selector],
    'min': 0,
    'max': 34,
    'palette': palette,
    'format': 'png'
  };
  
  Map.addLayer(
    classificationImage.select(selector),
    vis,
    'ORIGINAL ' + year,
    false
  );
  
  Map.addLayer(
    reprojected.select(selector),
    vis,
    'FILTERED ' + year,
    false
  );
});

/**
 * Export to Earth Engine Asset
 */
var imageName = fullRegion + '-' + outputVersion;

filteredResult = filteredResult
  .select(bandNames)
  .byte()
  .set({
    code_region: regionId,
    country: country,
    version: outputVersion.toString(),
    description: 'spatial filter',
    cover: cover
  });

print('INPUT: ' + fullRegion + '-' + inputVersion, image);
print('OUTPUT: ' + imageName, filteredResult);

Export.image.toAsset({
  'image': filteredResult,
  'description': imageName,
  'assetId': outputDir + imageName,
  'pyramidingPolicy': {
    '.default': 'mode'
  },
  'region': regions.geometry().bounds(),
  'scale': 30,
  'maxPixels': 1e13
});