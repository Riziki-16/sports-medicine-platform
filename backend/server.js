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
    m.medicine_name AS search_for,
    TRIM(s.chemical_name) AS ingredient,
    GROUP_CONCAT(DISTINCT sn.other_name SEPARATOR ', ') AS other_names,
    sp.sports_name AS sport,
    c.country_name AS country,
    COALESCE(r.status, 'Not classified') AS status,
    d.dosage_information AS dosage,
    w.warning_information AS warning

    FROM medicines m

    LEFT JOIN medicine_substances ms
        ON m.medicine_id = ms.medicine_id

    LEFT JOIN substances s
        ON ms.substance_id = s.substance_id

    LEFT JOIN substance_names sn
        ON s.substance_id = sn.substance_id

    LEFT JOIN brands b
        ON s.substance_id = b.substance_id

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
        m.medicine_name = ?
        OR TRIM(SUBSTRING_INDEX(s.chemical_name, ' (', 1)) = ?
        OR sn.other_name = ?
        OR b.brand_name LIKE CONCAT('%', ?, '%')

    GROUP BY
        m.medicine_id,
        s.substance_id,
        sp.sports_id,
        c.country_id,
        r.status,
        d.dosage_information,
        w.warning_information
`, [sport, country, medicine, medicine, medicine, medicine]);

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