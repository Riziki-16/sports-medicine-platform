require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { createWorker } = require("tesseract.js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// IMAGE UPLOAD CONFIGURATION


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new Error("Only image files are allowed"));
        }
    }
});


// MEDICINE IMAGES

app.use("/images", express.static(path.join(__dirname, "images")));

const imageFolder = path.join(__dirname, "images");

function normalizeImageName(name) {
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]/g, "");
}

app.get("/find-image", async function (req, res) {

    const medicineName = req.query.name;

    if (!medicineName) {
        return res.status(400).json({
            error: "Medicine name is required"
        });
    }

    try {
        const files = await fs.promises.readdir(imageFolder);

        const allowedExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
        ];

        const imageFiles = files.filter(file =>
            allowedExtensions.includes(path.extname(file).toLowerCase())
        );

        const searchName = normalizeImageName(medicineName);

        const aliases = {
            betapyn: ["betayn"]
        };

        const possibleNames = [
            searchName,
            ...(aliases[searchName] || [])
        ];

        const matchedImage = imageFiles.find(file =>
            possibleNames.includes(normalizeImageName(file))
        );

        if (!matchedImage) {
            return res.status(404).json({
                error: "Medicine image not found",
                medicine: medicineName
            });
        }

        res.json({
            imageUrl: "/images/" + encodeURIComponent(matchedImage),
            fileName: matchedImage
        });

    } catch (error) {
        console.error("Image search error:", error);

        res.status(500).json({
            error: "Unable to search medicine images"
        });
    }
});

// DATABASE CONNECTION


