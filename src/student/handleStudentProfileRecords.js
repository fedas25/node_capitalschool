import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleStudentProfileRecords(req, res) {
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
        //     return (httpRequest)

        case 'GET':
            return getStudentProfileRecords(httpRequest)

        default:
          return makeHttpError({
            statusCode: 405,
            errorMessage: `${httpRequest.method} method not allowed.`
          })
    }

    async function getStudentProfileRecords(httpRequest) { // данные запроса в виде obj
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

        const [data] = await pool.execute(`    
        SELECT record.date, record.time, record.type,
        record.teacher_id AS teacherId, teacher.name, teacher.surname, teacher.patronymic, teacher.link_to_session,
        record.course_id AS courseId
        FROM record
        JOIN student ON record.student_id = student.id
        JOIN teacher ON record.teacher_id = teacher.id
        JOIN course ON record.course_id = course.id
        WHERE record.passed = 0 AND record.student_id = ?`, [student.id]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify(data)
        }
    }

}