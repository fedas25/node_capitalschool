import mysql2 from "mysql2"
import makeHttpError from "../helpers/http-error.js"

export default async function handleCourse(httpRequest) {
    switch (httpRequest.method) {
        case 'POST':
            return postContact(httpRequest)

        case 'GET':
            return getCourseId(httpRequest)

        default:
          return makeHttpError({
            statusCode: 405,
            errorMessage: `${httpRequest.method} method not allowed.`
          })
    }

    async function getCourseId(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        const idCourse = [httpRequest.pathParams.id];

        const data = new Object;
        [data.course] = await pool.execute(`
            SELECT name, color, discription, duraction_month, duraction_hour, price_hour, discount_on_first_payment_entire_course, stages
            FROM course
            WHERE id = ?`, idCourse);

        [data.idTeachersOnCourse] = await pool.execute(`
        SELECT teacher.id AS teacherid from teacher
        JOIN course_teacher ON course_teacher.course_id = teacher.id
        WHERE course_teacher.course_id = ?`, idCourse);

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