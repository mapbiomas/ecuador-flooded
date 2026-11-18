/**
 * @name
 *     P01-classification.js
 * 
 * @description
 *      Script that performs classification for flooded cross-cutting theme
 *      using Random Forest classifier with spectral indices and terrain data.
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
 *      2025
 */

/**
 * Geometries Import
 */
var id_27 = /* color: #b1b1b1 */ee.Feature(
        ee.Geometry.MultiPolygon(
            [[[[-75.52255004934366, -1.0442604365233428],
               [-75.51980346731241, -1.043230639155246],
               [-75.51611274770792, -1.0430590062277887],
               [-75.51611274770792, -1.041342676438614],
               [-75.51679939321573, -1.0400554284833472],
               [-75.51782936147745, -1.0418575754735604],
               [-75.51963180593546, -1.0423724744243619],
               [-75.5228075414091, -1.0434022720733398]]],
             [[[-75.51843017629679, -1.037051847880414],
               [-75.51516861013468, -1.0378241974508655],
               [-75.51439613393839, -1.0371376645086727],
               [-75.5132803349882, -1.0358504148407155],
               [-75.51525444082316, -1.0364511314175284],
               [-75.51740020803507, -1.0365369480620716]]]]),
        {
          "id": 27,
          "system:index": "0"
        }),
    geometry = /* color: #d16cd6 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-77.1603609232279, -0.263974262565448],
                  [-77.15624105018102, -0.33126461063263524],
                  [-77.1332384256693, -0.35975988079241167],
                  [-77.0889497904154, -0.381732076906861],
                  [-77.07041036170446, -0.3769256636917071],
                  [-77.06320058387243, -0.363879671691392],
                  [-77.02783834022009, -0.3738358252219989],
                  [-77.00758229773962, -0.3848219125573129],
                  [-77.00414907020055, -0.3734925097691964],
                  [-77.02955495398962, -0.3425940656006392],
                  [-77.05221425574743, -0.32783143988300556],
                  [-77.07521688025915, -0.3371009981707656],
                  [-77.07933675330602, -0.3024259405697394],
                  [-77.09272634070837, -0.26260098604917254],
                  [-77.16276418250524, -0.26088439019177745]]]),
            {
              "from": "27,6,",
              "to": "0,0,",
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-76.53456057439398, -2.3557453086839897],
                  [-76.53464640508246, -2.3594329042898483],
                  [-76.51988352666449, -2.3743547027827745],
                  [-76.48932780156683, -2.3744404597806583],
                  [-76.4879545105512, -2.3598616938422183],
                  [-76.53378809819769, -2.352915286828979]]]),
            {
              "from": "27,6,",
              "to": "0,0,",
              "system:index": "1"
            })]),
    remap = /* color: #d16cd6 */ee.FeatureCollection(
        [ee.Feature(
            ee.Geometry.Polygon(
                [[[-77.1603609232279, -0.263974262565448],
                  [-77.15624105018102, -0.33126461063263524],
                  [-77.1332384256693, -0.35975988079241167],
                  [-77.0889497904154, -0.381732076906861],
                  [-77.07041036170446, -0.3769256636917071],
                  [-77.06320058387243, -0.363879671691392],
                  [-77.02783834022009, -0.3738358252219989],
                  [-77.00758229773962, -0.3848219125573129],
                  [-77.00414907020055, -0.3734925097691964],
                  [-77.02955495398962, -0.3425940656006392],
                  [-77.05221425574743, -0.32783143988300556],
                  [-77.07521688025915, -0.3371009981707656],
                  [-77.07933675330602, -0.3024259405697394],
                  [-77.09272634070837, -0.26260098604917254],
                  [-77.16276418250524, -0.26088439019177745]]]),
            {
              "from": "27,6,",
              "to": "0,0,",
              "system:index": "0"
            }),
        ee.Feature(
            ee.Geometry.Polygon(
                [[[-76.53456057439398, -2.3557453086839897],
                  [-76.53464640508246, -2.3594329042898483],
                  [-76.51988352666449, -2.3743547027827745],
                  [-76.48932780156683, -2.3744404597806583],
                  [-76.4879545105512, -2.3598616938422183],
                  [-76.53378809819769, -2.352915286828979]]]),
            {
              "from": "27,6,",
              "to": "0,0,",
              "system:index": "1"
            })]),
    id_6 = /* color: #d63000 */ee.Feature(
        ee.Geometry.MultiPolygon(
            [[[[-76.00187033447415, -1.6110564326419137],
               [-76.00229948791653, -1.6101126680597981],
               [-76.0035011175552, -1.609941074452457],
               [-76.00478857788235, -1.610284261652687],
               [-76.00530356201321, -1.6112280261553396],
               [-76.00418776299071, -1.6134587412347168]]],
             [[[-76.95121042494569, -1.9138918586708604],
               [-76.95236913924012, -1.9131198132283171],
               [-76.95271246199403, -1.9124764417607532],
               [-76.95339910750184, -1.9120046358645515],
               [-76.95395700697694, -1.91187596150671],
               [-76.95498697523865, -1.91187596150671],
               [-76.95554487471375, -1.912690898943422],
               [-76.95541612868104, -1.9135058359930353],
               [-76.95361368422303, -1.914835469295186],
               [-76.95249788527283, -1.9147925779144443],
               [-76.95151083235535, -1.9144065554394367]]]]),
        {
          "id": 6,
          "system:index": "0"
        }),
    include = /* color: #3ac5ff */ee.Feature(
        ee.Geometry.MultiPolygon(
            [[[[-76.97290758944266, -1.8764346850435731],
               [-76.96020464754812, -1.885184698777265],
               [-76.94218020296805, -1.8944493712573505],
               [-76.92947726107352, -1.9014836265412405],
               [-76.91900591707937, -1.9095472497595303],
               [-76.89909319735281, -1.9258459469528328],
               [-76.89488750939195, -1.9313360017514907],
               [-76.88948016024344, -1.9363113440961832],
               [-76.88553194857352, -1.9361397807286527],
               [-76.88415865755789, -1.9327085097334942],
               [-76.89445834017508, -1.9215568311735052],
               [-76.9064746365618, -1.9105766457482165],
               [-76.91934923983328, -1.9002826581536352],
               [-76.93153719759695, -1.892218991661227],
               [-76.9536815152239, -1.8820964636477027],
               [-76.96707110262625, -1.875233699345023],
               [-76.97119097567312, -1.8754052687810008]]],
             [[[-76.95707639337932, -1.5458664620417433],
               [-76.9531281817094, -1.5511860212916766],
               [-76.94609006525432, -1.551700816639077],
               [-76.93767865778362, -1.5492984372798992],
               [-76.93218549372112, -1.550328028767689],
               [-76.91776593805706, -1.5438072742351174],
               [-76.90832456232464, -1.5383160970068426],
               [-76.89476331354534, -1.5398604920329664],
               [-76.88154538751995, -1.5378012984163194],
               [-76.8729623186723, -1.5333397054346403],
               [-76.87382062555706, -1.527162099804985],
               [-76.87811215998089, -1.5263040976170095],
               [-76.88103040338909, -1.5317953056959268],
               [-76.88824018122112, -1.5317953056959268],
               [-76.89665158869182, -1.531623705656219],
               [-76.9007714617387, -1.52990770450362],
               [-76.9062646258012, -1.526990499394781],
               [-76.90695127130901, -1.5312805055355836],
               [-76.91364606501018, -1.5321385057341095],
               [-76.91896756769573, -1.535570503089652],
               [-76.9285806048051, -1.5412332866722949],
               [-76.9333871233598, -1.541919683660151],
               [-76.94059690119182, -1.541919683660151],
               [-76.94712003351604, -1.5450084673648765],
               [-76.95209821344768, -1.5407184887862138],
               [-76.95879300714886, -1.5362569018998513],
               [-76.96651776911175, -1.5352273036018833],
               [-76.97441419245159, -1.523386887618271],
               [-76.98248227716839, -1.5214992790431463],
               [-76.9857438433305, -1.5214992790431463],
               [-76.99175199152386, -1.5197832698141522],
               [-76.99913343073284, -1.519611668816245],
               [-77.01475461603557, -1.524244890969452],
               [-77.0157845842973, -1.5336829052252867],
               [-76.99913343073284, -1.5292213036581455],
               [-76.9883187639848, -1.5293929038900986],
               [-76.97750409723675, -1.534026104960897],
               [-76.97458585382854, -1.5407184887862138],
               [-76.97063764215862, -1.54346407607336],
               [-76.96222623468792, -1.543635675161166],
               [-76.958278023018, -1.54346407607336]]]]),
        {
          "system:index": "0"
        });
