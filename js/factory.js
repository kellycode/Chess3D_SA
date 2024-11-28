// ECMAScript 5 strict mode
/* jshint globalstrict: true*/
/* global THREE, $, document, window, console */
/* global LOADING_BAR_SCALE,ROWS,COLS,PIECE_SIZE, BOARD_SIZE, FLOOR_SIZE, WIREFRAME, DEBUG, Cell, WHITE, BLACK, FEEDBACK, SHADOW */
/* global createCell */

/*
 * initPieceFactory and initCellFactory need to be called after
 * all ressources are loaded (geometry and texture)
 *
 * they will create the createPiece and createCell function
 * and keep some texture/material objects in a closure to avoid
 * unnecessary cloning
 */

"use strict";
var geometries = {};
var textures = {};

function initPieceFactory() {
    // common textures
    var tiling = 1;
    var colors = [];

    for (var c = 0; c < 2; c++) {
        colors[c] = textures["texture/marble_" + c + ".png"].clone();
        colors[c].tile(tiling);
    }

    function createPiece(name, color) {
        var size = (BOARD_SIZE / COLS) * PIECE_SIZE;

        // container for the piece and its reflexion
        var piece = new THREE.Object3D();

        // base material for all the piece (only lightmap changes)
        var material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: 0xaaaaaa,
            shininess: 60.0,
            map: colors[color],
        });

        material.normalScale.set(0.3, 0.3);

        /*
		lightmap here breaks in three r160 for failing format requirements
		var urlAO='texture/'+name+'-ao.jpg';
		Textures where each pixel contains red, green, blue, and alpha
		values (RGBA) with each color value represented as an unsigned 8-bit
		integer, you need to ensure your image data is structured as a set of
		bytes where each pixel takes up 4 bytes, with the first byte representing
		red, the second green, the third blue, and the fourth representing the
		alpha channel, and each byte ranging from 0 to 255 (representing the
		full range of 8-bit unsigned integers). 
		*/

        // url of geometry
        var urlGlb = "3D/glb/" + name + ".glb";

        var geo = geometries[urlGlb];

        var mesh = new THREE.Mesh(geo, material);

        if (SHADOW) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }

        // king and queen are too large atm
        if (name === "queen" || name == "king") {
            let rScale = 0.75;
            mesh.scale.set(size * rScale, size, size * rScale);
        } else {
            mesh.scale.set(size, size, size);
        }

        // rotate the knight properly
        if (name === "knight") {
            mesh.rotation.x += Math.PI / 2;
            mesh.rotation.z += color == WHITE ? Math.PI / 2 : -Math.PI / 2;
        }

        // Piece mesh conflicting (flashy) with the board so moved up a bit
        mesh.position.y += 0.1;

        // The reflections only appears on outside cells,
        // and can't see the reflection on the cell it lives on
        // and the method was much more complex than needed
        // removed it and will redo with Reflector.js

        /*
		// we create the reflection
		// it's a cloned with a negative scale on the Y axis
		var reflexion = mesh.clone();
		reflexion.scale.y *= -1;
		reflexion.material = reflexion.material.clone();
		reflexion.material.transparent = true;
		reflexion.material.side = THREE.BackSide;
		*/

        piece.add(mesh);
        //piece.add(reflexion);

        piece.name = name;
        piece.color = color;

        return piece;
    }

    // make it global
    window.createPiece = createPiece;
}

// cells are the squares on the innder board
function initCellFactory() {
    var materials = [];
    var tiling = 1;

    // common textures
    var diff;
    var norm = textures["texture/wood_N.jpg"].clone();
    norm.tile(tiling);
    var spec = textures["texture/wood_S.jpg"].clone();
    spec.tile(tiling);

    for (var c = 0; c < 2; c++) {
        diff = textures["texture/wood_" + c + ".jpg"].clone();
        diff.tile(tiling);

        //common material
        materials[c] = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: [0xaaaaaa, 0x444444][c],
            shininess: 30.0,
            wireframe: WIREFRAME,
            // removed piece reflections so nothing to see
            transparent: false,
            map: diff,
            specularMap: spec,
            normalMap: norm,
            // AdditiveBlending is too bright and washed out
            // blending: THREE.AdditiveBlending,
            // removed reflections so nothing to see
            //opacity:0.75
        });
    }

    // the squares on the board
    function createCell(size, color) {
        // container for the cell and its reflexion
        var geo = new THREE.PlaneGeometry(size, size);

        // randomize uv offset to ad a bit of variety
        var randU = Math.random();
        var randV = Math.random();

        // var uvs = geo.faceVertexUvs[0][0]; deprecated
        const uvAttribute = geo.getAttribute("uv");
        const uv = new THREE.Vector2();
        for (let i = 0; i < uvAttribute.count; i++) {
            uv.fromBufferAttribute(uvAttribute, i);
            uvAttribute.setXY(i, (uv.x += randU), (uv.y += randV));
        }

        var cell = new THREE.Mesh(geo, materials[color]);

        if (SHADOW) {
            cell.receiveShadow = true;
        }

        // by default PlaneGeometry is vertical
        cell.rotation.x = -Math.PI / 2;
        cell.color = color;
        return cell;
    }

    // make it global
    window.createCell = createCell;
}

