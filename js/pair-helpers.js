// Create the Pair top-level namespace or use the existing one
var pair = pair || {};


/**
 * Determine if a string ends with another
 * @param {string} testString - The string to test for ending
 * @param {string} testSuffix - The ending to use for testing if testString ends with this value
 */
pair.endsWith = function( testString, testSuffix )
{
    return testString.lastIndexOf( testSuffix ) === testString.length - testSuffix.length;
};


/**
 * Determine if a string starts with another
 * @param {string} testString - The string to test for start
 * @param {string} testSuffix - The start string to use for testing if testString starts with this value
 */
pair.startsWith = function( testString, testPrefix )
{
    return testString.indexOf( testPrefix ) === 0;
};


/**
 * A 128x128 PNG image of a centerd black dot that has a smooth fade out to transparent at the edges
 * @private
 */
pair.blackDotImage = "data:image/png;base64,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";
    

/**
 * A 32x32 animated GIF of a loading spinner
 * @private
 */
pair.spinnerImage = "data:image/gif;base64,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";


pair.dataURItoBlob = function (dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
};



pair.DeepImageApiUri = "https://app.pair3d.com/api/Vision/DeepImageCamera";


pair.getOrientationFromDataUri = function( fileDataUri, callback )
{
    var fileBlob = pair.dataURItoBlob( fileDataUri );

    return pair.getOrientation( fileBlob, callback );
};

