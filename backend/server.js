require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");


const app = express();

app.use(cors());

const PORT = 3000;

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

app.get("/", function (req, res) {
    res.send("Sports Medicine API is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

db.getConnection()
  .then(connection => {
    console.log("MySQL database connected!");
    connection.release();
  })
  .catch(error => {
    console.error("Database connection failed:", error);
  });

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
    NULLIF(TRIM(s.sub_chemical_name), ''),
    (
        SELECT MIN(bn.brand_name)
        FROM brands bn
        WHERE bn.substance_id = s.substance_id
    ),
    TRIM(s.chemical_name)
) AS search_for,
TRIM(s.chemical_name) AS ingredient,
cat.category_name AS category,
s.sub_chemical_name AS sub_chemical_name,
sf.specific_code AS specific_code,
sf.specific_name AS specific_name,
    GROUP_CONCAT(DISTINCT sn.other_name SEPARATOR ', ') AS other_names,
    (
    SELECT GROUP_CONCAT(
        DISTINCT bg.brand_name
        ORDER BY bg.brand_name
        SEPARATOR ', '
    )
    FROM brands bg
    JOIN substances sg
        ON sg.substance_id = bg.substance_id
    WHERE TRIM(sg.chemical_name) = TRIM(s.chemical_name)
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
    WHERE b2.substance_id = s.substance_id
) AS brands,
    sp.sports_name AS sport,
    c.country_name AS country,
    COALESCE(r.status, 'Not classified') AS status,
    d.dosage_information AS dosage,
    w.warning_information AS warning

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
    s.category_id IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM categories cat
        WHERE cat.category_id = s.category_id
          AND cat.category_name IN ('S1', 'S2', 'S3', 'S4', 'S5')
    )
    AND (
        m.medicine_name = ?
        OR TRIM(SUBSTRING_INDEX(s.chemical_name, ' (', 1)) = ?
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
     GROUP BY
        m.medicine_id,
        s.substance_id,
        sp.sports_id,
        c.country_id,
        r.status,
        d.dosage_information,
        w.warning_information
`, [sport, country, medicine, medicine, medicine, medicine, medicine, medicine]);

       res.json({
    totalResults: results.length,
    results: results
});

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database search failed"
        });
    }
});