const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");


// When the Search button is clicked
form.addEventListener("submit", async function(event) {

    event.preventDefault();

    // Get the information entered by the user
    const medicine = search.value.trim();
    const userTypeValue = userType.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;


    // Make sure the user entered a medicine
    if (medicine === "") {
        alert("Please enter a medicine or substance.");
        return;
    }


    try {

        // Send the information to the backend
  // Send the information to the backend
const response = await fetch(
    `https://clean-sport-kenya-api.onrender.com/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
);

        // Convert the response into JSON
        const data = await response.json();

        console.log("Search results:", data);


        // Get the results from the backend
        const medicineResults = data.results || [];


        // If there are no results
        if (medicineResults.length === 0) {

            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p>No results found.</p>
            `;

            return;
        }


        // Start displaying the results
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


        // Display every medicine found
      
//
// Display each formulation only once

// Display each formulation only once
const displayedFormulations = new Set();
let formulationIndex = 0;

// Preserve the original search term
const originalSearchTerm = String(medicine).trim().toLowerCase();

medicineResults.forEach(function(result) {

    const name =
        result.medicine_name ||
        result.ingredient ||
        result.search_for;

    // Skip duplicate formulations
    if (!name || displayedFormulations.has(name)) {
        return;
    }

    displayedFormulations.add(name);
    formulationIndex++;

    // Get brand names
    const brandNames = typeof result.brand_names === "string"
        ? result.brand_names.split(",").map(n => n.trim())
        : [];

    // Get alternative names
    const otherNamesList = typeof result.other_names === "string"
        ? result.other_names.split(",").map(n => n.trim())
        : [];

    // Check BOTH lists for the original search term
    const allNames = [...brandNames, ...otherNamesList];

    const matchedName = allNames.find(
        n => n.toLowerCase() === originalSearchTerm
    );

    // Preserve the exact searched name when it matches
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


        // Close the results list
        output += `
            </div>
        `;


        // Put the results on the page
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


const openScanner = document.getElementById("openScanner");
const closeScanner = document.getElementById("closeScanner");
const scannerModal = document.getElementById("scannerModal");
const preview = document.getElementById("preview");
const scannerStatus = document.getElementById("scannerStatus");

const takePicture = document.getElementById("takePicture");
const cameraPanel = document.getElementById("cameraPanel");
const cameraVideo = document.getElementById("cameraVideo");

let camera;

// Open scanner
openScanner.onclick = () => scannerModal.hidden = false;

// Stop camera
function stopCamera() {
    if (camera) {
        camera.getTracks().forEach(track => track.stop());
        camera = null;
    }

    cameraVideo.srcObject = null;
    cameraPanel.hidden = true;
}

// Close scanner
closeScanner.onclick = () => {
    stopCamera();
    scannerModal.hidden = true;
};


 // Open phone camera or computer webcam
takePicture.onclick = async function () {

    try {

        stopCamera();

        camera = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        cameraVideo.srcObject = camera;
        cameraPanel.hidden = false;

        await cameraVideo.play();

    } catch (error) {

        scannerStatus.textContent =
            "Camera unavailable. Please allow camera access and try again.";

    }

};


 // Capture photo and read medicine text
document.getElementById("capturePhoto").onclick = function () {

    if (!camera || !cameraVideo.videoWidth) return;

    const canvas = document.createElement("canvas");

    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;

    canvas.getContext("2d").drawImage(cameraVideo, 0, 0);

    canvas.toBlob(async function (photo) {

        if (!photo) return;

        preview.src = URL.createObjectURL(photo);
        preview.hidden = false;

        stopCamera();

        scannerStatus.textContent = "Reading medicine text...";

        try {

            const formData = new FormData();
            formData.append("medicineImage", photo);

            const response = await fetch(
                "https://clean-sport-kenya-api.onrender.com/ocr",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (result.success) {

                document.getElementById("search").value =
                    result.extractedText;

                scannerStatus.textContent =
                    "Text extracted successfully! Check the search field.";

            } else {

                scannerStatus.textContent =
                    result.error || "Could not read the medicine label.";

            }

        } catch (error) {

            scannerStatus.textContent =
                "Unable to connect to the OCR service.";

            console.log(error);

        }

    }, "image/jpeg");

};


// Cancel camera
const stopCameraButton = document.getElementById("stopCamera");

if (stopCameraButton) {
    stopCameraButton.onclick = stopCamera;
}


// Open medicine details when preview is clicked
preview.onclick = () => {
    const medicineName = document.getElementById("search").value.trim();

    if (!medicineName) {
        alert("Please enter the medicine name before opening its details.");
        return;
    }

    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    window.location.href = "detail.html?ingredient=" +
        encodeURIComponent(medicineName) +
        "&sport=" + encodeURIComponent(sport) +
        "&country=" + encodeURIComponent(country);
};

