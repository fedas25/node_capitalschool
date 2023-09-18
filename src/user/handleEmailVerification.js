import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"

export default function handleEmailVerification(req, res) {
    const httpRequest = adaptRequest(req);
    student(httpRequest)
        .then(({ headers, statusCode, data }) =>
            res
                .set(headers)
                .status(statusCode)
                .send(data)
        )
        .catch(e => res.status(500).end())
}

async function student(httpRequest) {
    switch (httpRequest.method) {
        case 'POST':
            return emailVerification(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function emailVerification(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        const [email] = await pool.execute(`    
            SELECT email
            from verififcations
            WHERE CODE = ?`, [httpRequest.body.code]);

        if (email.length === 0) throw new Error

        await pool.execute(`    
            INSERT INTO user (PASSWORD, email, TYPE)
            VALUES ( ?, ?, 0)`,
            [httpRequest.body.password, email[0].email]);

        const [idUser] = await pool.execute(`    
            select id
            FROM user
            WHERE email = ?`, [email[0].email]);

        await pool.execute(`    
            INSERT INTO student (name, user_id)
            VALUES (?, ?)`,
            [httpRequest.body.name, idUser[0].id]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({message: "student registration has been completed"})
        }
    }

}