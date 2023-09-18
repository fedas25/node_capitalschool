import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"

export default function handleLogIn(req, res) {
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
        case 'PUT':
            return logIn(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function logIn(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        let data = {};

        const [userFound] = await pool.execute(`    
            SELECT id, type
            from user
            WHERE email = "${httpRequest.body.email}"
            AND password = "${httpRequest.body.password}"`);

        if (userFound.length === 0) throw new Error

        data.token = Math.floor(1000 + Math.random() * 10e6);

        await pool.execute(`    
            UPDATE user
            SET token = ?
            WHERE id = ?`, [data.token, userFound[0].id]);
        
        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({
                message: "log in has been completed",
                token: data.token
            })
        }
    }

}