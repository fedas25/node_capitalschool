import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleAdminProfileTest(req, res) {
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
            return createTest(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function createTest(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 2)) throw new Error

        if (httpRequest.pathParams.type === 'cell')
            await pool.execute(`
                INSERT INTO question_cell (course_id)
                VALUES (?)`,
                [httpRequest.body.idCourse]);
        else {
            await pool.execute(`
                INSERT INTO question (question_cell_id, question, answer)
                VALUES (?, ?, ?)`,
                [httpRequest.body.idCell, JSON.stringify(httpRequest.body.question), httpRequest.body.answer]);
        }

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify("teacher is installed on the course")
        }
    }
}