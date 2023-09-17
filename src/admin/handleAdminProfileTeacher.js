import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleAdminProfileTeacher(req, res) {
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
            return createTeacher(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function createTeacher(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 2)) throw new Error

        const [user] = await pool.execute(
        `INSERT INTO english_school.user (password, email, type)
        VALUES (?, ?, 1)`,
        [httpRequest.body.password, httpRequest.body.email]);

        await pool.execute(
        `INSERT INTO teacher
        (name, surname, patronymic, description, link_to_session, certificates, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [httpRequest.body.name, httpRequest.body.surname, httpRequest.body.patronymic,
        httpRequest.body.description, httpRequest.body.link_to_session,
        JSON.stringify(httpRequest.body.certificates), user.insertId]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify("teacher created")
        }
    }
}