/**
 * Parameters
 */

var country            = 'ECUADOR';

var regionId           = 40203;

var mosaicRegions      = [402];

var preview            = [2023, 2024];

var version            = 1;

var classId            = 6;  

var remapAreas         = [remap];

var includeAreas       = [include];

var additionalSamples  = {
  polygons: [id_6, id_27],
  classes:  [6, 27],
  points:   [3500, 2000]
};

var years              = [
  2022, 2023, 2024
];

var featurespace       = [
  // altitude
  "altitude",
  "slope",
  
  // spectral
  "mndwi_median",
  "ndsi_median",
  "gcvi_median",
  "ndwi_mcfeeters_median",
  "gcvi_wet",
  "mndwi_wet",
  "mndwi_max",
  "ndsi_min",
  "ndvi_median",
  "ndvi_wet",
  "ndbi_median",
  "ndsi2_median",
  "ndwi_gao_median",
  "ndmi_median",
  "mndwi_dry",
  "ndmir_median",
  "mmri_median",
  "cai_median",
  "red_wet_max",
  "savi_median",
  "red_wet",
  "evi2_median",
  "clay_median",
  "gcvi_dry",
  "ndmir_wet",
  "ndfib_median",
  "ndbi_max",
  "ndsi2_max",
  "green_wet_qmo",
  "green_median",
  "red_median",
  "ndwi_gao_dry",
  "ndmir_max",
  "ndmi_dry",
  "ndsi2_dry",
  "cai_wet_min",
  "ndrb_wet",
  "ndbi_dry",
  "red_min",
  "ndwi_gao_wet_min",
  "gvs_median",
  "cai_min",
  "gv_median",
  "ndwi_gao_dry_min",
  "ndvi_dry",
  "savi_dry",
  
  // tcap
  "brightness", 
  "greeness",
  "wetness",
];

