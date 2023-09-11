import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleStudentProfilEenrollInCourse(req, res) {
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
            return getProfilEenrollInCourse(httpRequest)

        // case 'GET':
        //     return (httpRequest)

        default:
            return makeHttpError({
                statusCode: 405,
                errorMessage: `${httpRequest.method} method not allowed.`
            })
    }

    async function getProfilEenrollInCourse(httpRequest) { // данные запроса в виде obj
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

        const [[course]] = await pool.execute(`    
            SELECT course.price_hour, course.duraction_hour, course.discount_on_first_payment_entire_course
            FROM course
            WHERE course.id = ?`, [httpRequest.queryParams.idCourse]);
        
        let discount = (Number(course.discount_on_first_payment_entire_course) / 100); // тернарка ?
        discount = (discount === 0) ? 1 : discount;

        let paymentAmount // тернарка просится 

        if (Number(httpRequest.queryParams.numberOfHours) == Number(course.duraction_hour)) {
            paymentAmount = Number(httpRequest.queryParams.numberOfHours) * Number(course.price_hour) * discount;
        } else {
            paymentAmount = Number(httpRequest.queryParams.numberOfHours) * Number(course.price_hour);
        }

        if (!pay(paymentAmount)) throw new Error

        await pool.execute(`
        INSERT INTO english_school.teacher_student_course
        (course_id, teacher_id, student_id, number_of_paid_sessions)
        VALUES (?, ?, ?, ?)`,
        [httpRequest.queryParams.idCourse, httpRequest.queryParams.idTeacher, student.id, httpRequest.queryParams.numberOfHours]);

        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({message: "the student enrolled in the course"})
        }

        function pay(price) {
            return true
        }
    }

}