// GET HTML ELEMENTS

const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");

// SEARCH FOR MEDICINE

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const medicine = search.value.trim();
    const userTypeValue = userType.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    if (medicine === "") {
        alert("Please enter a medicine or substance.");
        return;
    }

    try {

        const response = await fetch(
            `https://clean-sport-kenya-api.onrender.com/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
        );

        const data = await response.json();

        console.log("Search results:", data);

        if (!response.ok) {
            throw new Error(data.error || "Medicine search failed.");
        }

        const medicineResults = data.results || [];

        if (medicineResults.length === 0) {

            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p>No results found.</p>
            `;

            return;
        }

        let output = `
            <p>
                <strong>Total Results:</strong>
                ${medicineResults.length}
            </p>

            <div class="formulation-list">

                <div class="formulation-title">
                    Formulation Name
                </div>
        `;

        const displayedFormulations = new Set();
        let formulationIndex = 0;

        const originalSearchTerm = medicine.toLowerCase();

        medicineResults.forEach(function(result) {

            const name =
                result.medicine_name ||
                result.ingredient ||
                result.search_for;

            if (!name || displayedFormulations.has(name)) {
                return;
            }

            displayedFormulations.add(name);
            formulationIndex++;

            const brandNames = typeof result.brand_names === "string"
                ? result.brand_names.split(",").map(n => n.trim())
                : [];

            const otherNamesList = typeof result.other_names === "string"
                ? result.other_names.split(",").map(n => n.trim())
                : [];

            const allNames = [...brandNames, ...otherNamesList];

            const matchedName = allNames.find(
                n => n.toLowerCase() === originalSearchTerm
            );

            const detailIngredient = matchedName || name;

            output += `
                <a
                    class="formulation-item"
                    href="detail.html?ingredient=${encodeURIComponent(detailIngredient)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}"
                >
                    ${formulationIndex}. ${name}
                </a>
            `;

        });

        output += `</div>`;

        results.innerHTML = output;

    } catch (error) {

        console.log("Search error:", error);

        results.innerHTML = `
            <p>
                <strong>
                    Error connecting to the medicine database.
                </strong>
            </p>
        `;

    }

});

// CAMERA AND SCANNER


const openScanner = document.getElementById("openScanner");
const closeScanner = document.getElementById("closeScanner");
const scannerModal = document.getElementById("scannerModal");

const preview = document.getElementById("preview");
const scannerStatus = document.getElementById("scannerStatus");

const takePicture = document.getElementById("takePicture");
const cameraPanel = document.getElementById("cameraPanel");
const cameraVideo = document.getElementById("cameraVideo");

const capturePhoto = document.getElementById("capturePhoto");
const stopCameraButton = document.getElementById("stopCamera");

let camera = null;

// Store the preview image URL so it can be released later.
let previewObjectUrl = null;

// OPEN SCANNER


openScanner.onclick = function() {

    scannerModal.hidden = false;

};

// CLEAR PREVIOUS IMAGE


function clearPreview() {

    if (previewObjectUrl) {

        URL.revokeObjectURL(previewObjectUrl);

        previewObjectUrl = null;

    }

    preview.src = "";
    preview.hidden = true;

}

// STOP CAMERA


function stopCamera() {

    if (camera) {

        camera.getTracks().forEach(function(track) {

            track.stop();

        });

        camera = null;

    }

    cameraVideo.srcObject = null;
    cameraPanel.hidden = true;

}

// CLOSE SCANNER


closeScanner.onclick = function() {

    stopCamera();

    clearPreview();

    scannerModal.hidden = true;

    scannerStatus.textContent = "";

};

// OPEN PHONE CAMERA OR COMPUTER WEBCAM