/**
 * Asset locations, paths and visualization configuration
 */
var collectionId = 'COLLECTION2';

var altitudePath = 'JAXA/ALOS/AW3D30_V1_1';

var commonPath   = 'projects/mapbiomas-raisg';

var mosaicsPath  = commonPath + '/MOSAICOS/mosaics-2';

var slpposPath   = commonPath + '/MOSAICOS/slppost2_30_v1';

var samplesPath  = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE';

var type         = classId === 6 ? 'forest' : 'non-forest';

var stablePath   = commonPath + '/DATOS_AUXILIARES/RASTERS/stables-' + type + '-wetlands-4';

var accumulPath  = commonPath + '/DATOS_AUXILIARES/RASTERS/accumulated-' + type + '-wetlands-4';

var roiPath      = samplesPath + '/STEP01-ROIS/' + regionId + '-1';

var outputPath   = 'projects/mapbiomas-ecuador/assets/MAPBIOMAS-LULC/COLLECTION3/CROSS_CUTTING_THEMES/FLOODABLE/STEP03-CLASSIFICATION/classification';

var vMGRegions   = commonPath + '/DATOS_AUXILIARES/VECTORES/clasificacion-regiones-4';

var vRegionsPath = 'users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-2';

var rRegionsPath = 'users/Mosaico_Clasification/MAPBIOMAS-ECUADOR/REGIONES/clasificacion-regiones-inundables-raster-2';

var col4Path     = commonPath + 'COLLECTION6/INTEGRATION/mapbiomas_raisg_panamazonia_collection6_integration-0-2';

