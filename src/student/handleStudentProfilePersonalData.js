import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleStudentRecord(req, res) {
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
        // case 'POST':
        //     return createRecord(httpRequest)

        // case 'GET':
        //     return getDataForRecording(httpRequest)

        case 'PUT':
            return setPersonalData(httpRequest)

        default:
          return makeHttpError({
            statusCode: 405,
            errorMessage: `${httpRequest.method} method not allowed.`
          })
    }
    

    async function setPersonalData(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if ( !await checkingUserType(pool, httpRequest.body.token, 0) ) throw new Error

         const [[student]] = await pool.execute(`    
            SELECT student.id
            FROM user
            JOIN student ON student.user_id = user.id
            WHERE user.token = ?`, [httpRequest.body.token]);
            
        await pool.execute('UPDATE student SET NAME = ? , surname = ?, last_name = ? WHERE id = ?',
            [httpRequest.queryParams.name, httpRequest.queryParams.surname, httpRequest.queryParams.patronymic, student.id]
            );
            
        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({"message": "student replaced his surname, first name, patronymic"})
        }
    }
}