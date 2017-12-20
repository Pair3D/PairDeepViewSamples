// Create the Pair top-level namespace or use the existing one
var pair = pair || {};


/**
 * The viewer class that contains the logic for viewing a Pair deep image.
 * @class
 * @param {string} viewerDomElementId - The ID of the DOM element in which we'll create the visualizer. The visualizer will try to fit within this element as large as possible without overflow.
 * @example
 * // Create a visualizer using the built-in demo room image and camera data
 * var viewer = new pair.DeepImageViewer("visualizer-panel");
 * viewer.initUsingDemo();
 * @example
 * // 
 * var viewer = new pair.DeepImageViewer("visualizer-panel");
 * viewer.init(deepImageCameraInfoFromServer);
 */
pair.DeepImageViewer = function( viewerDomElementId )
{
    /** The THREE.Object3D object that responds to input events like move and rotate */
    this.selectedMesh = null;
    
    /** The list of THREE.AmbientLight, THREE.PointLight, or THREE.DirectionalLight objects are active within the scene. Kept in a seperate list so we can quickly remove them from the scene to change lighting. */
    this.activeLights = [];

    /** The background image width, in pixels */
    this.imageWidth = 1;
    
    /** The background image height, in pixels */
    this.imageHeight = 1;

    /** Indicates if the mouse button or a finger is currently pressing on the visualizer. Used to enable dragging. */
    this.leftMouseIsDown = false;

    /** The THREE.Mesh object used to indicate which model is selected */
    this.helperBox = null;
    
    /** The DOM element in which our ThreeJS canvas and background image element are contained */
    this.domContainer = null;

    /** An optional function that can be set to be invoked after background image is loaded and deep image camera data set. Ideally, this whould be an emitter similar to addEventListener, but we'll keep it simple. */
    this.onVisualizerReadyCallback = null;

    /** A flag to indicate if we want to enable the 2-finger rotate gesture to rotate the selected model. This must be set prior to calling init(). */
    this.enableRotateGesture = true;

    this.raycaster = new THREE.Raycaster();
    this.lastMousePos = { clientX: 0, clientY: 0 };
    this.cameraLookAtPos = new THREE.Vector3( 0, 0, 0 );
    this.activeModels = [];
    
    /** The size, in meters, of the ground plane mesh used for intersection detection */
    this.groundPlaneMeshSize = {width:30, height:30};
    
    /** The THREE.PerspectiveCamera object that manages perspective of the user. Ths gets set from the Pair Deep Image results so the scene's models line up with the background image. */
    this.camera = null;

    /** The amount by which all models are scaled upon being added to the scene */
    this.sceneScalar = 1;

    /** True to use the built-in swatch display buttons, false to allow users to come up with their own swatch selection system */
    this.useDefaultSwatchDisplay = true;

    /** The THREE.WebGLRenderer object that handles displaying the scene to our browser */
    this.renderer = null;
    
    /** True to use a render loop to continuously re-render the scene. You'll want this for things like animation or transitions, but disabled for normal use as it eats up CPU and battery. */
    this.useContinuousRendering = false;

    /**
     * Indicates if the visualizer is active
     * @private
     */
    this.isActive = false;

    /**
     * When set to true, the viewer will always try to fill the parent containing element with no blank space. The default, false, will cause the image to fill the view with no overflow.
     */
    this.useFullFillOnResize = false;

    /** The ThreeJS scene object */
    this.scene = null;
    this.objLoader = null;
    this.mtlLoader = null;
    this.groundPlaneMesh = null;
    this.groundPlaneMaterial = null;
    this.viewerDomElementId = viewerDomElementId;
    this.lastWindowSize = {x: 0, y:0};

    /** The background DOM img element */
    this.bgImageElem = null;

    this.useMagicImageSizeLogic = false;
}


/**
 * An example of the Pair deep image camera results returned from our API
 */
pair.DeepImageViewer.TestDeepImageCameraInfo = {
    "fov":44.91,
    "heightPitchRoll": {
        "pitch": 0.5381357989403008, // Radians angle pitch down from horizontal
        "roll": 1.3981206291173122e-17, // Amount turned
        "height": 1.3652763023320442 // Y-value
        }, 
    "viewMatrix": [
        0.99675969168278922, -0.076868978325909817, -0.023691289698156939, 0.0,
        0.076868978325909831, 0.82354246893248051, 0.56202220777806045, 1.4200782188101746,
        -0.023691289698156884, -0.56202220777806056, 0.82678277724969151, 0.0,
        0.0, 0.0, 0.0, 1.0
      ],
    "errors": [],
    "processingTimeSecs": 1,
    "sceneScalar": 1
};



/**
 * Determine if WebGL is supported.
 */
pair.isWebGLSupported = function()
{
    // Copied from https://github.com/mrdoob/three.js/blob/master/examples/js/Detector.js
    try {

        var canvas = document.createElement( "canvas" );

        return !! ( window.WebGLRenderingContext && ( canvas.getContext( "webgl" ) || canvas.getContext( "experimental-webgl" ) ) );

    } catch ( e ) {

    return false;

    }
};


