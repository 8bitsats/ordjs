
let storedTransactions = []; // This will store the transaction data
let isSphereMode = false; // Start with cube mode by default
let scene, camera, renderer, raycaster, mouse, controls; // Declare controls here
        let colorByTransaction = false; // False by default


        document.addEventListener('DOMContentLoaded', initThreeJS);
        document.getElementById('blockForm').onsubmit = function(e) {
            e.preventDefault();
            const blockHash = document.getElementById('blockHash').value;
            loadBlockData(blockHash);

async function loadBlockData(blockHash) {
    document.getElementById('loadingIndicator').style.display = 'block';
    clearScene(); // Clear the scene before loading new data
    closeTransactionDetailsContainer(); // Close the transaction details container
    resetCamera(); // Reset the camera position and controls

    const apiUrl = `https://blockchain.info/rawblock/${blockHash}?cors=true`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        storedTransactions = data.tx || [];
        if (storedTransactions.length > 0) {
            createTransactions(storedTransactions);
        }
    } catch (error) {
        console.error("Failed to fetch block data:", error);
        storedTransactions = []; // Reset to empty on error
    }
    document.getElementById('loadingIndicator').style.display = 'none';
}

};

function resetCamera() {
    // Reset camera position
    camera.position.set(0, 0, 500);
    
    // Safely use controls if it's defined
    if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
    }

    // Ensure the camera looks towards the center or your desired point
    camera.lookAt(new THREE.Vector3(0, 0, 0));
}


function clearScene() {
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    // Optionally, reset any global variables or states used for visualization
}
function closeTransactionDetailsContainer() {
    const detailsContainer = document.getElementById('transactionDetailsContainer');
    if (detailsContainer) {
        detailsContainer.style.display = 'none'; // Hide the container
    }
}

function toggleGeometryMode() {
    showLoadingIndicator(true); // Show loading indicator
    isSphereMode = !isSphereMode; // Toggle the mode
    // Update button text based on the current mode
    document.getElementById('toggleGeometryButton').innerText = isSphereMode ? 'Cube' : 'Sphere';
    setTimeout(() => { // Simulate a loading process
        createTransactions(storedTransactions); // Re-render using stored data
        showLoadingIndicator(false); // Hide loading indicator after rendering
    }, 100); // Adding a timeout to simulate the loading process
}

function toggleColorByTransaction() {
    showLoadingIndicator(true); // Show loading indicator
    colorByTransaction = !colorByTransaction;
    setTimeout(() => { // Simulate a loading process
        createTransactions(storedTransactions); // Re-render using stored data
        showLoadingIndicator(false); // Hide loading indicator after rendering
    }, 100); // Adding a timeout to simulate the loading process
}

function showLoadingIndicator(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}



function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvasContainer').appendChild(renderer.domElement);

    clearScene(); // Assuming you have this function defined elsewhere to clear the scene

    camera.position.z = 500;

    // Initialize controls without redeclaring it
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 50; // Set minimum zoom distance
    controls.maxDistance = 800; // Set maximum zoom distance

    scene.add(new THREE.AmbientLight(0x404040));

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);

    (function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    })();
}




function createTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        console.error("Invalid or empty transactions data");
        return; // Exit if no valid transactions data is provided
    }
    if (!renderer) {
        initThreeJS();
    } else {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    let clusterCenter = new THREE.Vector3(0, 0, 0);
    let spread = 200; // Spread for the cube mode

    transactions.forEach(transaction => {
    let value = transaction.out.reduce((acc, cur) => acc + cur.value, 0);
    let valueInBTC = value / 100000000; // Convert the value to BTC
    let size = isSphereMode ? getSphereSize(valueInBTC) : getSquareSize(valueInBTC); // Determine the size based on mode
    let geometry = isSphereMode ? new THREE.SphereGeometry(size, 32, 32) : new THREE.BoxGeometry(size, size, size);
    let material = new THREE.MeshBasicMaterial({ color: getColorByValue(valueInBTC) });
    let parcel = new THREE.Mesh(geometry, material);

    let pos;
    if (isSphereMode) {
        // Use the transaction hash to position spheres in a consistent yet spread out manner
        pos = getPositionInsideSphere(200, new THREE.Vector3(0, 0, 0), transaction.hash);
    } else {
        // Use the transaction hash to position cubes deterministically
        pos = getPositionFromHash(transaction.hash, new THREE.Vector3(0, 0, 0));
    }

    parcel.position.set(pos.x, pos.y, pos.z);
    parcel.userData = transaction; // Store transaction data for potential use (e.g., in event handlers)
    scene.add(parcel);
});

renderer.render(scene, camera); // Render the scene with the added objects

}