takePicture.onclick = async function() {

    try {

        stopCamera();

        clearPreview();

        scannerStatus.textContent = "Opening camera...";

        // Check whether the browser supports camera access.

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {

            scannerStatus.textContent =
                "Your browser does not support camera access. Please use a supported browser.";

            return;

        }

        camera = await navigator.mediaDevices.getUserMedia({

            video: {

                facingMode: { ideal: "environment" },

                width: { ideal: 1920 },

                height: { ideal: 1080 }

            },

            audio: false

        });

        // Request continuous autofocus where supported.

        const track = camera.getVideoTracks()[0];

        try {

            await track.applyConstraints({

                advanced: [{ focusMode: "continuous" }]

            });

        } catch (error) {

            console.log("Continuous focus is not supported.");

        }

        cameraVideo.srcObject = camera;

        cameraPanel.hidden = false;

        await cameraVideo.play();

        scannerStatus.textContent =
            "Point the camera at the medicine name and allow it to focus.";

    } catch (error) {

        console.log("Camera error:", error);

        stopCamera();

        if (error.name === "NotAllowedError") {

            scannerStatus.textContent =
                "Camera permission denied. Please allow camera access.";

        } else if (error.name === "NotFoundError") {

            scannerStatus.textContent =
                "No camera was found on this device.";

        } else {

            scannerStatus.textContent =
                "Camera unavailable. Please allow camera access and try again.";

        }

    }

};


// =========================================
// ENHANCE MEDICINE IMAGE BEFORE OCR
// =========================================