function createChessBoard(size) {
    // contains everything that makes the board
    var lChessBoard = new THREE.Object3D();

    var cellSize = size / COLS;
    var square, cell;

    for (var i = 0; i < ROWS * COLS; i++) {
        var col = i % COLS;
        var row = Math.floor(i / COLS);

        cell = new Cell(i);
        square = createCell(cellSize, 1 - ((i + row) % 2));
        square.position.copy(cell.getWorldPosition());
        square.name = cell.position;

        lChessBoard.add(square);
    }

    // some fake inner environment color for reflexion
    var innerBoard = new THREE.Mesh(
        geometries["3D/glb/innerBoard.glb"],
        new THREE.MeshBasicMaterial({
            color: 0x783e12,
        })
    );
    innerBoard.scale.set(size, size, size);

    /// board borders
    var tiling = 6;
    var wood = textures["texture/wood_0.jpg"].clone();
    var spec = textures["texture/wood_S.jpg"].clone();
    var norm = textures["texture/wood_N.jpg"].clone();
    wood.tile(tiling);
    spec.tile(tiling);
    norm.tile(tiling);

    var geo = geometries["3D/glb/board.glb"];
    geo.computeBoundingBox();

    var board = new THREE.Mesh(
        geo,
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: wood,
            specular: 0xffffff,
            specularMap: spec,
            normalMap: norm,
            shininess: 60,
            normalScale: new THREE.Vector2(0.2, 0.2),
        })
    );

    // TODO: remake board in Blender
    var hCorrection = 0.62; // yeah I should just create a better geometry
    board.scale.set(size, size * hCorrection, size);
    lChessBoard.height = geo.boundingBox.min.y * board.scale.y;

    if (SHADOW) {
        board.receiveShadow = true;
        board.castShadow = true;
    }

    lChessBoard.add(innerBoard);
    lChessBoard.add(board);

    lChessBoard.name = "chessboard";
    return lChessBoard;
}

// Simplified createFloor()
function createFloor(size, chessboardSize) {
    const geometry = new THREE.PlaneGeometry(chessboardSize * 5, chessboardSize * 5);

    let texture = textures["texture/floor.jpg"];

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8.25, 8.25);

    // Create a material for the plane
    const material = new THREE.MeshBasicMaterial({ map: texture, color: 0x004400, side: THREE.DoubleSide });

    // Create the plane mesh
    const floor = new THREE.Mesh(geometry, material);

    floor.rotation.x += Math.PI / 2;

    if (SHADOW) {
        floor.receiveShadow = true;
    }

    floor.name = "floor";
    return floor;
}

// special highlighting materials
var validCellMaterial = null;
function createValidCellMaterial() {
    validCellMaterial = [];
    var tiling = 2;

    // common textures
    var diff;
    var norm = textures["texture/wood_N.jpg"].clone();
    norm.tile(tiling);
    var spec = textures["texture/wood_S.jpg"].clone();
    spec.tile(tiling);

    for (var c = 0; c < 2; c++) {
        diff = textures["texture/wood_1.jpg"].clone();
        diff.tile(tiling);

        //common material
        validCellMaterial[c] = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            specular: 0x999999,
            shininess: 60.0,
            wireframe: WIREFRAME,
            map: diff,
            specularMap: spec,
            normalMap: norm,
        });
        //materials[c].normalScale.set(0.5,0.5);
    }
}

var selectedMaterial = null;
function createSelectedMaterial() {
    selectedMaterial = [];
    var tiling = 4;

    // common textures
    var diff;
    var norm = textures["texture/wood_N.jpg"].clone();
    norm.tile(tiling);
    var spec = textures["texture/wood_S.jpg"].clone();
    spec.tile(tiling);

    for (var c = 0; c < 2; c++) {
        diff = textures["texture/wood_1.jpg"].clone();
        diff.tile(tiling);

        //common material
        selectedMaterial[c] = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            emissive: 0x009900,
            specular: 0x999999,
            shininess: 60.0,
            wireframe: WIREFRAME,
            transparent: false,
            map: diff,
            specularMap: spec,
            normalMap: norm,
            opacity: 0.4,
        });
        selectedMaterial[c].normalScale.set(0.3, 0.3);
    }
}
