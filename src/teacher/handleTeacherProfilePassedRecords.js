import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleTeacherProfilePassedRecords(req, res) {
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
            return getTeacherProfilePassedRecords(httpRequest)

        case 'PUT':
            return setPassed(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function getTeacherProfilePassedRecords(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 1)) throw new Error

        let data = {};
        
        const [[dataTeacher]] = await pool.execute(`    
            SELECT teacher.id, teacher.name, teacher.surname, teacher.patronymic, teacher.link_to_session, 
            user.email, user.password
            FROM teacher
            JOIN user ON teacher.user_id = user.id
            WHERE user.token = ?`, [httpRequest.body.token]);
        data.teacherInfo = dataTeacher;

        const [teacherCourse] = await pool.execute(`    
            SELECT course.name AS courseName, course.color, course.id AS courseId
            FROM teacher
            JOIN user ON teacher.user_id = user.id
            JOIN course_teacher ON teacher.id = course_teacher.teacher_id
            JOIN course ON course_teacher.course_id = course.id
            WHERE user.token = ?`, [httpRequest.body.token]);
        data.course = teacherCourse;

        const [passedRecords] = await pool.execute(`    
            SELECT record.id, record.date, record.time, record.type, record.course_id, record.passed,
            student.name, student.surname, student.last_name,
            teacher_student_course.id AS teacherStudentCourseId
            FROM record
            JOIN teacher ON teacher.id = record.teacher_id
            JOIN user ON teacher.user_id = user.id
            JOIN student ON record.student_id = student.id
            JOIN teacher_student_course ON student.id = teacher_student_course.student_id
            WHERE user.token = ? AND DATE(record.date) < DATE(NOW())`, [httpRequest.body.token]);
        data.passedRecords = passedRecords;

        // ДЛЯ календаря
        const [records] = await pool.execute(`    
        SELECT record.id, record.date, record.time, record.course_id
        FROM record
        JOIN teacher ON teacher.id = record.teacher_id
        JOIN user ON teacher.user_id = user.id
        WHERE user.token = 12 AND DATE(record.date) > DATE(NOW())`, [httpRequest.body.token]);
        data.records = records;

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
            data: JSON.stringify({message: "attendance is marked"})
        }
    }
}