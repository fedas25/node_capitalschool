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
        case 'POST':
            return createRecord(httpRequest)

        case 'GET':
            return getDataForRecording(httpRequest)

        default:
          return makeHttpError({
            statusCode: 405,
            errorMessage: `${httpRequest.method} method not allowed.`
          })
    }

    async function getDataForRecording(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if ( !await checkingUserType(pool, httpRequest.body.token, 0) ) throw new Error  

        const data = {};

        [data.workHours] = await pool.execute(`    
            SELECT work_day.date, work_time.time, work_time.id AS workTimeId, work_day.id AS workDayId
            FROM work_day
            JOIN teacher ON teacher.id = work_day.teacher_id
            JOIN work_time ON work_time.work_day_id = work_day.id
            WHERE teacher.id = ?`, [httpRequest.pathParams.idTeacher]);

        [data.course] = await pool.execute(`    
            SELECT name, color
            FROM course
            WHERE course.id = ?`, [httpRequest.pathParams.idCourse]);

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

    async function createRecord(httpRequest) { // данные запроса в виде obj
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
            WHERE user.token = ?`, [22]);
        
        await pool.execute(`
            INSERT INTO english_school.record
            (date, time, type, course_id, teacher_id, student_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [httpRequest.queryParams.date,
            httpRequest.queryParams.time,
            httpRequest.queryParams.type,
            httpRequest.pathParams.idCourse,
            httpRequest.pathParams.idTeacher,
            student.id]);
        
        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify("record created")
        }
    }
}