/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @authod fonserbc / http://fonserbc.github.io/
*/

THREE.StereoEffect = function ( renderer ) {

	var _stereo = new THREE.StereoCamera();
	_stereo.aspect = 0.5;

	this.setAspect = function (aspect) {
		_stereo.aspect = aspect;
	};

	this.setEyeSeparation = function ( eyeSep ) {

		_stereo.eyeSep = eyeSep;

	};

	this.setSize = function ( width, height ) {

		renderer.setSize( width, height );

	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		_stereo.update( camera );

		var size = new THREE.Vector2(0,0);
		renderer.getSize(size);

		if ( renderer.autoClear ) renderer.clear();
		renderer.setScissorTest( true );

		renderer.setScissor( 0, 0, size.width / 2, size.height );
		renderer.setViewport( 0, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraL );

		renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
		renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraR );

		renderer.setScissorTest( false );

	};

};

THREE.StereoEffect2 = function (renderer) {

	//Set up the cameras
	//Create two PerspectiveCamera instances,
	//one for each eye, and offset them horizontally by half of the interpupillary distance(IPD).
	let ipd = 0.064;
	const fov = 75;
	let aspectRatio = window.innerWidth / (window.innerHeight * 0.5); // Update aspect ratio to account for over-under layout
	const near = 0.1;
	const far = 1000;

	const leftEyeCamera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
	const rightEyeCamera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);

	leftEyeCamera.position.x = -ipd / 2;
	rightEyeCamera.position.x = ipd / 2;

	this.setAspect = function (aspect) {
		// aspectRatio = aspect;
	};

	this.setEyeSeparation = function (eyeSep) {
		leftEyeCamera.position.x = -eyeSep / 2;
		rightEyeCamera.position.x = eyeSep / 2;
	};

	this.setSize = function (width, height) {
		renderer.setSize(width, height);
	};

	//Create two WebGLRenderTarget instances to render each eye's view.
	const renderTargetParameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		stencilBuffer: false,
	};

	const leftEyeRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight * 0.5, renderTargetParameters);
	const rightEyeRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight * 0.5, renderTargetParameters);
	// Combine left and right eye images using a custom shader
	const overUnderShader = {
		uniforms: {
			leftEyeTexture: { type: "t", value: leftEyeRenderTarget.texture },
			rightEyeTexture: { type: "t", value: rightEyeRenderTarget.texture },
		},
		vertexShader: `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`,
		fragmentShader: `
	uniform sampler2D leftEyeTexture;
	uniform sampler2D rightEyeTexture;
	varying vec2 vUv;
	void main() {
		if (vUv.y < 0.5) {
			gl_FragColor = texture2D(leftEyeTexture, vec2(vUv.x, vUv.y * 2.0));
		} else {
			gl_FragColor = texture2D(rightEyeTexture, vec2(vUv.x, (vUv.y - 0.5) * 2.0));
		}
	}
`,
	};
	const screenQuadGeometry = new THREE.PlaneBufferGeometry(2, 2);
	const screenQuadMaterial = new THREE.ShaderMaterial({
		uniforms: overUnderShader.uniforms,
		vertexShader: overUnderShader.vertexShader,
		fragmentShader: overUnderShader.fragmentShader,
	});

	const screenQuad = new THREE.Mesh(screenQuadGeometry, screenQuadMaterial);

	const orthoScene = new THREE.Scene();
	const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

	orthoScene.add(screenQuad);

	//Update your animation loop to render the scene for each eye separately.
	this.render = function (scene, camera) {
		scene.updateMatrixWorld();

		if (camera.parent === null) camera.updateMatrixWorld();

		renderer.setRenderTarget(leftEyeRenderTarget);
		renderer.render(scene, leftEyeCamera);

		renderer.setRenderTarget(rightEyeRenderTarget);
		renderer.render(scene, rightEyeCamera);

		renderer.setRenderTarget(null);

		// Use the orthoCamera to render the orthoScene
		renderer.render(orthoScene, orthoCamera);
	};
};