// Utility functions related to visualization
function getSphereSize(valueInBTC) {
    // Adjust the size based on the value in BTC for sphere geometry
    if (valueInBTC >= 100000) return 9;
    if (valueInBTC >= 10000) return 8;
    if (valueInBTC >= 1000) return 7;
    if (valueInBTC >= 100) return 6;
    if (valueInBTC >= 10) return 5;
    if (valueInBTC >= 1) return 4;
    if (valueInBTC >= 0.1) return 3;
    if (valueInBTC >= 0.01) return 2;
    return 1; // Minimum size
}

function getSquareSize(valueInBTC) {
    // Adjust the size based on the value in BTC for cube geometry
    if (valueInBTC >= 100000) return 9;
    if (valueInBTC >= 10000) return 8;
    if (valueInBTC >= 1000) return 7;
    if (valueInBTC >= 100) return 6;
    if (valueInBTC >= 10) return 5;
    if (valueInBTC >= 1) return 4;
    if (valueInBTC >= 0.1) return 3;
    if (valueInBTC >= 0.01) return 2;
    return 1; // Minimum size
}

function getColorByValue(valueInBTC) {
    // Determine the color based on the value in BTC
    if (colorByTransaction) {
        if (valueInBTC > 100000) return 0xff0000; // Red
        if (valueInBTC > 10000) return 0xff6600; // Orange
        if (valueInBTC > 1000) return 0xffff00; // Yellow
        if (valueInBTC > 100) return 0x00ff00; // Green
        if (valueInBTC > 10) return 0x0000ff; // Blue
        if (valueInBTC > 1) return 0xffa500; // Orange
        if (valueInBTC > 0.1) return 0xff00ff; // Magenta
        return 0x9900ff; // Purple
    } else {
        return 0xffa500; // Default color if not toggling by transaction value
    }
}

function getPositionFromHash(hash, center) {
    // Ensure that 'center' is always defined
    center = center || new THREE.Vector3(0, 0, 0);

    let x = 0, y = 0, z = 0;
    for (let i = 0; i < hash.length; i++) {
        x += hash.charCodeAt(i) * (i % 3);
        y += hash.charCodeAt(i) * (i % 5);
        z += hash.charCodeAt(i) * (i % 7);
    }

    let spread = 200; // If spread is constant, define it here or adjust as needed

    // Normalize the values to fit within the desired spread around the center
    x = (x % spread) - (spread / 2) + center.x;
    y = (y % spread) - (spread / 2) + center.y;
    z = (z % spread) - (spread / 2) + center.z;

    return new THREE.Vector3(x, y, z);
}
function LCG(seed = 0) {
    this.seed = seed;
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    this.next = function() {
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    };
}

function hashToSeed(hash) {
    // Ensure hash is a string and has enough characters
    if (typeof hash !== 'string' || hash.length < 8) {
        console.error('Invalid hash for seed:', hash);
        return 0; // Return a default seed if hash is invalid
    }
    // Use the first 8 characters of the hash for the seed
    return parseInt(hash.slice(0, 8), 16);
}

