const form = document.getElementById("searchForm");
const search = document.getElementById("search");
const userType = document.getElementById("userType");
const results = document.getElementById("results");

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    const medicine = search.value.trim();
    const userTypeValue = userType.value;
    const sport = document.getElementById("sport").value;
    const country = document.getElementById("country").value;

    try {

        const response = await fetch(
            `https://sports-medicine-platform-production.up.railway.app/search?medicine=${encodeURIComponent(medicine)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}&userType=${encodeURIComponent(userTypeValue)}`
        );

        const data = await response.json();

        console.log(data);

        const medicineResults = data.results || [];

        if (medicineResults.length === 0) {

            results.innerHTML = `
                <p><strong>Total Results:</strong> 0</p>
                <p>No results found.</p>
            `;

            return;
        }

        let output = `
            <p><strong>Total Results:</strong> ${medicineResults.length}</p>

            <div class="formulation-list">

                <div class="formulation-title">
                    Formulation Name
                </div>
        `;

        medicineResults.forEach(function(medicine, index)  {

            const name = medicine.medicine_name || medicine.ingredient;

            output += `
                <a class="formulation-item"
                   href="detail.html?ingredient=${encodeURIComponent(name)}&sport=${encodeURIComponent(sport)}&country=${encodeURIComponent(country)}">
                    ${index + 1}. ${name}
                </a>
            `;

        });

        output += `</div>`;

        results.innerHTML = output;

    } catch (error) {

        console.log(error);

        results.innerHTML = `
            <p><strong>Error connecting to the medicine database.</strong></p>
        `;
    }
});