// From https://stackoverflow.com/a/32490603
/*
Returns: -2 not JPEG
-1 not defined
case 1:
    return RotateFlipType.RotateNoneFlipNone;
case 2:
    return RotateFlipType.RotateNoneFlipX;
case 3:
    return RotateFlipType.Rotate180FlipNone;
case 4:
    return RotateFlipType.Rotate180FlipX;
case 5:
    return RotateFlipType.Rotate90FlipX;
case 6:
    return RotateFlipType.Rotate90FlipNone;
case 7:
    return RotateFlipType.Rotate270FlipX;
case 8:
    return RotateFlipType.Rotate270FlipNone;
*/
pair.getOrientation = function(fileBlob, callback) {

  var reader = new FileReader();

  reader.onload = function(e) {

    var view = new DataView(e.target.result);
    if (view.getUint16(0, false) != 0xFFD8)
        return callback(-2);

    var length = view.byteLength, offset = 2;

    while (offset < length) {
      var marker = view.getUint16(offset, false);
      offset += 2;

      if (marker == 0xFFE1)
      {
        if (view.getUint32(offset += 2, false) != 0x45786966)
            return callback(-1);

        var little = view.getUint16(offset += 6, false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        var tags = view.getUint16(offset, little);
        offset += 2;

        for (var i = 0; i < tags; i++)
          if (view.getUint16(offset + (i * 12), little) == 0x0112)
            return callback(view.getUint16(offset + (i * 12) + 8, little));
      }
      else if ((marker & 0xFF00) != 0xFF00)
        break;
      else
        offset += view.getUint16(offset, false);
    }
    return callback(-1);
  };

  reader.readAsArrayBuffer(fileBlob);
}


pair.isOrientationRotated90 = function(orientationIndex)
{
    return orientationIndex === 5
            || orientationIndex === 6
            || orientationIndex === 7
            || orientationIndex === 8;
};


pair.DeepImageErrorCode_NoError = 0;
pair.DeepImageErrorCode_FileTooLarge = 1;
pair.DeepImageErrorCode_UnsupportedFileType = 2;
pair.DeepImageErrorCode_ImageDimensionTooSmall = 3;
pair.DeepImageErrorCode_ImageDimensionTooLarge = 4;
pair.DeepImageErrorCode_UnsupportedImageRatio = 5;
pair.DeepImageErrorCode_FailedPoseDetection = 6;


/**
 * 
 * @param {string} imageData - The base-64 data URI or URI of the image to send to the server for processing
 * @param {string} pairApiKey - The API key required when performing deep image processing
 * @param onReadyCallback - Invoked with the result of the server processing
 */
pair.retrieveDeepImageScene = function(imageData, pairApiKey, onReadyCallback, onUploadProgressCallback)
{
    if( !pairApiKey )
    {
        console.log( "You must set your Pair API key before processing a deep image." );
        return;
    }

    var imageBlob = pair.dataURItoBlob( imageData );

    var imageApiUri = pair.DeepImageApiUri + "?visionApiKey=" + pairApiKey;
    
    var formData = new FormData();
    formData.append("image", imageBlob);

    var onUploadProgress = function(evt)
    {
        if (evt.lengthComputable)
        {
            var percentComplete = evt.loaded / evt.total;

            if( onUploadProgressCallback )
                onUploadProgressCallback( percentComplete );
            //console.log(percentComplete);
        }
        else
        {
            // Unable to compute progress information since the total size is unknown
            //console.log('unable to complete');
        }
    };

    $.ajax({
        type: "POST",
        url: imageApiUri,
        data: formData,
        cache: false,
        processData: false,
        contentType: false,

        xhr: function() {  // custom xhr
            myXhr = $.ajaxSettings.xhr();
            
            if(myXhr.upload)
                myXhr.upload.addEventListener("progress", onUploadProgress, false); // for handling the progress of the upload
            
            return myXhr;
        },

        success: function (cameraDataResult) {
            //console.log(cameraDataResult);

            if( onReadyCallback )
                onReadyCallback( cameraDataResult );
        },

        error: function(jqXHR, errorMessage) {

            if( onReadyCallback )
                onReadyCallback( null );   
        }
    });
};


/**
 * A callback type that gets invoked after a model is added to the scene.
 *
 * @callback modelAddedCallback
 * @param {THREE.Mesh} addedModel - The model that was added to the scene
 */


 /**
 * A callback type that gets invoked during loading of a resource
 *
 * @callback progressCallback
 * @param {number} loadedPercent - A normalized (0-1) value to indicate how much of the resource has been loaded
 */


/**
 * Load the descriptive model info
 * @private
 */
pair.loadModelInfo = function( infoUri, onLoaded )
{
    var defaultSwatchOptions = [
        {
            swatchIndex: 0,
            name: "",
            mtlName: "model.mtl",
            textureFileName: null,
            thumbnailFileName: null
        }
    ];


    if( !window._pair_info_cache )
        window._pair_info_cache = {};


    if( window._pair_info_cache[infoUri] )
    {
        var cachedInfo = window._pair_info_cache[infoUri];
        cachedInfo = JSON.parse( cachedInfo );

        onLoaded( cachedInfo );

        return;
    }

    var jqxhr = $.getJSON( infoUri, function( modelInfo ) {
        //console.log( "success" );

        if( !modelInfo.swatchOptions || modelInfo.swatchOptions.length === 0 )
            modelInfo.swatchOptions = defaultSwatchOptions;

        window._pair_info_cache[infoUri] = JSON.stringify( modelInfo );

        onLoaded( modelInfo );
    })
    .fail(function() {
        //console.log( "error" );

        var defaultModelInfo = {
            swatchOptions:defaultSwatchOptions
        };

        window._pair_info_cache[infoUri] = JSON.stringify( defaultModelInfo );

        onLoaded( defaultModelInfo );
    });
};


/**
 * Load a model from a URI path. Uses the in-memory cache if the OBJ and MTL data is found
 * @param {modelAddedCallback} onMeshLoaded - An optional callback that gets invoked after the model is loaded
 * @param {progressCallback} onLoadProgress - An optional callback that gets invoked while the model's resources are downloaded
 */
pair.loadModelFromBaseUri = function(baseUri, mtlLoader, objLoader, onMeshLoaded, onLoadProgress, initialSwatchName)
{
	// Make sure there's a trailing slash on the URI
    if( !pair.endsWith( baseUri, "/" ) )
        baseUri += "/";

    var onMaterialLoaded = function( material, modelInfo )
    {
        if( onLoadProgress )
            onLoadProgress( 0.35 );

        // Material can be null if it failed to load
        if( material )
        {
            material.preload();

            objLoader.setMaterials( material );
        }

        var objProgressCallback = function( xmlHttpRequest )
        {
            // Info goes 0-0.1, MTL goes 0.1-.35, obj gets .35-1
            var percentLoaded = 0.35 + ((xmlHttpRequest.loaded / xmlHttpRequest.total) * 0.65 * 0.99); // Scale by 0.99 since we only want to call with 1 when we're ready

            if( onLoadProgress )
                onLoadProgress( percentLoaded );
        };

        // Load the mesh data
        var modelUri = baseUri + "model.obj";
        objLoader.load( modelUri, function( newMesh )
        {
            if( onLoadProgress )
                onLoadProgress( initialSwatchName ? 0.99 : 1 );

            newMesh.pairBaseUri = baseUri;
            newMesh.swatchOptions = modelInfo.swatchOptions;

            // Setup swatch functionality
            newMesh.activeSwatchIndex = 0;
            newMesh.setSwatchIndex = function(swatchIndex, onSetCallback)
            {
                this.replaceSwatchTexture( swatchIndex, onSetCallback );
            };


            newMesh.setSwatchByName = function( swatchName, onSetCallback )
            {
                for( var i = 0; i < this.swatchOptions.length; ++i )
                {
                    var curSwatch = this.swatchOptions[i];

                    if( curSwatch.name === swatchName )
                    {
                        this.replaceSwatchTexture( i, onSetCallback );
                        return;
                    }
                }

                // We failed to find a swatch option by that name
                console.log( "Unabled to find swatch option with name '" + swatchName + "'" );

                if( onSetCallback )
                    onSetCallback( false );
            };
            

            newMesh.replaceSwatchTexture = function( swatchIndex, onSetCallback )
            {
                if( swatchIndex < 0 || swatchIndex >= this.swatchOptions.length )
                {
                    console.log("Invalid swatch index: " + swatchIndex);
                    return;
                }

                var previousSwatch = this.swatchOptions[ this.activeSwatchIndex ];

                this.activeSwatchIndex = swatchIndex;
                var activeSwatch = this.swatchOptions[ swatchIndex ];

                var newTextureUri = this.pairBaseUri + activeSwatch.textureFileName;

                var innerMesh = this;
                THREE.ImageUtils.crossOrigin = "";

                var onTextureLoaded = function(newTexture)
                {
                    var expectedTexturePrefix = previousSwatch.textureFileName;

                    // Loop through the meshes and updated the texture
                    innerMesh.traverse( function ( child ) {

                        if ( child instanceof THREE.Mesh ) {

                            if( child.material && child.material.pairIsSwatchMaterial )
                            {
                                child.material.map = newTexture;
                                child.material.needsUpdate = true;
                            }
                        }
                    } );

                    if( innerMesh.pairViewer )
                        innerMesh.pairViewer.render();

                    // If we're using the standard swatch UI then update the border
                    if( activeSwatch.buttonDomElem )
                        activeSwatch.buttonDomElem.style.border = "solid 5px #0FA";

                    if( onSetCallback )
                        onSetCallback( true );
                };

                var onTextureLoadFailed = function(xhr)
                {
                    if( onSetCallback )
                        onSetCallback( false );
                };

                var textureLoader = new THREE.TextureLoader();
                textureLoader.crossOrigin = true;
                textureLoader.load( newTextureUri, onTextureLoaded, function(){/*Progress*/}, onTextureLoadFailed );
            };

            // If we've been passed the name of a swatch value for the initial display
            if( initialSwatchName )
            {
                newMesh.setSwatchByName( initialSwatchName, function()
                {
                    if( onLoadProgress )
                        onLoadProgress( 1 );

                    if( onMeshLoaded )
                        setTimeout( function(){ onMeshLoaded( newMesh ); }, 1 ); // Place this in a setTimeout in case all resources were cached and loaded instantaly which is too fast for some logic
                } );
            }
            else
            {
                if( onMeshLoaded )
                    setTimeout( function(){ onMeshLoaded( newMesh ); }, 1 ); // Place this in a setTimeout in case all resources were cached and loaded instantaly which is too fast for some logic
            }

        }, objProgressCallback, function() { console.log("Failed to load: " + baseUri); } );
    };


    var mtlProgressCallback = function( xmlHttpRequest )
    {
        // Info goes 0-0.1, MTL goes 0.1-.35, obj gets .35-1
        var percentLoaded = 0.1 + ((xmlHttpRequest.loaded / xmlHttpRequest.total) * 0.25);

        if( onLoadProgress )
            onLoadProgress( percentLoaded );
    };

    var onModelInfoLoaded = function( modelInfo )
    {
        if( onLoadProgress )
            onLoadProgress( 0.1 );

        // Load the material information
        mtlLoader.setPath( baseUri );
        mtlLoader.load( "model.mtl", function( materials )
        {
            // The material loaded
            onMaterialLoaded( materials, modelInfo );

        }, mtlProgressCallback, function() {

            // The material failed to load
            onMaterialLoaded( null, modelInfo );
        } );
    };


    var infoJsonUri = baseUri + "model-info.json";

    pair.loadModelInfo( infoJsonUri, onModelInfoLoaded );
};

// Tell ThreeJS to cache textures
if( typeof(THREE) !== "undefined" && THREE.Cache )
    THREE.Cache.enabled = true;


pair.preloadModelFromBaseUri = function(baseUri, onLoadProgress, initialSwatchName)
{
    var objLoader = new THREE.PairOBJLoader();
    var mtlLoader = new THREE.PairMTLLoader();
    mtlLoader.setCrossOrigin( true );
    
    pair.loadModelFromBaseUri(baseUri, mtlLoader, objLoader, null, onLoadProgress, initialSwatchName);
};