var palette      = require('users/mapbiomas/modules:Palettes.js').get('classification6');

// Visualization parameters
var referenceVis = { min: 0, max: 49, palette: palette };

var mosaicbands  = ['swir1_median', 'nir_median', 'red_median'];

var mosaicVis    = { bands: mosaicbands, min: 100, max: 4500 };

var pointsVis    = { styleProperty: "style", width: 0.5 };

/**
 * Assets loading
 */
var mosaicreg   = parseInt(regionId.toString().slice(0, 3), 10);
 
var mosaics     = ee.ImageCollection(mosaicsPath);
 
var stables     = ee.Image(stablePath);

var accumulated = ee.Image(accumulPath);

var vRegions    = ee.FeatureCollection(vRegionsPath);

var mgRegions   = ee.FeatureCollection(vMGRegions);

var rRegions    = ee.Image(rRegionsPath).rename('regionid');

var collection4 = ee.Image(col4Path);

var region      = getRegion(vRegions, rRegions, regionId);

var roi         = ee.Image(roiPath);

var reference   = getReference(roi, region.vector, stables, accumulated);

roi             = includeNewArea(roi, includeAreas);

roi             = spatialFilter(roi, 8);

/**
 * Function to include new areas to the ROI mask
 */
function includeNewArea(image, included) {
    if (included && included.length > 0) {
        var includedAreas = ee.FeatureCollection(included)
            .map(function(item) { return item.set('version', 1); })
            .reduceToImage(['version'], ee.Reducer.first())
            .rename('constant')
            .byte();
      
        return ee.ImageCollection([image, includedAreas]).mosaic().byte();
    } else {
        return image;
    }
}

/**
 * Display region on map
 */
Map.addLayer(
    region.vector,
    {
        color: 'black',
        fillColor: '000000cc',
        width: 1
    },
    'REGION ' + regionId
);
 
/**
 * Main processing loop
 */
ee.List(years)
    .evaluate(function(years) {
        var classified = ee.Image(27).updateMask(roi);
        
        years.forEach(function(year) {
            var yearMosaic  = getMosaic(mosaics, mgRegions, year, []);
            var selected = yearMosaic.select(featurespace).updateMask(roi);
            
            var bands = selected.bandNames();
            var nBands = bands.size();
            
            var assetId = samplesPath + '/STEP02-SAMPLES/FLOODED-' + regionId + '-' + year + '-1';
            
            var trainingSamples = ee.FeatureCollection(
                ee.Algorithms.If(
                    ee.Algorithms.IsEqual(nBands, 0),
                    null,
                    ee.FeatureCollection(assetId)
                )
            );
    
            // Get the number of classes in samples
            var nClassSamples = trainingSamples
                .reduceColumns(ee.Reducer.toList(), ['reference'])
                .get('list');
              
            nClassSamples = ee.List(nClassSamples).reduce(ee.Reducer.countDistinct());
      
            // Add additional samples
            if (additionalSamples.polygons.length > 0) {
                var newSamples = resampleCover(selected, additionalSamples);
                trainingSamples = trainingSamples.merge(newSamples);
            }
    
            // Random Forest Classifier
            var classifier = ee.Classifier.smileRandomForest({
                numberOfTrees: 50, 
                variablesPerSplit: 1
            });
          
            classifier = ee.Classifier(
                ee.Algorithms.If(
                    ee.Algorithms.IsEqual(nBands, 0),
                    null, 
                    ee.Algorithms.If(
                        ee.Algorithms.IsEqual(nClassSamples, 1),
                        null,
                        classifier.train(trainingSamples, 'reference', bands)
                    )
                )
            );
          
            var name = 'classification_' + year;
          
            classified = ee.Image(
                ee.Algorithms.If(
                    ee.Algorithms.IsEqual(nBands, 0),
                    classified.addBands(ee.Image().updateMask(roi).rename(name)),
                    ee.Algorithms.If(
                        ee.Algorithms.IsEqual(nClassSamples, 1),
                        classified.addBands(ee.Image().updateMask(roi).rename(name)),
                        classified.addBands(
                            remapWithPolygons(
                                spatialFilter(selected.classify(classifier), 8),
                                remapAreas
                            )
                            .select(['reference'], [name])
                        )
                    )
                )
            );
        });
      
        // Export classification to asset
        Export.image.toAsset({
            image: classified
                .slice(1)
                .set({
                    country: country,
                    region: regionId,
                    version: version,
                }),
            description: 'FLOODED-' + regionId + '-' + version,
            assetId: outputPath + '/FLOODED-' + regionId + '-' + version,
            pyramidingPolicy: {
              '.default': 'mode'
            },
            region: region.vector.geometry().bounds(),
            scale: 30,
            crs: 'EPSG:4326',
            maxPixels: 1e13
        });
      
        // Visualization
        preview.forEach(function(yr) {
            var yearMosaic  = getMosaic(mosaics, mgRegions, yr, []);
        
            Map.addLayer(
                yearMosaic.clip(region.vector),
                mosaicVis,
                'MOSAIC - ' + yr,
                false
            );
        
            if (yr < 2023) {
                Map.addLayer(
                    collection4
                        .clip(region.vector)
                        .select('classification_' + yr)
                        .eq(6).selfMask().multiply(6),
                    referenceVis,
                    'COLLECTION 5 - ' + yr,
                    false
                );
            }
        
            Map.addLayer(
                classified.select('classification_' + yr).clip(region.vector),
                referenceVis,
                'COLLECTION 6 - ' + yr,
                false
            );
        });
    });

