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

let camera;


// OPEN SCANNER

openScanner.onclick = function() {

    scannerModal.hidden = false;

};


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
    scannerModal.hidden = true;

};


// OPEN PHONE CAMERA OR COMPUTER WEBCAM

takePicture.onclick = async function() {

    try {

        stopCamera();

        camera = await navigator.mediaDevices.getUserMedia({

            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },

            audio: false

        });

        // Request continuous autofocus where supported
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
            "Point the camera at the medicine label and allow it to focus.";

    } catch (error) {

        console.log("Camera error:", error);

        scannerStatus.textContent =
            "Camera unavailable. Please allow camera access and try again.";

    }

};


// ENHANCE MEDICINE IMAGE BEFORE OCR

function enhanceImage(originalCanvas) {

    const canvas = document.createElement("canvas");

    // Resize the image without making it excessively large
    const scale = Math.min(
        1.5,
        1600 / Math.max(originalCanvas.width, originalCanvas.height)
    );

    canvas.width = Math.round(originalCanvas.width * scale);
    canvas.height = Math.round(originalCanvas.height * scale);

    const context = canvas.getContext("2d", {
        willReadFrequently: true
    });

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Draw and enlarge the original image
    context.drawImage(
        originalCanvas,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Read the image pixels
    const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const pixels = imageData.data;

    // Convert the image to grayscale and improve contrast
    for (let i = 0; i < pixels.length; i += 4) {

        let gray =
            0.299 * pixels[i] +
            0.587 * pixels[i + 1] +
            0.114 * pixels[i + 2];

        gray = (gray - 128) * 1.4 + 133;

        gray = Math.max(0, Math.min(255, gray));

        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;

    }

    // Save the image before sharpening
    const originalPixels = new Uint8ClampedArray(pixels);

    const width = canvas.width;
    const height = canvas.height;

    // Sharpen the medicine label
    for (let y = 1; y < height - 1; y++) {

        for (let x = 1; x < width - 1; x++) {

            const i = (y * width + x) * 4;

            const top = ((y - 1) * width + x) * 4;
            const bottom = ((y + 1) * width + x) * 4;
            const left = (y * width + x - 1) * 4;
            const right = (y * width + x + 1) * 4;

            const sharp =
                originalPixels[i] * 5 -
                originalPixels[top] -
                originalPixels[bottom] -
                originalPixels[left] -
                originalPixels[right];

            const value = Math.max(0, Math.min(255, sharp));

            pixels[i] = value;
            pixels[i + 1] = value;
            pixels[i + 2] = value;

        }

    }

    // Put the improved image back on the canvas
    context.putImageData(imageData, 0, 0);

    return canvas;

}


// CAPTURE PHOTO AND READ MEDICINE TEXT

document.getElementById("capturePhoto").onclick = async function() {

    if (!camera || !cameraVideo.videoWidth) {

        scannerStatus.textContent =
            "Please open the camera first.";

        return;

    }

    const canvas = document.createElement("canvas");

    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;

    // Capture the original image
    canvas.getContext("2d").drawImage(
        cameraVideo,
        0,
        0,
        canvas.width,
        canvas.height
    );

    try {

        scannerStatus.textContent =
            "Enhancing medicine image...";

        // Improve the image before sending it to OCR
        const enhancedCanvas = enhanceImage(canvas);

        // Convert the improved image into a file
        const photo = await new Promise(function(resolve) {

            enhancedCanvas.toBlob(
                resolve,
                "image/jpeg",
                0.95
            );

        });

        if (!photo) {

            scannerStatus.textContent =
                "Unable to process the image.";

            return;

        }

        // Display the enhanced image
        if (preview.src.startsWith("blob:")) {
            URL.revokeObjectURL(preview.src);
        }

        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;

        stopCamera();

        scannerStatus.textContent =
            "Reading enhanced medicine image. Please wait...";

        // Send the enhanced image to the backend
        const formData = new FormData();

        formData.append(
            "medicineImage",
            photo,
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

        if (!response.ok || !result.success) {

            scannerStatus.textContent =
                result.error || "Could not read the medicine label.";

            return;

        }

        // Display the suggested medicine name
        if (result.suggestedName) {

            search.value = result.suggestedName;

            scannerStatus.textContent =
                "Possible medicine name: " +
                result.suggestedName +
                ". Please confirm before searching.";

        } else {

            scannerStatus.textContent =
                "Text detected, but medicine name not identified. Please enter it manually.";

            console.log(
                "Full extracted text:",
                result.extractedText
            );

        }

    } catch (error) {

        console.log("OCR error:", error);

        scannerStatus.textContent =
            "Unable to process the medicine image. Please try again.";

    }

};


// CANCEL CAMERA

const stopCameraButton = document.getElementById("stopCamera");

if (stopCameraButton) {

    stopCameraButton.onclick = stopCamera;

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
