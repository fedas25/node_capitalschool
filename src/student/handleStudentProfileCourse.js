import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleStudentProfileCourse(req, res) {
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
            return getStudentProfileCourse(httpRequest)

        case 'PUT':
            return payForHoursCourse(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function getStudentProfileCourse(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 0)) throw new Error

        const [[student]] = await pool.execute(`    
            SELECT student.id
            FROM user
            JOIN student ON student.user_id = user.id
            WHERE user.token = ?`, [httpRequest.body.token]);

        const [data] = await pool.execute(`    
            SELECT  teacher_student_course.id, teacher_student_course.course_id, teacher_student_course.teacher_id, teacher_student_course.number_of_sessions_completed, teacher_student_course.number_of_paid_sessions,
            teacher.name, teacher.surname, teacher.patronymic, teacher.link_to_session,
            course.name, course.color, course.duraction_hour, course.price_hour, course.discount_on_first_payment_entire_course
            FROM teacher_student_course
            JOIN student ON student.id = teacher_student_course.student_id
            JOIN teacher ON teacher.id = teacher_student_course.teacher_id
            JOIN course ON course.id = teacher_student_course.course_id
            WHERE student.id = ?`, [student.id]);


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

    async function payForHoursCourse(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 0)) throw new Error

        const [[course]] =  await pool.execute(`    
        SELECT number_of_paid_sessions, course.price_hour
        FROM teacher_student_course 
        JOIN course ON course.id = teacher_student_course.course_id
        WHERE teacher_student_course.id = ?`, [httpRequest.queryParams.idTeacherStudentCourse]);
        
        const paymentAmount = Number(httpRequest.queryParams.numberOfHours) * Number(course.price_hour);

        if (!pay(paymentAmount)) throw new Error

        await pool.execute(`    
            UPDATE teacher_student_course
            SET number_of_paid_sessions = (? + ?) 
            WHERE id = ?;`, [course.number_of_paid_sessions, httpRequest.queryParams.numberOfHours, httpRequest.queryParams.idTeacherStudentCourse]);

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

        function pay(price) {
            return true
        }
    }

}