/**
 * Get reference image from stable and accumulated pixels
 */
function getReference(roi, region, stables, accumulated) {
    stables     = stables.clip(region);
    accumulated = accumulated.clip(region);
    roi         = roi.clip(region);
    
    var reference = roi
        .where(stables.eq(1).and(accumulated.eq(1)), 6)
        .where(stables.eq(0).and(accumulated.eq(1)), 0);
    
    reference = reference.remap([0, 1, 6], [0, 27, 6], 0);
    
    return reference
        .updateMask(reference.neq(0))
        .rename('reference');
}

/**
 * Get mosaic for a specific year with all derived bands
 */
function getMosaic(mosaics, regions, year, variables) {
    // Terrain data
    var slppost = ee.Image(slpposPath);
    var altitude = ee.Image(altitudePath).select('AVE').rename('altitude');
    var slope = ee.Terrain.slope(altitude).int8().rename('slope');
    
    var getMndwi = function(image) {
        var mndwi = image.expression(
            '(GREEN - SWIR1) / (GREEN + SWIR1)',  
            {
                GREEN: image.select('green_median'),
                SWIR1: image.select('swir1_median')
            }
        )
        .multiply(100).add(100).byte()
        .rename('mndwi_median');
      
        return image.addBands(mndwi);
    };
    
    var getMmri = function(image) { 
        var mmri = image.expression(
            '(MNDWI - NDVI) / (MNDWI + NDVI)',  
            {
                MNDWI: image.select('mndwi_median'),
                NDVI: image.select('ndvi_median')
            }
        )
        .multiply(100).add(100).byte()
        .rename('mmri_median');
        
        return image.addBands(mmri);
    };
    
    var getClay = function(image) {
        var clay = image.expression(
            '(SWIR1 / SWIR2)',  
            {
                SWIR1: image.select('swir1_median'),
                SWIR2: image.select('swir2_median') 
            }
        )
        .multiply(100).add(100).int16()
        .rename('clay_median');
        
        return image.addBands(clay);    
    };
    
    var tasseledCap = function(image) {
        var sensor = ee.String(image.get('satellite')).slice(1);
        
        var landsatBands = {
            BLUE: image.select('blue_median'),
            GREEN: image.select('green_median'),
            RED: image.select('red_median'),
            NIR: image.select('nir_median'),
            SWIR1: image.select('swir1_median'),
            SWIR2: image.select('swir2_median'),
        };
        
        var brightness = ee.Image(
            ee.Algorithms.If(
                ee.Algorithms.IsEqual(sensor, '8'),
                // Landsat 8
                image.expression(
                    '(BLUE * 0.3029) + (GREEN * 0.2786) + (RED * 0.4733) +\
                     (NIR * 0.5599) + (SWIR1 * 0.508) + (SWIR2 * 0.1872)',
                    landsatBands
                ),
                // Landsat 5, 7, X
                image.expression(
                    '(BLUE * 0.3037) + (GREEN * 0.2793) + (RED * 0.4743) +\
                     (NIR * 0.5585) + (SWIR1 * 0.5082) + (SWIR2 * 0.1863)',
                    landsatBands
                )
            )
        ).rename('brightness').toInt16();
        
        var greeness = ee.Image(
            ee.Algorithms.If(
                ee.Algorithms.IsEqual(sensor, '8'),
                // Landsat 8
                image.expression(
                    '-(BLUE * 0.2941) - (GREEN * 0.243) - (RED * 0.5424) +\
                     (NIR * 0.7276) + (SWIR1 * 0.0713) - (SWIR2 * 0.1608)',
                    landsatBands
                ),
                // Landsat 5, 7, X
                image.expression(
                    '-(BLUE * 0.2848) - (GREEN * 0.2435) - (RED * 0.5436) +\
                     (NIR * 0.7243) + (SWIR1 * 0.0840) - (SWIR2 * 0.1800)',
                    landsatBands
                )
            )
        ).rename('greeness').toInt16();
        
        var wetness = ee.Image(
            ee.Algorithms.If(
                ee.Algorithms.IsEqual(sensor, '8'),
                // Landsat 8
                image.expression(
                    '(BLUE * 0.1511) + (GREEN * 0.1973) + (RED * 0.3283) +\
                     (NIR * 0.3407) - (SWIR1 * 0.7117) - (SWIR2 * 0.4559)',
                    landsatBands
                ),
                // Landsat 5, 7, X
                image.expression(
                    '-(BLUE * 0.1509) + (GREEN * 0.1973) + (RED * 0.3279) +\
                     (NIR * 0.3406) - (SWIR1 * 0.7112) - (SWIR2 * 0.4572)',
                    landsatBands
                )
            )
        ).rename('wetness').toInt16();
        
        return image
            .addBands(brightness)
            .addBands(greeness)
            .addBands(wetness);
    };
    
    // Build mosaic with all derived bands
    var joinedMosaics = mosaics
        .filter(ee.Filter.and(ee.Filter.eq('year', year)))
        .map(getMndwi)
        .map(getMmri)
        .map(getClay)
        .map(tasseledCap)
        .map(function(image) {
            return image.addBands([slppost, altitude, slope]);
        });
    
    return joinedMosaics.median();
}

