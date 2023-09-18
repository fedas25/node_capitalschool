import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import sendEmail from "./../helpers/send-email.js"

export default function handleUserSendMail(req, res) {
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
            return userSendMail(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function userSendMail(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();
        
        const [duplicateMail] =  await pool.execute(`    
            SELECT email
            from verififcations
            WHERE email = "${httpRequest.body.email}"`);

        const code = Math.floor(1000 + Math.random() * 9000);

        if (duplicateMail.length === 0) {
            await pool.execute(`    
                INSERT INTO verififcations (email, code)
                VALUES (?, ?)`, [httpRequest.body.email, code]);
        } else {
            await pool.execute(`    
                UPDATE verififcations
                SET code = ?
                WHERE email = "${httpRequest.body.email}"`, [code]);
        }

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        await sendEmail(code, httpRequest.body.email)

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify("код на почту отправлен")
        }
    }

}