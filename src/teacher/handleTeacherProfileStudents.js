import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleTeacherProfileStudents(req, res) {
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
            return getTeacherProfileStudents(httpRequest)

        // case 'PUT':
        //     return payForHoursCourse(httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function getTeacherProfileStudents(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if (!await checkingUserType(pool, httpRequest.body.token, 1)) throw new Error

        let data = {};

        // переписать под чистые фун попробовать

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

        const [records] = await pool.execute(`    
            SELECT record.id as recordId, record.date, record.time
            FROM record
            JOIN teacher ON teacher.id = record.teacher_id
            JOIN user ON teacher.user_id = user.id
            WHERE user.token = 12 AND DATE(record.date) > DATE(NOW())`, [httpRequest.body.token]);
        data.records = records;

        const [students] = await pool.execute(`    
        SELECT DISTINCT student.name, student.surname, student.last_name,
        course.name, course.color,
        teacher_student_course.id AS teacherStudentCourseID
        FROM teacher
        JOIN teacher_student_course ON teacher_student_course.teacher_id = teacher.id
        JOIN student ON teacher_student_course.student_id = student.id
        JOIN course ON teacher_student_course.course_id = course.id
        JOIN question_cell ON course.id = question_cell.course_id
        JOIN user ON teacher.user_id = user.id
        WHERE user.token = ?`, [httpRequest.body.token])
        data.students = students;

        for (let i = 0; i < data.students.length; i++) {
            const [studentsScores] = await pool.execute(`            
                SELECT testing.scores, testing.date_of_passage
                FROM testing
                JOIN teacher_student_course ON testing.teacher_student_id = teacher_student_course.id
                WHERE teacher_student_course.id = ?`, [data.students[i].teacherStudentCourseID]);
            data.students[i].studentsScores = studentsScores;

            const [[numberQuestionsCellInTestOnCourse]] = await pool.execute(`            
                SELECT teacher_student_course.id AS teacherStudentCourseId,
                COUNT(question_cell.id) AS numberQuestionsCellInTest
                FROM teacher_student_course
                JOIN question_cell ON teacher_student_course.course_id = question_cell.course_id
                WHERE teacher_student_course.id = ?
                GROUP BY teacher_student_course.id`, [data.students[i].teacherStudentCourseID]);
            data.students[i].numberQuestionsCellInTestOnCourse = numberQuestionsCellInTestOnCourse;

            const [[completedTotalSessions]] = await pool.execute(`            
                SELECT teacher_student_course.number_of_sessions_completed,
                course.duraction_hour
                FROM teacher_student_course
                JOIN course ON teacher_student_course.course_id = course.id
                WHERE teacher_student_course.id = 5`, [data.students[i].teacherStudentCourseID]);
            data.students[i].completedTotalSessions = completedTotalSessions;
        }


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

        const [[course]] = await pool.execute(`    
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
            data: JSON.stringify({ message: "watch was paid" })
        }

        function pay(price) {
            return true
        }
    }

}