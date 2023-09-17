import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleAdminProfileCourse(req, res) {
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
            return createCourse(httpRequest)

        // case 'GET':
        //     return getTeacherProfilePassedRecords(httpRequest)

        // case 'PUT':
        //     return setPassed(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function createCourse(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 2)) throw new Error

        await pool.execute(`
            INSERT INTO course (name, color, discription, duraction_month, duraction_hour, price_hour, discount_on_first_payment_entire_course, stages)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [httpRequest.body.name, httpRequest.body.color, httpRequest.body.discription,
            httpRequest.body.duraction_month, httpRequest.body.duraction_hour,
            httpRequest.body.price_hour, httpRequest.body.discount_on_first_payment_entire_course,
            JSON.stringify(httpRequest.body.stages)]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({ message: "course created" })
        }
    }

    async function setPassed(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 1)) throw new Error

        await pool.execute(`    
            UPDATE record SET
            passed = ?
            WHERE id = ?;`, [httpRequest.queryParams.passed, httpRequest.queryParams.idRecord]);
        // добавить ограничения нельзя больше уроков пройти чем кол-во часов на курсе
        await pool.execute(`    
            UPDATE teacher_student_course
            SET number_of_sessions_completed = number_of_sessions_completed + 1
            WHERE id = ?`, [httpRequest.queryParams.teacherStudentCourseId]);
        // нельзя уменьшить кол-во оплаченных сессий если они равны 0
        await pool.execute(`    
            UPDATE teacher_student_course
            SET number_of_paid_sessions = number_of_paid_sessions - 1
            WHERE id = ? AND`, [httpRequest.queryParams.teacherStudentCourseId]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({ message: "attendance is marked" })
        }
    }
}