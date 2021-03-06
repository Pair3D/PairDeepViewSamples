// Create the Pair top-level namespace or use the existing one
var pair = pair || {};


/**
 * The viewer class that contains the logic for displaying a model in a fun, interactive view
 * @class
 * @param {string} viewerDomElementId - The ID of the DOM element in which we'll create the visualizer. The visualizer will try to fit within this element as large as possible without overflow.
 * @example
 * // Create an interstitial viewer
 * var viewer = new pair.Interstitial("display-div");
 */
pair.Interstitial = function( viewerDomElementId )
{
    this.viewerDomElementId = viewerDomElementId;

    /** The DOM element in which our ThreeJS canvas is contained */
    this.domContainer = null;

    /** True to show a loading box while downloading the model. False to disable and show nothing, useful for custom loading indicators.  */
    this.showLoadingBox = true;

    this.camera = null;
    this.viewControls = null;
    this.scene = null;
    this.renderer = null;
    this.objLoader = null;
    this.mtlLoader = null;
    this.activeMesh = null;
    this.activeMeshRadius = 0;
    this.isActive = false;
    this.pauseAutoRotate = false;
    this.unpauseRotateTimerId = -1;

    /**
     * The speed, in radians per second, at which the model will automatically yaw about the Y axis. 0 to disable spin.
     */
    this.autoRotateSpeed = Math.PI * -0.04;

    /**
     * The current rotation speed, moves smoothly toward autoRotateSpeed
     * @private
     */
    this.currentAutoRotateSpeed = 0;

    /**
     * The THREE.Object3D object the represents the outline of the loading progress box.
     * @private
     */
    this.loadingProgress_OutlineBox = null;
    
    /**
     * The THREE.Object3D object the represents the inside of the loading progress box which fills up during download.
     * @private
     */
    this.loadingProgress_FillBox = null;
};