/**
 * Get region from vector and raster
 */
function getRegion(vector, raster, regionId) {
    var region = vector.filter(ee.Filter.eq('id_regionC', regionId));
    var image = raster.clip(region).rename('regionid');
    
    return {
        vector: region,
        raster: image
    };
}

/**
 * Apply spatial filter based on connected pixel count
 */
function spatialFilter(image, minMappingUnit) {
    var connectedPixels = image.connectedPixelCount(minMappingUnit, false);
    return image.updateMask(connectedPixels.gte(minMappingUnit));
}

/**
 * Resample additional samples from polygons
 */
function resampleCover(mosaic, additionalSamples) {
    var polygons = additionalSamples.polygons,
        classIds = additionalSamples.classes,
        points = additionalSamples.points,
        newSamples = [];
    
    polygons.forEach(function(polygon, i) {
        var newSample = mosaic.sample({
            numPixels: points[i],
            region: polygon.geometry(),
            scale: 30,
            projection: 'EPSG:4326',
            seed: 1,
            geometries: true,
            tileScale: 16
        })
        .map(function(item) { return item.set('reference', classIds[i]); });
        
        newSamples.push(newSample);
    });
    
    return ee.FeatureCollection(newSamples).flatten();
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
                
                return area.remap(from, to);
            });
            
            excluded = ee.ImageCollection(excluded).mosaic();
            image = excluded.unmask(image).rename('reference');
            image = image.mask(image.neq(0));
        });
    }
    
    return image;
}