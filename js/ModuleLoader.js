/*
Simply loads the module and makes it look like a normal
window js object and then adds the scripts that use it.
*/

import * as THREE from "three";
import { OrbitControls } from './lib/threes/r170/OrbitControls.js';
import { GLTFLoader } from './lib/threes/r170/GLTFLoader.js';


class ModuleLoader {
    static init() {

        window.THREE = THREE;
        window.OrbitControls = OrbitControls;
        window.GLTFLoader = GLTFLoader;

        function appendScript(path) {
            // 1. Create a new script element
            const script = document.createElement("script");
            // 2. Set the source of the script
            script.src = path;
            // 3. Optionally set other attributes (e.g., async, defer)
            script.async = false; // Load the script asynchronously
            script.defer = true; // Load the script asynchronously
            // 4. Append the script to the head of the document
            document.head.appendChild(script);
        }

        /*
        former index.html script loads
        <script type="text/javascript" src="js/three-extend.js"></script>
        <script type="text/javascript" src="js/loading.js"></script>
        <script type="text/javascript" src="js/Cell.js"></script>
        <script type="text/javascript" src="js/factory.js"></script>
        <script type="text/javascript" src="js/pgnParser.js"></script>
        <script type="text/javascript" src="js/gui.js"></script>
        <script type="text/javascript" src="js/chess.js"></script>
        */

        // now loaded after modules
        appendScript("js/three-extend.js");
        appendScript("js/loading.js");
        appendScript("js/Cell.js");
        appendScript("js/factory.js");
        appendScript("js/pgnParser.js");
        appendScript("js/gui.js");
        appendScript("js/chess.js");
    }
}

export { ModuleLoader };
