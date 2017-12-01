var PairApiKey = "";
if( !PairApiKey )
    alert("Please set your API key at the top of js/main.js. You can get an API key by contacting contact@pair3d.com.");

// 1. Allow the user to select an image
// 2. Upload that image to the Pair server
// 3. While the server is processing show the interstitial
// 4. Once processing results are received, show button to enter visualizer
// 5. Show visualizer with selected image and camera info from server


// The data URI describing the image selected by the user
var backgroundImageData = null;

// The deep image scene information (camera pose + field of view) as returned after processing the user-submitted image
var serverSceneInfo = null;

var interstitialViewer = null;

// The ID of the interval to show image processing progress
var progressBarIntervalId;

var ModelBaseUri = "https://paircatalog.blob.core.windows.net/pair-public-catalog/deep-image-demo-models/chair/";

var getQueryStringParameter = function( parameterName )
{
    var fullQueryString = window.location.search.substring( 1 );
    var params = fullQueryString.split( "&" );

    var parameterValue = false;
    for ( var paramIndex = 0; paramIndex < params.length; ++paramIndex )
    {
        var curParameterName = params[paramIndex].substring( 0, params[paramIndex].indexOf( '=' ) );

        if ( curParameterName == parameterName )
            parameterValue = params[paramIndex].substring( params[paramIndex].indexOf( '=' ) + 1 );
    }

    return parameterValue;
};


// Invoked when the Pair server responds with the deep image scene info
function onDeepImageSceneReady( sceneInfo ) {

    var processingLabel = document.getElementById("processing-label");

    var visualizeButton = document.getElementById("visualize-button");

    if( !sceneInfo )
    {
        processingLabel.style.color = "#F00";
        processingLabel.innerHTML = "Processing failed due to server error";

        visualizeButton.disabled = null;
        //visualizeButton.style.backgroundColor = "red";
        visualizeButton.innerHTML = "use a different image";

        progressBarComplete( false );

        return;
    }

    if( sceneInfo.errors && sceneInfo.errors.length > 0 )
    {
        var errorMessage = "Processing failed due to:<br>";
        for( var i = 0; i < sceneInfo.errors.length; ++i )
            errorMessage += "- " + sceneInfo.errors[i].errorMessage + "<br>";

        processingLabel.style.color = "#F00";
        processingLabel.innerHTML = errorMessage;

        progressBarComplete( false );

        return;
    }

    serverSceneInfo = sceneInfo;

    progressBarComplete( true );

    processingLabel.style.display = "none";
    visualizeButton.disabled = null;
    //visualizeButton.style.backgroundColor = "green";
    visualizeButton.innerHTML = "configure in your space";
    visualizeButton.classList.remove('disable_me');
}

// Invoked when the user clicks the button to display the deep image scene
function onShowVisualizerClicked() {

    if( !serverSceneInfo )
    {
        window.location.reload();
        return;
    }

    // Hide the intersitital now that we're displaying the deep image
    interstitialViewer.close();
    interstitialViewer = null;

    document.getElementById("interstitial-panel").style.display = "none";
    document.getElementById("visualizer-panel").style.display = "block";

    // Display the deep image viewer using the user-selected image and server-provided scene info
    var deepImageViewer = new pair.DeepImageViewer("visualizer-viewer-panel");

    // Hook up our handler so we can add a cube after the scene is ready
    deepImageViewer.onVisualizerReadyCallback = function()
    {
        deepImageViewer.addModelFromBaseUri( ModelBaseUri, function( model )
        {
            deepImageViewer.createShadowPlaneForMesh( model );
        } );
    };

    deepImageViewer.init( serverSceneInfo, backgroundImageData );
}


// Parse the user-selected image from the <input> element into a data URI
function readImage (file) {

    var reader = new FileReader();

    // Once the image file is loaded, send it up to the server for processing and show our interstitial
    reader.addEventListener("load", function () {

        var image  = new Image();
        image.addEventListener("load", function () {

            // Hide the image picker and display the interstitial
            document.getElementById("image-picker-panel").style.display = "none";

            document.getElementById("interstitial-panel").style.display = "block";

            interstitialViewer = new pair.Interstitial("interstitial-viewer-panel");
            interstitialViewer.init();
            interstitialViewer.setModelFromBaseUri(ModelBaseUri);

            backgroundImageData = image.src;

            var onUploadProgress = function( uploadPercent )
            {
                if( uploadPercent < 1 )
                {
                    var percentString = "Uploading image: " + Math.floor( uploadPercent * 100 ).toString() + "% complete";
                    $("#processing-label").text( percentString );
                }
                else
                {
                    $("#processing-label").text( "Processing image..." );
                    progressBarStart();
                }
            };

            pair.retrieveDeepImageScene( backgroundImageData, PairApiKey, onDeepImageSceneReady, onUploadProgress );
        });

        image.src = reader.result;

    });

    // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
    reader.readAsDataURL(file);
};


function progressBarStart()
{
    var TotalTimeMillis = 15 * 1000;
    var StepSpeed = 33;
    var elapsedMillis = 0;

    var progressBarElem = document.getElementById("progress-bar");
    var width = 1;

    progressBarIntervalId = setInterval(progressBarTick, StepSpeed);

    function progressBarTick()
    {
        // Ideally we'd use actual clock time, but since this bar isn't important we can cheat
        elapsedMillis += StepSpeed;

        if (elapsedMillis >= TotalTimeMillis)
        {
            clearInterval(progressBarIntervalId);
            progressBarIntervalId = null;
        }
        else
        {
            var progressPercent = elapsedMillis * 90 / TotalTimeMillis; // Use 90 instead of 100 so the user doesn't get AS confused proccessing isn't done
            progressBarElem.style.width = progressPercent.toFixed(2).toString() + "%";
        }
    }
}

function progressBarComplete(wasSuccessful)
{
    clearInterval(progressBarIntervalId);
    progressBarIntervalId = null;

    var progressBarElem = document.getElementById("progress-bar");

    if( wasSuccessful )
        progressBarElem.style.width = "100%";
    else
        progressBarElem.style.backgroundColor = "red";
}

// Occurs when an image is selected
function onImageSelected(event)
{
    readImage( event.currentTarget.files[0] );
}