pair.DeepImageViewer.prototype = {

    /**
     * Initialize the visualizer using deep image camera data and a room image.
     * @param cameraData - The camera data returned from the Pair deep image server API: https://app.pair3d.com/api/swagger/ui/index#!/Vision/Vision_FindDeepImageCameraFromPost
     * @param {string} roomImageDataUri - The base64-encoded-image string describing the background image
    */
    init:function(cameraData, roomImageDataUri)
    {
        this.domContainer = document.getElementById( this.viewerDomElementId );

        if( !pair.isWebGLSupported() )
        {
            var errorLabel = document.createElement("span");
            errorLabel.innerHTML = "Sorry, unfortunately your browser does not support 3D graphics.";
            this.domContainer.appendChild( errorLabel );

            return;
        }

        // Add the background image element under everything
        this.bgImageElem = document.createElement("img");
        this.bgImageElem.className = "pair-bg-image";
        this.bgImageElem.alt = "3D Visualization";

        this.bgImageElem.style.display = "none";

        this.bgImageElem.style.position = "absolute";
        this.bgImageElem.style.left = "0";
        this.bgImageElem.style.top = "0";
        this.bgImageElem.style.width = "100%";
        this.bgImageElem.style.height = "auto";
        this.bgImageElem.style.zIndex = "1100";

        this.bgImageElem.style.display = "none";
        this.domContainer.appendChild( this.bgImageElem );


        this.tempLoadingImg = document.createElement("img");
        this.tempLoadingImg.src = pair.spinnerImage;
        this.tempLoadingImg.alt = "Loading";
        this.tempLoadingImg.style.position = "absolute";
        this.tempLoadingImg.style.width = "32px";
        this.tempLoadingImg.style.height = "32px";
        this.tempLoadingImg.style.left = "50%";
        this.tempLoadingImg.style.top = "50%";
        this.tempLoadingImg.style.marginLeft = "-16px";
        this.tempLoadingImg.style.marginTop = "-16px";
        this.domContainer.appendChild( this.tempLoadingImg );


        this.initThreeJs();

        var innerThis = this;
        this.bgImageElem.addEventListener("load", function(event)
            {
                innerThis.onBackgroundImageLoaded(event);

                // Remove the loading spinner, if there is one
                if( innerThis.tempLoadingImg )
                    innerThis.domContainer.removeChild( innerThis.tempLoadingImg );

                innerThis.bgImageElem.style.display = "block";
            });

        pair.getOrientationFromDataUri( roomImageDataUri, function(orientationIndex)
        {
            innerThis.bgImageOrientationIndex = orientationIndex;
            innerThis.bgImageElem.src = roomImageDataUri;
        } );
        
        this.hookupInputEvents();

        this.handleCameraData(cameraData);

        if( !this.useContinuousRendering )
            this.renderer.render( this.scene, this.camera );

        if( this.enableRotateGesture )
            this.hookupRotateGesture();
    },


    /**
     * Hook up the 2-finger rotate gesture
     * @private
     */
    hookupRotateGesture: function()
    {
        var innerThis = this;
        var isRotateTouchActive = false;
        var curRotateAngleRads = 0;


        var onTouchStart_RotateGesture = function(touchStartEvent)
        {
            if( !innerThis.selectedMesh )
                return;

            //if( !touchStartEvent.touches[1] )
            //    touchStartEvent.touches[1] = { pageX: touchStartEvent.touches[0].pageX + 10, pageY: touchStartEvent.touches[0].pageY + 10};
            
            if (touchStartEvent.touches[1])
            {
                touchStartEvent.preventDefault();

                isRotateTouchActive = true;

                var touch0 = { x: touchStartEvent.touches[0].pageX, y: touchStartEvent.touches[0].pageY };
                var touch1 = { x: touchStartEvent.touches[1].pageX, y: touchStartEvent.touches[1].pageY };

                // Angle of start in degrees
                curRotateAngleRads = Math.atan2( touch1.y - touch0.y, touch1.x - touch0.x );                
            }
        };


        var onTouchMoveHandler_RotateGesture = function (touchMoveEvent)
        {
            if( !isRotateTouchActive )
                return;

             // if( !touchMoveEvent.touches[1] )
             //     touchMoveEvent.touches[1] = { pageX: touchMoveEvent.touches[0].pageX + 8, pageY: touchMoveEvent.touches[0].pageY + 0};

            if (touchMoveEvent.touches[1])
            {
                touchMoveEvent.preventDefault();

                var touch0 = { x: touchMoveEvent.touches[0].pageX, y: touchMoveEvent.touches[0].pageY };
                var touch1 = { x: touchMoveEvent.touches[1].pageX, y: touchMoveEvent.touches[1].pageY };


                // Angle of move in degrees
                var newAngleRads = Math.atan2( touch1.y - touch0.y, touch1.x - touch0.x );

                var RotateScalar = -0.045  * 180 / Math.PI;
                var degreesDelta = (newAngleRads - curRotateAngleRads) * RotateScalar;

                // Avoid jumps
                if( Math.abs( newAngleRads - curRotateAngleRads ) > Math.PI )
                    degreesDelta = 0;

                curRotateAngleRads = newAngleRads;
                
                // Rotate active model
                innerThis.selectedMesh.rotation.y += degreesDelta;
                innerThis.render();
            }
        };

        var eventElem = this.renderer.domElement;
        eventElem.addEventListener("touchmove", onTouchMoveHandler_RotateGesture, {capture: false, passive: false});

        eventElem.addEventListener( "touchstart", onTouchStart_RotateGesture, {capture: false, passive: false} );

        eventElem.addEventListener('touchend', function ()
        {
            isRotateTouchActive = false;
        });
    },


    /**
     * Hook up the touch/click events to moved the model
     * @private
     */
    hookupInputEvents: function()
    {
        var innerThis = this;

        // Hook up the event handlers needed for interaction
        var eventElem = this.renderer.domElement;
        eventElem.addEventListener("click", function(event)
            {
                innerThis.onMouseTouch_Tap(event);
            });

        eventElem.addEventListener("touch", function(event)
            {
                innerThis.onMouseTouch_Tap(event);
            });

        eventElem.addEventListener("mousedown", function(event)
            {
                innerThis.onMouseTouchDown(event);
            });

        eventElem.addEventListener("mouseup", function(event)
            {
                innerThis.onMouseTouchUp(event);
            });

        eventElem.addEventListener("mousemove", function(event)
            {
                innerThis.onMouseTouch_Move(event);
            });

        eventElem.addEventListener("touchstart", function(event)
            {
                innerThis.onMouseTouchDown(event);
            });

        eventElem.addEventListener("touchend", function(event)
            {
                innerThis.onMouseTouchUp(event);
            });

        eventElem.addEventListener("touchmove", function(event)
            {
                innerThis.onMouseTouch_Move(event);
            });
    },


    /**
     * Create the buttons needed to allow swatch changes
     * @private
     */
    setupSwatchUi:function(mesh)
    {
        // Ensure the element exists
        if( !this.swatchContainerElem )
        {
            this.swatchContainerElem = document.createElement("div");

            this.swatchContainerElem.style.position = "absolute";
            this.swatchContainerElem.style.zIndex = "1300";
            this.domContainer.appendChild( this.swatchContainerElem );
        }

        // Make sure there are no previous buttons there
        while (this.swatchContainerElem.firstChild)
            this.swatchContainerElem.removeChild(this.swatchContainerElem.firstChild);
        
        // Don't show buttons for less than 2 options
        if( mesh.swatchOptions.length < 2 )
        {
            this.swatchContainerElem.style.display = "none";
            return;
        }

        this.swatchContainerElem.style.display = "block";

        var containerSize = {x:this.domContainer.clientWidth, y:this.domContainer.clientHeight};

        // If we have a landscape view then put the buttons on the left
        if( containerSize.x > containerSize.y )
        {
            this.swatchContainerElem.style.width = "10%";
            this.swatchContainerElem.style.height = "100%";
            this.swatchContainerElem.style.left = "0";
            this.swatchContainerElem.style.top = "0";
        }
        // Otherwise put the swatch buttons along the top
        else
        {
            this.swatchContainerElem.style.width = "100%";
            this.swatchContainerElem.style.height = "10%";
            this.swatchContainerElem.style.left = "0";
            this.swatchContainerElem.style.top = "0";
        }

        var splitPercent = Math.floor(100 / (mesh.swatchOptions.length + 1));

        // Create the buttons for each swatch option
        for( var i = 0; i < mesh.swatchOptions.length; ++i )
        {
            var curSwatchOption = mesh.swatchOptions[i];

            var swatchButtonContainerElem = document.createElement("div");
            swatchButtonContainerElem.style.width = "100px";
            swatchButtonContainerElem.style.height = "150px";
            swatchButtonContainerElem.style.display = "inline-block";

            var newSwatchElem = document.createElement("img");

            newSwatchElem.style.width = "100px";
            newSwatchElem.style.height = "100px";

            if( i === mesh.activeSwatchIndex )
                newSwatchElem.style.border = "solid 5px #0FA";
            else
                newSwatchElem.style.padding = "5px";

            newSwatchElem.src = mesh.pairBaseUri + curSwatchOption.thumbnailFileName;

            var createChangeFunc = function(swatchIndex)
            {
                return function()
                {
                    for (var meshIndex = 0; meshIndex < mesh.swatchOptions.length; ++meshIndex)
                    {
                        if( meshIndex === swatchIndex )
                        {
                            mesh.swatchOptions[meshIndex].buttonDomElem.style.border = "solid 5px #AAA";
                            mesh.swatchOptions[meshIndex].buttonDomElem.style.padding = "0";
                        }
                        else
                        {
                            mesh.swatchOptions[meshIndex].buttonDomElem.style.border = "none";
                            mesh.swatchOptions[meshIndex].buttonDomElem.style.padding = "5px";
                        }
                    }

                    mesh.setSwatchIndex( swatchIndex );
                };
            };

            newSwatchElem.addEventListener("click", createChangeFunc( curSwatchOption.swatchIndex ) );

            curSwatchOption.buttonDomElem = newSwatchElem;

            swatchButtonContainerElem.appendChild( newSwatchElem );

            var swatchNameLabelElem = document.createElement("span");
            swatchNameLabelElem.innerHTML = "<br />" + curSwatchOption.name;
            swatchButtonContainerElem.appendChild( swatchNameLabelElem );

            this.swatchContainerElem.appendChild( swatchButtonContainerElem );
        }
    },


    /**
     * Close the visualizer and remove it from the DOM
     * @private
     */
    close:function()
    {
        this.isActive = false;
        this.domContainer.removeChild( this.bgImageElem );
        this.domContainer.removeChild( this.renderer.domElement );

        if( this.swatchContainerElem )
            this.domContainer.removeChild( this.swatchContainerElem ); 
    },


    /**
     * Apply the Pair server camera results to the ThreeJS scene
     * @private
     */
    handleCameraData: function(cameraData)
    {
        // var T = cameraData.Extrinsic_4x4.data;

        var newCameraMatrix = new THREE.Matrix4();
        // newCameraMatrix.set(T["M00"], T["M01"], T["M02"], T["M03"],
        // T["M10"], T["M11"], T["M12"], T["M13"],
        // T["M20"], T["M21"], T["M22"], T["M23"],
        // T["M30"], T["M31"], T["M32"], T["M33"]);

        // var xformMat = cameraData.change_to_Three_js_coords.data;
        // var threeTransformMatrix = new THREE.Matrix4();
        // threeTransformMatrix.set(xformMat["M00"], xformMat["M01"], xformMat["M02"], xformMat["M03"],
        // xformMat["M10"], xformMat["M11"], xformMat["M12"], xformMat["M13"],
        // xformMat["M20"], xformMat["M21"], xformMat["M22"], xformMat["M23"],
        // xformMat["M30"], xformMat["M31"], xformMat["M32"], xformMat["M33"]);

        // newCameraMatrix.multiplyMatrices(threeTransformMatrix, newCameraMatrix);

        newCameraMatrix.fromArray( cameraData.viewMatrix );

        // fromArray is column-major so we need to transpose from row-major as provided by the Pair server
        newCameraMatrix.transpose();
        
        this.camera.applyMatrix(newCameraMatrix);
        //this.camera.position.y = -this.camera.position.y;

        this.camera.fov = cameraData.fov;
        this.camera.updateProjectionMatrix();

        if( cameraData.sceneScalar )
            this.sceneScalar = cameraData.sceneScalar
    },


    /** If useContinuousRendering is false, use this to re-display the scene after the scene has been modified in some way */
    render:function()
    {
        this.renderer.render( this.scene, this.camera );
    },


    /** Get a normalized vector along the ground plane that represents camera right. Used for d-pad movement of models */
    getCameraGroundRight: function()
    {
        var forward = this.camera.getWorldDirection();

        var up = this.camera.up;

        var right = new THREE.Vector3();
        right.crossVectors( forward, up );

        // Force it along the ground
        right.y = 0;
        right.normalize();

        return right;
    },


    /** Get a normalized vector along the ground plane that represents camera right. Used for d-pad movement of models */
    getCameraGroundForward: function()
    {
        var forward = this.camera.getWorldDirection();

        // Force it along the ground
        forward.y = 0;
        forward.normalize();

        return forward;
    },


    /** Initialize the visualizer using a demonstration room image and camera data */
    initUsingDemo:function( imageOverride )
    {
        imageOverride = imageOverride || "https://app.pair3d.com/pair-deep-image/img/test-image.jpg";
        this.init( pair.DeepImageViewer.TestDeepImageCameraInfo, imageOverride );
    },


    onMouseTouch_Tap:function( event )
    {
        if ((event.touches && event.touches.length > 1) || (event.targetTouches && event.targetTouches.length > 1))
            return;

        var touchInfo = event;
        if( event.changedTouches )
            touchInfo = event.changedTouches[0];

        var posOffset = $( this.renderer.domElement ).offset();
        var clientX = touchInfo.clientX - posOffset.left;
        var clientY = touchInfo.clientY - posOffset.top;

        var mousePos = new THREE.Vector2();
        mousePos.x = ( clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
        mousePos.y = -( clientY / this.renderer.domElement.clientHeight ) * 2 + 1;

        this.raycaster.setFromCamera( mousePos, this.camera );

        var intersects = this.raycaster.intersectObjects( this.activeModels, true );

        if( intersects.length > 0 )
        {
            this.selectedMesh = intersects[0].object;

            // Get the parent object
            while( this.selectedMesh.parent && this.selectedMesh.parent.type !== "Scene" )
                this.selectedMesh = this.selectedMesh.parent;

            if( this.helperBox )
                this.scene.remove( this.helperBox );
            //this.helperBox = new THREE.BoundingBoxHelper(this.selectedMesh, 0x00AAFF);
            //this.scene.add(this.helperBox);

            var bbox = new THREE.Box3().setFromObject( this.selectedMesh );

            var boxMaterial =
            new THREE.MeshBasicMaterial(
              {
                  color: 0x00AAFF,
                  transparent: true,
                  opacity: 1,
                  wireframe: true
              } );

            var pos = { x: this.selectedMesh.position.x, y: this.selectedMesh.position.y, z: this.selectedMesh.position.z };
            this.selectedMesh.position.set( pos.x, pos.y, pos.z );

            if( !this.useContinuousRendering )
                this.renderer.render( this.scene, this.camera );
        }
    },


    onMouseTouchDown: function( event )
    {
        if ((event.touches && event.touches.length > 1) || (event.targetTouches && event.targetTouches.length > 1))
            return;

        this.leftMouseIsDown = true;

        var touchInfo = event;
        if( event.changedTouches )
            touchInfo = event.changedTouches[0];

        this.lastMousePos = { clientX: touchInfo.clientX, clientY: touchInfo.clientY };
    },


    onMouseTouchUp: function( event )
    {
        if ((event.touches && event.touches.length > 1) || (event.targetTouches && event.targetTouches.length > 1))
            return;

        this.leftMouseIsDown = false;
    },


    onMouseTouch_Move: function( event )
    {
        if( !this.leftMouseIsDown )
            return;

        if ((event.touches && event.touches.length > 1) || (event.targetTouches && event.targetTouches.length > 1))
            return;

        var touchInfo = event;
        if( event.changedTouches )
            touchInfo = event.changedTouches[0];

        this.onImageClick( touchInfo );

        event.preventDefault();
    },


    onImageClick:function( event )
    {
        if( !this.leftMouseIsDown )
            return;

        var newMousePos = { clientX: event.clientX, clientY: event.clientY };
        var mouseMoveAmt = { clientX: newMousePos.clientX - this.lastMousePos.clientX, clientY: newMousePos.clientY - this.lastMousePos.clientY };
        
        var posOffset = $( this.renderer.domElement ).offset();
        var clientX = event.clientX - posOffset.left;
        var clientY = event.clientY - posOffset.top + $(window).scrollTop();

        if( event.shiftKey )
        {
            var xMoveAmt = mouseMoveAmt.clientX * 0.02;

            if( this.selectedMesh )
                this.selectedMesh.rotateY( xMoveAmt );

            if( this.helperBox )
                this.helperBox.rotateY( xMoveAmt );

            if( !this.useContinuousRendering )
                this.renderer.render( this.scene, this.camera );
        }
        else
        {
            // Convert the mouse from client coordinates to viewport coordinates
            var mousePos = new THREE.Vector2();
            mousePos.x = ( clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
            mousePos.y = -( clientY / this.renderer.domElement.clientHeight ) * 2 + 1;


            this.raycaster.setFromCamera( mousePos, this.camera );

            var intersects = this.raycaster.intersectObjects( [this.groundPlaneMesh], false );

            if( intersects.length > 0 )
            {

                var intPos = intersects[0].point;
                //console.log( intersects[ 0 ].point );

                if( this.selectedMesh )
                    this.selectedMesh.position.set( intPos.x, intPos.y, intPos.z );

                if( this.helperBox )
                {
                    this.helperBox.position.set( intPos.x, intPos.y, intPos.z );
                }

                if( !this.useContinuousRendering )
                    this.renderer.render( this.scene, this.camera );
            }
        }

        this.lastMousePos = newMousePos;
    },


    /**
     * Setup the ThreeJS scene
     * @private
     */
    initThreeJs:function()
    {
        this.renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } );


        var NearPlaneDistanceInMeters = 0.01;
        var FarPlaneDistanceInMeters = 500;

        var tempImageWidth = this.domContainer.clientWidth || 100;
        var tempImageHeight = this.domContainer.clientHeight || 100;

        this.camera = new THREE.PerspectiveCamera(
                74, // The camera vertical field of view will get set by the Pair deep image API results
                tempImageWidth / tempImageHeight, // The aspect ratio will get set properly upon the background image being loaded
                NearPlaneDistanceInMeters,
                FarPlaneDistanceInMeters
            );


        this.scene = new THREE.Scene();


        this.objLoader = new THREE.PairOBJLoader();
        this.mtlLoader = new THREE.PairMTLLoader();
        this.mtlLoader.setCrossOrigin( true );

        // Add the camera to the scene.
        this.scene.add( this.camera );

         // Start the renderer.
        this.renderer.setSize( tempImageWidth, tempImageHeight );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setClearColor( 0x000000, 0 );

        // Attach the renderer-supplied DOM element
        this.domContainer.appendChild( this.renderer.domElement );
        this.renderer.domElement.style.zIndex = 1200;
        this.renderer.domElement.style.position = "absolute";
        this.renderer.domElement.className = "pair-deep-image-canvas";

        this.setupLights();

        // create the sphere's material
        this.groundPlaneMaterial = new THREE.MeshBasicMaterial(
            {
                color: 0x88FFCC,
                transparent: false,
                opacity: 0.2,
                wireframe: true
            } );

        // Create a new mesh with
        this.groundPlaneMesh = new THREE.Mesh( new THREE.BoxGeometry( this.groundPlaneMeshSize.width, 0.001, this.groundPlaneMeshSize.height, 32, 1, 32 ), this.groundPlaneMaterial );

        //this.scene.add( this.groundPlaneMesh );

        // var gridXZ = new THREE.GridHelper(10, 10);
        // gridXZ.setColors( new THREE.Color(0xff0000), new THREE.Color(0xffffff) );
        // this.scene.add(gridXZ);

        var innerThis = this;

        if( this.useContinuousRendering )
        {
            // Start the render loop
            function update()
            {
                if( !innerThis.isActive )
                    return;

                innerThis.renderer.render( innerThis.scene, innerThis.camera );

                // Schedule the next frame.
                requestAnimationFrame( update );
            }

            // Schedule the first frame which will then loop
            requestAnimationFrame( update );
        }
        else
            this.renderer.render( this.scene, this.camera );

        // Ensure we respond to window resize events
        window.addEventListener( "resize", function()
            {
                innerThis.delayedOnWindowResize();
            }, false );

        this.hookUpOrientationChange();

        this.onWindowResize();

        this.isActive = true;
    },


    /**
     * An event handler invoked when the background image changes.
     * @private
     */
    onBackgroundImageLoaded: function( event )
    {
        this.imageWidth = event.currentTarget.naturalWidth;
        this.imageHeight = event.currentTarget.naturalHeight;

        var isiOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if( pair.isOrientationRotated90( this.bgImageOrientationIndex ) )
        {
            // iOS devices properly display the pixels, but the width and height are flipped
            var temp = this.imageWidth;
            this.imageWidth = this.imageHeight;
            this.imageHeight = temp;
            
            if( !isiOSDevice )
            {
                this.bgImageElem.style.transform = "rotate(90deg)";
                this.useMagicImageSizeLogic = true;
            }
        }

        // Update the aspect ratio to match the image
        this.camera.aspect = this.imageWidth / this.imageHeight;
        this.camera.updateProjectionMatrix();

        // Call this function so the new background image fits within the window
        this.onWindowResize();

        if( this.groundPlaneMesh )
        {
            this.scene.remove(this.groundPlaneMesh);
            this.groundPlaneMesh = null;
        }

        this.groundPlaneMesh = new THREE.Mesh(
          new THREE.BoxGeometry( this.groundPlaneMeshSize.width, 0.001, this.groundPlaneMeshSize.height, 32, 1, 32 ),
          this.groundPlaneMaterial );

        //this.scene.add(this.groundPlaneMesh);

        this.setupLights();

        if( this.onVisualizerReadyCallback )
            this.onVisualizerReadyCallback();

        if( !this.useContinuousRendering )
            this.renderer.render( this.scene, this.camera );
    },


    hookUpOrientationChange:function()
    {
        var innerThis =  this;
        var tempCount = 0;

        window.addEventListener("orientationchange", function () {

            // Number of iterations the subject of interval inspection must not mutate to fire "orientationchangeend".
            var NoChangeCountToEnd = 100;

            // Number of milliseconds after which fire the "orientationchangeend" if interval inspection did not do it before.
            var NoEndTimeout = 1500;

            var interval;
            var timeout;
            var tempLastWindowSize = { x: innerThis.lastWindowSize.x, y: innerThis.lastWindowSize.y };
            var lastInnerHeight = window.innerHeight;
            var noChangeCount = 0;

            var end = function ()
            {
                //document.getElementById("toggle-view-button").innerHTML = "Cnt (" + (++tempCount) + "): " + noChangeCount;
                //console.log("orientation change count: " + noChangeCount);

                clearInterval(interval);
                clearTimeout(timeout);

                interval = null;
                timeout = null;

                innerThis.lastWindowSize = { x: window.innerWidth, y: window.innerHeight };

                innerThis.onWindowResize();

                // Call it once more in a third of a second to be save
                setTimeout(function () {
                    innerThis.onWindowResize();
                }, 333);

                setTimeout(function () {
                    innerThis.onWindowResize();
                }, 1000);

                setTimeout(function () {
                    innerThis.onWindowResize();
                }, 2000);

                setTimeout(function () {
                    innerThis.onWindowResize();
                }, 3000);
            };

            interval = setInterval(function () {

                if (window.innerWidth === tempLastWindowSize.x && window.innerHeight === tempLastWindowSize.y)
                {
                    noChangeCount++;

                    // The interval resolved the issue first.
                    if (noChangeCount >= NoChangeCountToEnd)                        
                        end();
                }
                // The window size has changed
                else
                {
                    // If we've already waited a bit, then fire now
                    if( noChangeCount > NoChangeCountToEnd / 4 )
                        end();
                    // Otherwise cut the wait time in quarter as we probably detected the end of the re-layout
                    else
                        NoChangeCountToEnd = NoChangeCountToEnd / 4;

                    tempLastWindowSize = { x: window.innerWidth, y: window.innerHeight };
                    noChangeCount = 0;
                }
            }, 10);

            // The timeout happened first
            timeout = setTimeout( function(){ noChangeCount = -1; end(); }, NoEndTimeout );

        });

        setTimeout( function()
        {
            innerThis.lastWindowSize = {x: window.innerWidth, y: window.innerHeight};
        }, 500 );
    },


    /**
     * Invoke the window resize handler on a delay to allow any containing elements to resize first.
     * @private
     */
    delayedOnWindowResize:function()
    {
        var innerThis =  this;
        setTimeout( function(){

            innerThis.onWindowResize();
        }, 110);
    },


    /**
     * This method ensures the background image fills the container as much as possible without
     * overflow (Similar to CSS background-size:contain). Then it resizes the ThreeJS canvas to sit
     * directly on top of that image.
     * @private
     */
    onWindowResize:function()
    {
        var outerContainerSize;

        if( this.domContainer )
            outerContainerSize = {width:this.domContainer.clientWidth, height:this.domContainer.clientHeight};
        else if( this.renderer )
            outerContainerSize = {width:this.renderer.domElement.clientWidth, height:this.renderer.domElement.clientHeight};
        else
            return;

        if( this.useFullFillOnResize )
        {
            var leftOffset = 0;
            var topOffset = 0;
            var canvasHeight;
            var canvasWidth;
            var marginTopOffset = 0;
            var marginLeftOffset = 0;
            var outerContainerAspectRatio = outerContainerSize.width / outerContainerSize.height; // >1 means landscape, <1 is portait
            var imageAspectRatio = this.imageWidth / this.imageHeight;

            if (this.imageHeight === 1 || this.imageWidth === 1) 
                return;
            // Or if the image is landscape, but the view is portrait
            else if (imageAspectRatio > 1 && outerContainerAspectRatio < 1)
            {
              canvasHeight = outerContainerSize.height;
              canvasWidth = (outerContainerSize.height / this.imageHeight) * this.imageWidth;
              marginLeftOffset = (canvasWidth - outerContainerSize.width) / 2;
            }
            // Or if the image is portrait and the window is landscape
            else if (imageAspectRatio < 1 && outerContainerAspectRatio > 1)
            {
                canvasWidth = outerContainerSize.width;
                canvasHeight = (outerContainerSize.width / this.imageWidth) * this.imageHeight;
                marginTopOffset = (canvasHeight - outerContainerSize.height) / 2;
            }
            else
            {
                if (outerContainerAspectRatio > imageAspectRatio)
                {
                    canvasWidth = outerContainerSize.width;
                    canvasHeight = (outerContainerSize.width / this.imageWidth) * this.imageHeight;
                    marginTopOffset = (canvasHeight - outerContainerSize.height) / 2;
                }
                else
                {
                    canvasHeight = outerContainerSize.height;
                    canvasWidth = (outerContainerSize.height / this.imageHeight) * this.imageWidth;
                    marginLeftOffset = (canvasWidth - outerContainerSize.width) / 2;
                }
            }

            this.bgImageElem.style.left = leftOffset + 'px';
            this.bgImageElem.style.top = topOffset + 'px';
            this.bgImageElem.style.width = canvasWidth.toString() + 'px';
            this.bgImageElem.style.height = canvasHeight.toString() + 'px';
            this.renderer.domElement.style.left = leftOffset + 'px';
            this.renderer.domElement.style.top = topOffset + 'px';
            this.bgImageElem.style.marginTop = '-' + marginTopOffset + 'px';
            this.renderer.domElement.style.marginTop = '-' + marginTopOffset + 'px';
            this.bgImageElem.style.marginLeft = '-' + marginLeftOffset + 'px';
            this.renderer.domElement.style.marginLeft = marginLeftOffset ? '-' + marginLeftOffset + 'px' : 0;

            this.renderer.setSize(canvasWidth, canvasHeight);
        }
        else
        {
            var widthScalar = outerContainerSize.width / this.imageWidth;
            var heightScalar = outerContainerSize.height / this.imageHeight;

            var containerWidth;
            var containerHeight;
            var leftOffset = 0;
            var topOffset = 0;
            if( widthScalar < heightScalar )
            {
                containerWidth = this.imageWidth * widthScalar;
                containerHeight = this.imageHeight * widthScalar;

                topOffset = Math.floor( (outerContainerSize.height - containerHeight) / 2 );
            }
            else
            {
                containerWidth = this.imageWidth * heightScalar;
                containerHeight = this.imageHeight * heightScalar;

                leftOffset = Math.floor( (outerContainerSize.width - containerWidth) / 2 );
            }

            containerWidth = Math.floor( containerWidth );
            containerHeight = Math.floor( containerHeight );

            this.bgImageElem.style.left = leftOffset + "px";
            this.bgImageElem.style.top = topOffset + "px";
            this.bgImageElem.style.width = containerWidth.toString() + "px";
            this.bgImageElem.style.height = containerHeight.toString() + "px";

            this.renderer.domElement.style.left = leftOffset + "px";
            this.renderer.domElement.style.top = topOffset + "px";
            this.renderer.setSize( containerWidth, containerHeight );
        }

        if( this.useMagicImageSizeLogic )
        {
            var temp = this.bgImageElem.style.width;
            this.bgImageElem.style.width = this.bgImageElem.style.height;
            this.bgImageElem.style.height = temp;

            // temp = this.bgImageElem.style.left;
            // this.bgImageElem.style.left = this.bgImageElem.style.top;
            // this.bgImageElem.style.top = temp;
        }

        if (!this.useContinuousRendering)
          this.renderer.render(this.scene, this.camera);
    },


    /**
     * Setup the lights for the 3D scene
     * @private
     */ 
    setupLights:function()
    {
        // Clear any existing lights
        for( var i = 0; i < this.activeLights.length; ++i )
            this.scene.remove( this.activeLights[i] );
        this.activeLights = [];

        var ambientLight = new THREE.AmbientLight( 0x999999 );
        this.scene.add( ambientLight );
        this.activeLights.push( ambientLight );

        var directionalLightPos = {x:1, y:1, z:1};
        var pointLights = [];
        //   {
        //     pos:{x:0.35949962448608774,y:1,z:-1.9417784240712685},
        //     color:0xFFFFFF,
        //     strength: 1
        //   }
        // ];

        // create a point light
        for( var i = 0; i < pointLights.length; ++i )
        {
          var lightInfo = pointLights[i];

          var pointLight = new THREE.PointLight( lightInfo.color, lightInfo.strength, 15 );
          //pointLight.castShadow = true;

          // set its position
          pointLight.position.set( lightInfo.pos.x, lightInfo.pos.y, lightInfo.pos.z );

          // var geometry = new THREE.SphereGeometry( 0.3, 12, 6 );
          // var material = new THREE.MeshBasicMaterial( { color: 0xFF0000 } );
          // sphere = new THREE.Mesh( geometry, material );
          // sphere.position.set(0.35949962448608774,0,-1.9417784240712685);
          // //this.scene.add( sphere );
          // pointLight.add( sphere );

          // add to the scene
          this.scene.add( pointLight );

          this.activeLights.push( pointLight );

          // var sphereSize = 0.5;
          // var pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
          // this.scene.add( pointLightHelper );
        }

        if( directionalLightPos )
        {
            var dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
            dirLight.position.set(directionalLightPos.x, directionalLightPos.y, directionalLightPos.z);
            this.scene.add(dirLight);

            this.activeLights.push( dirLight );
        }
    },


    /**
     * Get a position on the ground plane in the center of the image so new models can be placed in front of the viewer.
     * @returns {THREE.Vector3} A point on the ground place that should be visible to the viewer
     */ 
    getCenteredPlacementPos:function()
    {
        // (0,0) is center, (0,-1) is bottom, (0,-0.5) is 25% up from bottom
        var centerClientPos = new THREE.Vector2( 0, -0.5 );

        this.raycaster.setFromCamera( centerClientPos, this.camera );

        var intersects = this.raycaster.intersectObjects( [this.groundPlaneMesh], false );

        // If we didn't intersect the plane in the center of the image, try halfway between the middle and bottom
        if( intersects.length === 0 )
        {
            centerClientPos = new THREE.Vector2( 0, -0.5 );

            this.raycaster.setFromCamera( centerClientPos, this.camera );

            intersects = this.raycaster.intersectObjects( [this.groundPlaneMesh], false );
        }

        var resultPos = new THREE.Vector3(0, 0.4, -4);
        if( intersects.length > 0 )
        {
            var intPos = intersects[0].point;
            resultPos.set( intPos.x, intPos.y, intPos.z );
        }

        return resultPos;
    },


    /**
     * Add a half-meter cube to the scene
     * @param {modelAddedCallback} onModelAddedCallback - An optional callback that gets invoked after the cube is added to the scene.
     */ 
    addCube:function(onModelAddedCallback)
    {
        var material = new THREE.MeshLambertMaterial( { color: 0x11FFCC } );
        var cubeMesh = new THREE.Mesh( new THREE.CubeGeometry( 0.5, 0.5, 0.5 ), material );

        var placementPos = this.getCenteredPlacementPos();
        cubeMesh.position.set( placementPos.x, placementPos.y, placementPos.z );

        cubeMesh.scale.set( this.sceneScalar, this.sceneScalar, this.sceneScalar );

        this.scene.add( cubeMesh );

        this.selectedMesh = cubeMesh;

        if( onModelAddedCallback )
            onModelAddedCallback( cubeMesh );

        if( !this.useContinuousRendering )
            this.renderer.render( this.scene, this.camera );
    },


    /**
     * Add a shadow underneath a mesh
     * @param {THREE.Mesh} mesh - The mesh under which we'll place a shadow
     */
    createShadowPlaneForMesh:function(mesh)
    {
        // Load the dot image into a texture
        var image = document.createElement( "img" );
        var dotTexture = new THREE.Texture( image );

        var innerThis = this;
        image.onload = function()  {
            dotTexture.needsUpdate = true;

            if( !innerThis.useContinuousRendering )
                innerThis.renderer.render( innerThis.scene, innerThis.camera );
                
        };
        image.src = pair.blackDotImage;


        var box = new THREE.Box3();
        box.setFromObject( mesh );

        var meshSize = new THREE.Vector3();
        meshSize.subVectors( box.max, box.min );
        meshSize.multiplyScalar( 1.75 );

        var material = new THREE.MeshBasicMaterial({ map : dotTexture, opacity: 0.45 });
        //material = new THREE.MeshLambertMaterial({ color: 0x11FFCC });
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(meshSize.x, meshSize.z), material);
        plane.rotation.set(-Math.PI/2, 0, 0);

        // The plane inherits the scale from the mesh so undo it
        plane.scale.set( 1.0 / this.sceneScalar, 1.0 / this.sceneScalar, 1.0 / this.sceneScalar );

        mesh.add( plane );

        //var placementPos = this.getCenteredPlacementPos();
        //plane.position.set( placementPos.x, placementPos.y, placementPos.z );
        //this.scene.add(plane);
        //this.selectedMesh = plane;

        if( !this.useContinuousRendering )
            this.renderer.render( this.scene, this.camera );
    },



    /**
     * Add a model to the scene via a root URI path. The passed-in path will have "model.obj" appended to find the model and "model.mtl" appended to find the optional material file.
     * @param {string} baseUri - The root URI path to find the model files
     * @param {modelAddedCallback} onModelAddedCallback - An optional callback that gets invoked after the model is loaded and added to the scene.
     * @param {string} swatchName - The optional name of the intial swatch value to use.
     * @param {string} fileNameOverride - A optional string that, if provided, is used for file loading, otherwise "model" is used
     */
    addModelFromBaseUri: function( baseUri, onModelAddedCallback, swatchName, fileNameOverride )
    {
        var innerThis = this;
        var onMeshLoaded = function( newMesh )
        {
            // If there is a selection box already then remove it so we can add a new one for this new mesh
            if( innerThis.helperBox )
            {
                innerThis.scene.remove( innerThis.helperBox );
                innerThis.helperBox = null;
            }
            
            newMesh.pairViewer = innerThis;

            //this.helperBox = new THREE.BoundingBoxHelper( this.selectedMesh, 0x00AAFF );
            //scene.add( this.helperBox );

            innerThis.scene.add( newMesh );
            innerThis.activeModels.push( newMesh );

            var placementPos = innerThis.getCenteredPlacementPos();
            newMesh.position.set( placementPos.x, placementPos.y, placementPos.z );
            
            newMesh.scale.set( innerThis.sceneScalar, innerThis.sceneScalar, innerThis.sceneScalar );

            if( innerThis.helperBox )
                innerThis.helperBox.position.set(placementPos.x, placementPos.y, placementPos.z);

            innerThis.selectedMesh = newMesh;

            if( onModelAddedCallback )
                onModelAddedCallback( newMesh );

            if( !innerThis.useContinuousRendering )
                innerThis.renderer.render( innerThis.scene, innerThis.camera );

            // Potential fix for the missing chair to get re-rendered
            setTimeout( function(){ 

                if( !innerThis.useContinuousRendering )
                    innerThis.renderer.render( innerThis.scene, innerThis.camera );
            }, 250 );
            setTimeout( function(){ 

                if( !innerThis.useContinuousRendering )
                    innerThis.renderer.render( innerThis.scene, innerThis.camera );
            }, 1000 );
            setTimeout( function(){ 

                if( !innerThis.useContinuousRendering )
                    innerThis.renderer.render( innerThis.scene, innerThis.camera );
            }, 2000 );

            if( innerThis.useDefaultSwatchDisplay )
                innerThis.setupSwatchUi( newMesh );
        };

        var loadProgressCallback = null
        pair.loadModelFromBaseUri( baseUri, this.mtlLoader, this.objLoader, onMeshLoaded, loadProgressCallback, swatchName, fileNameOverride );
    },


    /**
     * Used by the rotate-touch-gesture handler to rotate the selected model
     * @private
     */
    rotateSelection: function(yawAmount)
    {
        if( this.selectedMesh )
            this.selectedMesh.rotateY( yawAmount );

        if( this.helperBox )
            this.helperBox.rotateY( yawAmount );

        if( !this.useContinuousRendering )
            this.renderer.render( this.scene, this.camera );
    }
};