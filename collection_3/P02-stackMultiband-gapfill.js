/**
 * @name
 *      P02-stackMultiband-gapfill.js
 * 
 * @description
 *      Script that performs gap filling for flooded areas classification
 *      by blending current classification with previous collection data.
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

var year = 2024; 
 
var regionId = 40203;

var inputCollection = 'clasificacion';

var outputCollection = 'clasificacion-ft';

var country = 'ECUADOR';

var inputVersion = 1;

var outputVersion = 2;

var classId = 6;

var overwrite = false;

var basePath = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION';

var mainCollectionPath = 'projects/mapbiomas-raisg/COLECCION6/INTEGRACION/mapbiomas_raisg_panamazonia_collection6_integration-0-2';

var regionsPath = 'users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-2';

/**
 * Stack images
 */
var region = ee.FeatureCollection(regionsPath)
  .filter(ee.Filter.eq('id_regionC', regionId));
  
var regionRaster = region
  .reduceToImage(['id_regionC'], ee.Reducer.first());

// Load current year classification
var lastYear = ee.Image(basePath + '/' + inputCollection + '/FLOODED-' + regionId + '-' + inputVersion)
  .select('classification_' + year);

// Load previous collection (Collection 6)
var collection6 = ee.Image(mainCollectionPath).updateMask(regionRaster);

// Extract and remap previous year's classification
var prevLastYear = collection6
  .select([collection6.bandNames().get(-1)])
  .remap([classId], [classId], 27)
  .rename(lastYear.bandNames());

prevLastYear = prevLastYear.where(prevLastYear.eq(1), classId);
  
// Blend current year with previous year data
var blendedLastYear = lastYear.unmask(prevLastYear);

print('Current year classification:', lastYear);

/**
 * Process all bands from previous collection
 */
collection6
  .bandNames()
  .evaluate(function(bands) {
    var output = ee.Image(27).updateMask(regionRaster);
    
    // Remap all bands from previous collection
    bands.forEach(function(band) {
      var selected = collection6.select(band);
      var remapped = selected
        .remap([classId], [classId], 27)
        .rename(band);
      
      output = band === 'classification_1985'
        ? remapped
        : output.addBands(remapped);
    });
    
    // Add the blended last year data
    output = output.addBands(blendedLastYear).byte();
    print('Output image:', output);
    
    /**
     * Display layers
     */
    Map.addLayer(
      prevLastYear.select('classification_' + year),
      {
        palette: 'cyan,lightgrey',
        min: 0,
        max: 27
      },
      'PREVIOUS FLOODED - ' + year,
      false
    );
    
    Map.addLayer(
      lastYear.select('classification_' + year),
      {
        palette: 'cyan,lightgrey',
        min: 0,
        max: 27
      },
      'ORIGINAL FLOODED - ' + year
    );
    
    Map.addLayer(
      output.select('classification_' + year),
      {
        palette: 'cyan,lightgrey',
        min: 0,
        max: 27
      },
      'FILLED FLOODED - ' + year
    );
    
    Map.addLayer(
      region,
      {},
      'REGION ' + regionId,
      false
    );
    
    /**
     * Export to Earth Engine Asset
     */
    var filename = 'FLOODED-' + regionId + '-' + outputVersion;
    
    if (overwrite) {
      ee.data.deleteAsset(basePath + '/' + outputCollection + '/' + filename);
    }
    
    Export.image.toAsset({
      image: output,
      description: filename,
      assetId: basePath + '/' + outputCollection + '/' + filename,
      scale: 30,
      pyramidingPolicy: {
        '.default': 'mode'
      },
      maxPixels: 1e13,
      region: region
    });
  });