const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    ssl: {
        ca: fs.readFileSync(__dirname + "/ca.pem")
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get("/", function (req, res) {
    res.send("Sports Medicine API is running!");
});


// OCR TEXT NORMALIZATION


function normalizeMedicineName(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


// LEVENSHTEIN DISTANCE
// Used to identify possible OCR spelling errors

function levenshteinDistance(a, b) {

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {

            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// FIND MEDICINE NAME FROM OCR TEXT
// Checks medicines, brands and alternative names


async function findMedicineName(ocrText, lines) {

    // Get medicine names from all relevant database tables
    const [knownNames] = await db.query(`

        SELECT medicine_name AS name, 'medicine' AS source
        FROM medicines
        WHERE medicine_name IS NOT NULL
          AND TRIM(medicine_name) <> ''

        UNION ALL

        SELECT brand_name AS name, 'brand' AS source
        FROM brands
        WHERE brand_name IS NOT NULL
          AND TRIM(brand_name) <> ''

        UNION ALL

        SELECT other_name AS name, 'substance name' AS source
        FROM substance_names
        WHERE other_name IS NOT NULL
          AND TRIM(other_name) <> ''

        UNION ALL

        SELECT sub_chemical_name AS name, 'sub-chemical name' AS source
        FROM sub_chemical_names
        WHERE sub_chemical_name IS NOT NULL
          AND TRIM(sub_chemical_name) <> ''

    `);

    // Combine the full OCR text and individual lines
    const lineText = (lines || [])
        .map(line => line.text || "")
        .join(" ");

    const fullText = `${ocrText || ""} ${lineText}`;

    const normalizedText = normalizeMedicineName(fullText);

    console.log("FULL OCR TEXT:", fullText);

    console.log(
        "TRUMOL DATABASE CHECK:",
        knownNames.filter(item =>
            normalizeMedicineName(item.name) === "trumol"
        )
    );

    // Remove duplicate names
    const uniqueNames = new Map();

    knownNames.forEach(item => {

        const originalName = String(item.name || "").trim();
        const normalizedName = normalizeMedicineName(originalName);

        if (normalizedName.length >= 3) {

            if (!uniqueNames.has(normalizedName)) {
                uniqueNames.set(normalizedName, {
                    name: originalName,
                    normalized: normalizedName,
                    source: item.source
                });
            }
        }
    });

    const exactMatches = [];
    const possibleMatches = [];

    // Check every database name against the OCR text
    for (const item of uniqueNames.values()) {

        const normalizedName = item.normalized;

        // Exact name found in OCR text
        if (normalizedText.includes(normalizedName)) {

            exactMatches.push({
                name: item.name,
                source: item.source,
                score: 100
            });

            continue;
        }

        // Check individual OCR words and nearby word groups
        const words = fullText
            .toLowerCase()
            .match(/[a-z0-9]+/g) || [];

        let closestDistance = Infinity;

        for (let i = 0; i < words.length; i++) {

            for (let size = 1; size <= 4 && i + size <= words.length; size++) {

                const phrase = words.slice(i, i + size).join("");
                const distance = levenshteinDistance(
                    normalizedName,
                    phrase
                );

                if (distance < closestDistance) {
                    closestDistance = distance;
                }
            }
        }

        // Only show close matches as candidates.
        // Do not automatically treat them as confirmed medicines.
        const allowedErrors = normalizedName.length >= 8 ? 2 : 1;

        if (
            closestDistance > 0 &&
            closestDistance <= allowedErrors
        ) {

            possibleMatches.push({
                name: item.name,
                source: item.source,
                score: Math.max(
                    0,
                    Math.round(
                        100 - (closestDistance / normalizedName.length) * 100
                    )
                )
            });
        }
    }

    // Remove duplicate exact matches
    const uniqueExactMatches = [
        ...new Map(
            exactMatches.map(item => [
                normalizeMedicineName(item.name),
                item
            ])
        ).values()
    ];

    // Sort possible matches by similarity
    possibleMatches.sort((a, b) => b.score - a.score);

    // Only return a suggested name when an exact match exists
    const suggestedName = uniqueExactMatches.length > 0
        ? uniqueExactMatches[0].name
        : "";

    return {
        suggestedName: suggestedName,
        candidates: [
            ...uniqueExactMatches,
            ...possibleMatches
        ].slice(0, 5)
    };
}

// MEDICINE IMAGE TEXT RECOGNITION (OCR)


app.post("/ocr", upload.single("medicineImage"), async function (req, res) {

    let worker;

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Please capture a medicine image."
            });
        }

        console.log("Starting OCR recognition...");

        worker = await createWorker("eng");

        await worker.setParameters({
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1"
        });

        // Read uploaded image
        const result = await worker.recognize(req.file.buffer);

        const text = String(result.data.text || "").trim();
        const confidence = Number(result.data.confidence) || 0;
        const lines = result.data.lines || [];

        console.log("OCR EXTRACTED TEXT:", text);
        console.log("OCR CONFIDENCE:", confidence);

        console.log(
            "OCR INDIVIDUAL LINES:",
            lines.map(line => line.text)
        );

        if (!text) {
            return res.status(422).json({
                success: false,
                error: "No readable text found. Please take another picture."
            });
        }

        // Find possible medicine names using the complete OCR text
        const identification = await findMedicineName(text, lines);

        console.log("OCR MEDICINE IDENTIFICATION:", identification);

        return res.json({
            success: true,
            extractedText: text,
            suggestedName: identification.suggestedName,
            candidates: identification.candidates,
            confidence: confidence
        });

    } catch (error) {

        console.error("OCR ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Unable to read medicine image."
        });

    } finally {

        if (worker) {
            await worker.terminate();
        }
    }
});


// DATABASE CONNECTION TEST


db.getConnection()
    .then(connection => {
        console.log("MySQL database connected!");
        connection.release();
    })
    .catch(error => {
        console.error("Database connection failed:", error);
    });


// MEDICINE SEARCH