function enhanceImage(originalCanvas) {

    const canvas = document.createElement("canvas");

    // Keep good image resolution.
    // Avoid unnecessary shrinking of the original photograph.

    const maxDimension = 2200;

    const scale = Math.min(
        1.5,
        maxDimension / Math.max(
            originalCanvas.width,
            originalCanvas.height
        )
    );

    canvas.width = Math.round(originalCanvas.width * scale);

    canvas.height = Math.round(originalCanvas.height * scale);

    const context = canvas.getContext("2d", {

        willReadFrequently: true

    });

    context.imageSmoothingEnabled = true;

    context.imageSmoothingQuality = "high";

    // Draw the original photograph.

    context.drawImage(
        originalCanvas,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Read the image pixels.

    const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const pixels = imageData.data;

    // -------------------------------------
    // CHECK AVERAGE IMAGE BRIGHTNESS
    // -------------------------------------

    let totalBrightness = 0;

    let sampledPixels = 0;

    // Sample pixels instead of checking every pixel.

    for (let i = 0; i < pixels.length; i += 160) {

        const brightness =
            0.299 * pixels[i] +
            0.587 * pixels[i + 1] +
            0.114 * pixels[i + 2];

        totalBrightness += brightness;

        sampledPixels++;

    }

    const averageBrightness =
        totalBrightness / sampledPixels;

    console.log(
        "Original image brightness:",
        averageBrightness
    );

    // APPLY GENTLE BRIGHTNESS CORRECTION
    

    let brightnessAdjustment = 0;

    if (averageBrightness < 90) {

        brightnessAdjustment = 22;

    } else if (averageBrightness < 120) {

        brightnessAdjustment = 12;

    } else if (averageBrightness > 205) {

        brightnessAdjustment = -5;

    }

    // Apply only mild contrast correction.

    const contrast = 1.06;


    // IMPROVE IMAGE WITHOUT DESTROYING COLOUR
    

    for (let i = 0; i < pixels.length; i += 4) {

        let red = pixels[i];

        let green = pixels[i + 1];

        let blue = pixels[i + 2];

        red = (red - 128) * contrast + 128 + brightnessAdjustment;

        green = (green - 128) * contrast + 128 + brightnessAdjustment;

        blue = (blue - 128) * contrast + 128 + brightnessAdjustment;

        // Keep all colour values within the valid range.

        pixels[i] = Math.max(0, Math.min(255, red));

        pixels[i + 1] = Math.max(0, Math.min(255, green));

        pixels[i + 2] = Math.max(0, Math.min(255, blue));

    }

    // Save the enhanced image.

    context.putImageData(imageData, 0, 0);

    return canvas;

}


// CONVERT CANVAS TO IMAGE FILE


function canvasToBlob(canvas) {

    return new Promise(function(resolve, reject) {

        canvas.toBlob(function(blob) {

            if (!blob) {

                reject(new Error("Image conversion failed."));

                return;

            }

            resolve(blob);

        }, "image/jpeg", 0.95);

    });

}

// CAPTURE PHOTO AND READ MEDICINE TEXT


capturePhoto.onclick = async function() {

    if (!camera || !cameraVideo.videoWidth) {

        scannerStatus.textContent =
            "Please open the camera first.";

        return;

    }

    // Prevent repeated captures while processing.

    capturePhoto.disabled = true;

    try {

        // CAPTURE ORIGINAL CAMERA IMAGE
        

        const canvas = document.createElement("canvas");

        canvas.width = cameraVideo.videoWidth;

        canvas.height = cameraVideo.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            cameraVideo,
            0,
            0,
            canvas.width,
            canvas.height
        );

        scannerStatus.textContent =
            "Processing medicine photograph...";

        // PRESERVE ORIGINAL PHOTOGRAPH
        

        const originalPhoto = await canvasToBlob(canvas);

        // CREATE ENHANCED COPY FOR OCR
      

        const enhancedCanvas = enhanceImage(canvas);

        const enhancedPhoto = await canvasToBlob(enhancedCanvas);

        // DISPLAY ORIGINAL IMAGE
        
        clearPreview();

        previewObjectUrl = URL.createObjectURL(originalPhoto);

        preview.src = previewObjectUrl;

        preview.hidden = false;

        // Stop the camera after capturing.

        stopCamera();

        scannerStatus.textContent =
            "Reading medicine label. Please wait...";

        // SEND ENHANCED IMAGE TO BACKEND
        

        const formData = new FormData();

        formData.append(
            "medicineImage",
            enhancedPhoto,
            "medicine.jpg"
        );

        const response = await fetch(
            "https://clean-sport-kenya-api.onrender.com/ocr",
            {

                method: "POST",

                body: formData

            }
        );

        const result = await response.json();

        console.log("OCR response:", result);

        
        // HANDLE OCR ERRORS
        

        if (!response.ok || !result.success) {

            scannerStatus.textContent =
                result.error ||
                "Could not read the medicine label. Please try another photograph.";

            return;

        }

        // MEDICINE NAME IDENTIFICATION
        
        if (result.suggestedName &&
            result.suggestedName.trim() !== "") {

            // Automatically place the suggested name into the medicine search field.

            search.value = result.suggestedName;

            scannerStatus.textContent =
                "Medicine identified: " +
                result.suggestedName +
                ". Check the search field and tap Search.";

            console.log(
                "Suggested medicine:",
                result.suggestedName
            );

        } else {

            scannerStatus.textContent =
                "We could not identify the medicine name. Please take another photograph or enter the name manually.";

            console.log(
                "Full extracted text:",
                result.extractedText
            );

        }

    } catch (error) {

        console.log("OCR processing error:", error);

        scannerStatus.textContent =
            "Unable to process the medicine photograph. Please try again.";

    } finally {

        // Allow another capture when processing finishes.

        capturePhoto.disabled = false;

    }

};

// CANCEL CAMERA


if (stopCameraButton) {

    stopCameraButton.onclick = function() {

        stopCamera();

        scannerStatus.textContent =
            "Camera closed. You can open it again when ready.";

    };

}

// OPEN MEDICINE DETAILS WHEN PREVIEW IS CLICKED


preview.onclick = function() {

    const medicineName = search.value.trim();

    if (!medicineName) {

        alert("Please enter the medicine name before opening its details.");

        return;

    }

    const sport = document.getElementById("sport").value;

    const country = document.getElementById("country").value;

    window.location.href =
        "detail.html?ingredient=" +
        encodeURIComponent(medicineName) +
        "&sport=" +
        encodeURIComponent(sport) +
        "&country=" +
        encodeURIComponent(country);

};