function getPositionInsideSphere(radius, center, hash) {
    // Ensure hash is provided for seeding
    if (!hash) {
        console.error('Missing hash for sphere position calculation');
        return center; // Return center position as fallback
    }

    const seed = hashToSeed(hash);
    const rng = new LCG(seed);

    let u = rng.next();
    let v = rng.next();
    let theta = u * 2.0 * Math.PI;
    let phi = Math.acos(2.0 * v - 1.0);
    let r = Math.cbrt(rng.next()) * radius;

    let x = center.x + (r * Math.sin(phi) * Math.cos(theta));
    let y = center.y + (r * Math.sin(phi) * Math.sin(theta));
    let z = center.z + (r * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}



function onDocumentMouseDown(event) {
            event.preventDefault();

            mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                const transactionData = intersects[0].object.userData;
                showTransactionDetails(transactionData);
            }
        }
       
        function showTransactionDetails(transactionData) {
    let detailsContainer = document.getElementById('transactionDetailsContainer');
    if (!detailsContainer) {
        detailsContainer = document.createElement('div');
        detailsContainer.id = 'transactionDetailsContainer';
        document.body.appendChild(detailsContainer);

        // Create and append the close button
        let closeButton = document.createElement('div');
        closeButton.textContent = 'X';
        Object.assign(closeButton.style, {
            position: 'absolute',
            top: '5px',
            right: '10px',
            cursor: 'pointer',
            color: 'orange'
        });
        closeButton.addEventListener('click', function() {
            detailsContainer.style.display = 'none';
        });
        detailsContainer.appendChild(closeButton);

        // Enable moving the container by dragging the top bar
        makeElementMovable(detailsContainer);
    }

    // Apply responsive styling
    updateContainerStyle(detailsContainer);

    // Display the container
    detailsContainer.style.display = 'block';

    // Clear previous data, keeping the close button
    const contentElements = detailsContainer.querySelectorAll('div:not(:first-child)');
    contentElements.forEach(el => el.remove());

    // Function to iterate and display data
    function displayData(data, parentElement, indent = 0) {
        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    const keyDiv = document.createElement('div');
                    keyDiv.textContent = `${' '.repeat(indent)}${key}:`;
                    keyDiv.style.marginLeft = `${indent}px`;
                    parentElement.appendChild(keyDiv);
                    displayData(value, parentElement, indent + 4); // Recurse into sub-object
                } else {
                    const itemDiv = document.createElement('div');
                    itemDiv.textContent = `${' '.repeat(indent)}${key}: ${value}`;
                    itemDiv.style.marginLeft = `${indent}px`;
                    parentElement.appendChild(itemDiv);
                }
            });
        } else {
            const itemDiv = document.createElement('div');
            itemDiv.textContent = `${' '.repeat(indent)}${data}`;
            itemDiv.style.marginLeft = `${indent}px`;
            parentElement.appendChild(itemDiv);
        }
    }

    displayData(transactionData, detailsContainer);
}


function updateContainerStyle(container) {
    // Set default or responsive styles based on the viewport width
    const isMobileView = window.innerWidth < 600;
    Object.assign(container.style, {
        position: 'absolute',
        top: '100px',
        left: isMobileView ? '1%' : '1%',
        
        width: isMobileView ? '98%' : '600px', // Responsive width
        minHeight: '10%',
        maxHeight: '80%',
        backgroundColor: 'black',
        color: 'orange',
        overflowY: 'auto',
        padding: '20px',
        border: '1px solid orange',
        boxSizing: 'border-box',
        zIndex: '1001',
       
        
    });
    container.style.scrollbarWidth = "thin"; // For Firefox
    container.style.scrollbarColor = "black black"; // For Firefox, format is thumb track

    // For WebKit-based browsers, add <style> tags or directly inject styles
    const scrollbarStyles = `
        #${container.id}::-webkit-scrollbar { width: 8px; height: 8px; }
        #${container.id}::-webkit-scrollbar-track { background: black; }
        #${container.id}::-webkit-scrollbar-thumb { background-color: black; border-radius: 4px; }
        #${container.id}::-webkit-scrollbar-thumb:hover { background: #555; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = scrollbarStyles;
    document.head.appendChild(styleSheet);
}

function populateTransactionData(container, transactionData) {
    // Clear previous data, keeping the close button
    const contentElements = container.querySelectorAll('div:not(:first-child)');
    contentElements.forEach(el => el.remove());

    // Add new data
    Object.entries(transactionData).forEach(([key, value]) => {
        let dataRow = document.createElement('div');
        dataRow.textContent = `${key}: ${value}`;
        dataRow.style.marginBottom = '5px';
        container.appendChild(dataRow);
    });
}

window.addEventListener('resize', function() {
    const detailsContainer = document.getElementById('transactionDetailsContainer');
    if (detailsContainer && detailsContainer.style.display !== 'none') {
        updateContainerStyle(detailsContainer);
    }
});



function makeElementMovable(element) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.onmouseup = stopElementDrag;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        posX = mouseX - e.clientX;
        posY = mouseY - e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    }

    function stopElementDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}






function onDocumentMouseDown(event) {
    // Check if the target is the form or a child of the form
    if (event.target.closest('#blockForm')) {
        // If yes, return early and don't prevent the default action
        return;
    }

    event.preventDefault();

    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const transactionData = intersects[0].object.userData;
        showTransactionDetails(transactionData);
    }
}



document.addEventListener('DOMContentLoaded', initThreeJS);
// Add the event listener for mouse down
document.addEventListener('mousedown', onDocumentMouseDown, false);