pair.Interstitial.prototype = {

    /**
     * Initialize the Pair interstital viewer and begin rendering
     */
    init: function()
    {
        this.domContainer = document.getElementById( this.viewerDomElementId );

        var tempImageWidth = this.domContainer.clientWidth || 100;
        var tempImageHeight = this.domContainer.clientHeight || 100;

        this.camera = new THREE.PerspectiveCamera( 60, tempImageWidth / tempImageHeight, 0.001, 500 );
        this.camera.position.z = 500;


        this.objLoader = new THREE.PairOBJLoader();
        this.mtlLoader = new THREE.PairMTLLoader();
        this.mtlLoader.setCrossOrigin( true );


        this.scene = new THREE.Scene();
        
        // lights
        var light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 );
        this.scene.add( light );

        // light = new THREE.DirectionalLight( 0x002288 );
        // light.position.set( -1, -1, -1 );
        // this.scene.add( light );

        light = new THREE.AmbientLight( 0x999999 );
        this.scene.add( light );

        // renderer
        this.renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true } );
        this.renderer.setClearColor( 0xFFFFFF );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( tempImageWidth, tempImageHeight );
        this.renderer.setClearColor( 0x000000, 0 );

        this.domContainer.appendChild( this.renderer.domElement );


        this.viewControls = new THREE.TrackballControls( this.camera, this.renderer.domElement );

        this.viewControls.rotateSpeed = 4.0;
        this.viewControls.zoomSpeed = 1.2;
        this.viewControls.panSpeed = 0.8;

        this.viewControls.noZoom = false;
        this.viewControls.noPan = false;

        this.viewControls.staticMoving = true;
        this.viewControls.dynamicDampingFactor = 0.3;

        var innerThis = this;
        this.viewControls.onPanCallback = function()
        {
            innerThis.currentAutoRotateSpeed = 0;
            innerThis.pauseAutoRotate = true;

            if( innerThis.unpauseRotateTimerId > 0 )
                clearTimeout( innerThis.unpauseRotateTimerId );

            innerThis.unpauseRotateTimerId = setTimeout(function()
            {
                innerThis.pauseAutoRotate = false;
            }, 5000);
        };

        // Not used
        var KeyCode_A = 65;
        var KeyCode_S = 83;
        var KeyCode_D = 68;
        this.viewControls.keys = [ KeyCode_A, KeyCode_S, KeyCode_D ];




        window.addEventListener( 'resize', function(){ innerThis.onWindowResize(); }, false );

        // Invoke the resize function so we setup the viewport properly
        this.onWindowResize();

        this.isActive = true;

        var groundPlaneMaterial = new THREE.MeshBasicMaterial(
            {
                color: 0x88FFCC
            } );

        this.groundPlaneMesh = new THREE.Mesh( new THREE.BoxGeometry( 10, 0.001, 10, 32, 1, 32 ), groundPlaneMaterial );

        //this.scene.add(this.groundPlaneMesh);

        // Delay animation starting as there's a weird error relating to empty matrices if we don't
        var innerThis = this;
        setTimeout(function() {innerThis.animate();}, 50);
        
    },


    /**
     * This method ensures the ThreeJS scene aspect ratio matches the window and keeps the active mesh filling the view
     * overflow (Similar to CSS background-size:contain). Then it resizes the ThreeJS canvas to sit
     * directly on top of that image.
     * @private
     */
    onWindowResize:function( newModelWasLoaded )
    {
        if( this.activeMeshRadius > 0 )
        {
            // Convert camera fov degrees to radians
            var fovInRads = this.camera.fov * ( Math.PI / 180 ); 

            // Calculate the camera distance
            this.camera.position.z  = Math.abs( this.activeMeshRadius / Math.sin( fovInRads / 2 ) );

            // When a new model is loaded, start the camera a little higher
            if( newModelWasLoaded )
            {
                this.camera.position.y = this.camera.position.z * 0.4;
            }
        }

        this.camera.aspect = this.domContainer.clientWidth / this.domContainer.clientHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize( this.domContainer.clientWidth, this.domContainer.clientHeight );

        this.viewControls.handleResize();
    },


    /**
     * The callback for when the browser says it's ready to render again
     * @private
     */
    animate:function()
    {
        this.renderer.render( this.scene, this.camera );

        // If we are supposed to automatically spin the model, spin isn't paused, and we have an active mode, then update the spin
        if( this.autoRotateSpeed != 0 && !this.pauseAutoRotate && this.activeMesh )
        {
            var FrameTime = 1.0 / 60.0; // For simplicity's sake, just assume 60fps

            if( this.currentAutoRotateSpeed != this.autoRotateSpeed )
            {
                var RotateAcceleration = Math.PI * FrameTime * 0.025;

                // If the acceleration would move passed the target, then simply set to the target
                if( Math.abs(this.currentAutoRotateSpeed - this.autoRotateSpeed) < RotateAcceleration )
                    this.currentAutoRotateSpeed = this.autoRotateSpeed;
                else
                {
                    if( this.currentAutoRotateSpeed < this.autoRotateSpeed )
                        this.currentAutoRotateSpeed += RotateAcceleration;
                    else
                        this.currentAutoRotateSpeed -= RotateAcceleration;
                }
            }

            this.activeMesh.rotation.y += this.currentAutoRotateSpeed * FrameTime;
        }

        // If the scene is still active the schedule the next update
        if( this.isActive )
        {
            var innerThis = this;
            requestAnimationFrame( function(){ innerThis.animate(); } );
        }

        this.viewControls.update();
    },


    /**
     * Set the displayed model via a root URI path. The passed-in path will have "model.obj" appended to find the model and "model.mtl" appended to find the optional material file.
     * @param {string} baseUri - The root URI path to find the model files
     * @param {progressCallback} onLoadProgress - An optional callback that gets invoked while the model's resources are downloaded
     * @param {string} initialSwatchName - The optional name of the initial swatch value to use
     * @param {string} fileNameOverride - A optional string that, if provided, is used for file loading, otherwise "model" is used
     */
    setModelFromBaseUri: function( baseUri, loadProgressCallback, initialSwatchName, fileNameOverride )
    {
        if( this.showLoadingBox )
        {
            var outlineMaterial = new THREE.MeshBasicMaterial( {color: 0x33FFEE, wireframe: true, wireframeLinewidth: 2} );
            this.loadingProgress_OutlineBox = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), outlineMaterial );

            var fillMaterial = new THREE.MeshBasicMaterial( {color: 0x08EEBB} );
            this.loadingProgress_FillBox = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), fillMaterial );
            this.loadingProgress_FillBox.scale.y = 0.001;

            this.scene.add( this.loadingProgress_OutlineBox );
            this.scene.add( this.loadingProgress_FillBox );

            // Zoom in on the cube
            this.activeMeshRadius = 1;
            this.onWindowResize();
        }

        var innerThis = this;
        var onMeshLoaded = function( newMesh )
        {
            if( innerThis.showLoadingBox )
            {
                if( innerThis.loadingProgress_OutlineBox )
                    innerThis.scene.remove( innerThis.loadingProgress_OutlineBox );

                if( innerThis.loadingProgress_FillBox )
                    innerThis.scene.remove( innerThis.loadingProgress_FillBox );

                innerThis.loadingProgress_OutlineBox = null;
                innerThis.loadingProgress_FillBox = null;
            }

            // If there is already a mesh displayed, remove it
            if( innerThis.activeMesh )
            {
                innerThis.scene.remove( innerThis.activeMesh );
                innerThis.activeMesh  = null;
            }

            innerThis.activeMesh = newMesh;

            var box = new THREE.Box3();
            box.setFromObject( newMesh );

            var center = new THREE.Vector3();
            center.subVectors( box.max, box.min );
            center.multiplyScalar( 0.5 );
            center.add( box.min );
            center.multiplyScalar( -1 );

            //newMesh.position = center;
            newMesh.position.set(0,center.y,0);

            innerThis.groundPlaneMesh.position.y = center.y;

            var modelSize = new THREE.Vector3();
            modelSize.subVectors( box.max, box.min );

            innerThis.activeMeshRadius = modelSize.length() * 0.5;

            // Call resize to fit the model to the window
            innerThis.onWindowResize( true );

            newMesh.updateMatrix();
            
            setTimeout( function()
            {
                innerThis.scene.add( newMesh );
            }, 5 );
        };

        var loadProgress = function(percentDown)
        {
            //console.log("Downloaded: " + percentDown);
            if( innerThis.showLoadingBox && innerThis.loadingProgress_FillBox )
            {
                innerThis.loadingProgress_FillBox.scale.y = percentDown;

                // ThreeJS doesn't like scale set to 0
                if( innerThis.loadingProgress_FillBox.scale.y === 0 )
                    innerThis.loadingProgress_FillBox.scale.y = 0.001;
            }

            if( loadProgressCallback )
                loadProgressCallback( percentDown );
        }

        pair.loadModelFromBaseUri( baseUri, this.mtlLoader, this.objLoader, onMeshLoaded, loadProgress, initialSwatchName, fileNameOverride );
    },


    /**
     * Stop the rendering
     */
    close: function()
    {
        // Stop the render loop
        this.isActive = false;

        this.domContainer.removeChild( this.renderer.domElement );
    }
};