app.get("/search", async function (req, res) {

    const medicine = req.query.medicine;
    const sport = req.query.sport;
    const country = req.query.country;

    console.log({ medicine, sport, country });

    if (!medicine || !sport || !country) {
        return res.status(400).json({
            error: "Medicine, sport and country are required"
        });
    }

    try {

        const [results] = await db.query(`

    SELECT

COALESCE(
    NULLIF(TRIM(m.medicine_name), ''),

    (
        SELECT MIN(TRIM(scn2.sub_chemical_name))
        FROM brands b2
        JOIN brand_sub_chemicals bsc2
            ON bsc2.brand_id = b2.brand_id
        JOIN sub_chemical_names scn2
            ON scn2.sub_chemical_id = bsc2.sub_chemical_id
        WHERE b2.brand_name LIKE CONCAT('%', TRIM(?), '%')
          AND b2.substance_id = s.substance_id
    ),

    (
        SELECT MIN(TRIM(scn2.sub_chemical_name))
        FROM sub_chemical_names scn2
        WHERE scn2.substance_id = s.substance_id
    ),

    (
        SELECT MIN(bn.brand_name)
        FROM brands bn
        WHERE bn.substance_id = s.substance_id
    ),

    TRIM(s.chemical_name)
) AS search_for,

TRIM(s.chemical_name) AS ingredient,
m.medicine_name AS medicine_name,
cat.category_name AS category,

(
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM brands bx
            JOIN brand_sub_chemicals bcx
                ON bcx.brand_id = bx.brand_id
            WHERE bx.brand_name LIKE CONCAT('%', ?, '%')
        )
        THEN (
            SELECT GROUP_CONCAT(
                DISTINCT TRIM(scn3.sub_chemical_name)
                ORDER BY scn3.sub_chemical_name
                SEPARATOR ', '
            )
            FROM brand_sub_chemicals bsc3
            JOIN brands b3
                ON b3.brand_id = bsc3.brand_id
            JOIN sub_chemical_names scn3
                ON scn3.sub_chemical_id = bsc3.sub_chemical_id
            WHERE b3.brand_name LIKE CONCAT('%', ?, '%')
              AND b3.substance_id = s.substance_id
        )
        ELSE GROUP_CONCAT(
            DISTINCT scn.sub_chemical_name
            ORDER BY scn.sub_chemical_name
            SEPARATOR ', '
        )
    END
) AS sub_chemical_name,

sf.specific_code AS specific_code,
sf.specific_name AS specific_name,

(
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM brands bx
            JOIN brand_sub_chemicals bcx
                ON bcx.brand_id = bx.brand_id
            WHERE bx.brand_name LIKE CONCAT('%', ?, '%')
        )
        THEN (
            SELECT GROUP_CONCAT(
                DISTINCT TRIM(b3.brand_name)
                ORDER BY b3.brand_name
                SEPARATOR ', '
            )
            FROM brands b3
            JOIN brand_sub_chemicals bsc
                ON bsc.brand_id = b3.brand_id
            WHERE b3.brand_name LIKE CONCAT('%', ?, '%')
              AND b3.substance_id = s.substance_id
        )
        ELSE (
            SELECT GROUP_CONCAT(
                DISTINCT names.other_name
                ORDER BY names.other_name
                SEPARATOR ', '
            )
            FROM (
                SELECT TRIM(sn2.other_name) AS other_name
                FROM substance_names sn2
                WHERE sn2.substance_id = s.substance_id

                UNION

                SELECT TRIM(scn2.sub_chemical_name) AS other_name
                FROM sub_chemical_names scn2
                WHERE scn2.substance_id = s.substance_id
            ) AS names
            WHERE names.other_name IS NOT NULL
              AND names.other_name <> ''
        )
    END
) AS other_names,

(
    SELECT GROUP_CONCAT(
        DISTINCT bg.brand_name
        ORDER BY bg.brand_name
        SEPARATOR ', '
    )
    FROM brands bg
    WHERE
        bg.medicine_id = m.medicine_id
        OR (
            bg.substance_id = s.substance_id
            AND NOT EXISTS (
                SELECT 1
                FROM brands bm
                WHERE bm.medicine_id = m.medicine_id
            )
        )
) AS brand_names,

(
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'brand_id', b2.brand_id,
            'brand_name', b2.brand_name,
            'image_url', bi.image_url
        )
    )
    FROM brands b2
    LEFT JOIN brand_images bi
        ON b2.brand_id = bi.brand_id
    WHERE
        b2.medicine_id = m.medicine_id
        OR (
            b2.substance_id = s.substance_id
            AND NOT EXISTS (
                SELECT 1
                FROM brands bm
                WHERE bm.medicine_id = m.medicine_id
            )
        )
) AS brands,

sp.sports_name AS sport,
c.country_name AS country,

CASE
    WHEN s.category_id IS NOT NULL THEN 'Restricted'
    WHEN s.substance_id BETWEEN 771 AND 778 THEN 'Restricted'
    ELSE COALESCE(r.status, 'Not classified')
END AS status,

d.dosage_information AS dosage,
w.warning_information AS warning,

(
    SELECT GROUP_CONCAT(
        DISTINCT mp.program_information
        SEPARATOR '\n\n'
    )
    FROM monitoring_programs mp
    WHERE mp.substance_id = s.substance_id
) AS monitoring_program

FROM substances s

LEFT JOIN categories cat
    ON cat.category_id = s.category_id

LEFT JOIN specifics sf
    ON sf.specific_id = s.specific_id

LEFT JOIN medicine_substances ms
    ON s.substance_id = ms.substance_id

LEFT JOIN medicines m
    ON ms.medicine_id = m.medicine_id

LEFT JOIN substance_names sn
    ON s.substance_id = sn.substance_id

LEFT JOIN sub_chemical_names scn
    ON s.substance_id = scn.substance_id

LEFT JOIN dosages d
    ON s.substance_id = d.substance_id

LEFT JOIN warnings w
    ON w.substance_id = s.substance_id

LEFT JOIN restriction_rules r
    ON s.substance_id = r.substance_id
    AND r.sports_id = (
        SELECT sports_id
        FROM sports
        WHERE sports_name = ?
    )
    AND r.country_id = (
        SELECT country_id
        FROM countries
        WHERE country_name = ?
    )

LEFT JOIN sports sp
    ON r.sports_id = sp.sports_id

LEFT JOIN countries c
    ON r.country_id = c.country_id

WHERE
(
    (
        EXISTS (
            SELECT 1
            FROM brands bmap
            WHERE bmap.brand_name LIKE CONCAT('%', ?, '%')
        )
        AND EXISTS (
            SELECT 1
            FROM brands bmatch
            WHERE bmatch.brand_name LIKE CONCAT('%', ?, '%')
              AND bmatch.substance_id = s.substance_id
              AND (
                  EXISTS (
                      SELECT 1
                      FROM brand_sub_chemicals bmatchsc
                      WHERE bmatchsc.brand_id = bmatch.brand_id
                  )
                  OR TRIM(m.medicine_name) = TRIM(s.chemical_name)
              )
        )
    )
    OR
    (
        NOT EXISTS (
            SELECT 1
            FROM brands bmap
            WHERE bmap.brand_name LIKE CONCAT('%', ?, '%')
        )
        AND (
            m.medicine_name LIKE CONCAT('%', ?, '%')
            OR TRIM(s.chemical_name) LIKE CONCAT('%', ?, '%')
            OR TRIM(COALESCE(s.sub_chemical_name, '')) = ?
            OR EXISTS (
                SELECT 1
                FROM sub_chemical_names scsearch
                WHERE scsearch.substance_id = s.substance_id
                  AND scsearch.sub_chemical_name LIKE CONCAT('%', ?, '%')
            )
            OR sn.other_name LIKE CONCAT('%', ?, '%')
            OR EXISTS (
                SELECT 1
                FROM brands bsearch
                WHERE bsearch.substance_id = s.substance_id
                  AND bsearch.brand_name LIKE CONCAT('%', ?, '%')
            )
        )
    )
)

GROUP BY
    m.medicine_id,
    s.substance_id,
    sp.sports_id,
    c.country_id,
    r.status,
    d.dosage_information,
    w.warning_information

`, [
            medicine,
            medicine, medicine, medicine, medicine,
            sport, country,
            medicine, medicine, medicine,
            medicine, medicine, medicine,
            medicine, medicine, medicine
        ]);

        res.json({
            totalResults: results.length,
            results: results
        });

    } catch (error) {

        console.error("Database search error:", error);

        res.status(500).json({
            error: "Database search failed"
        });
    }
});


// ERROR HANDLER


app.use(function (error, req, res, next) {

    console.error("Server error:", error);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: "Image upload failed. Please use an image under 5MB."
        });
    }

    res.status(400).json({
        success: false,
        error: error.message || "Something went wrong."
    });
});


// START SERVER


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
