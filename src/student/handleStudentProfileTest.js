import mysql2 from "mysql2"
import adaptRequest from '../helpers/adapt-request.js'
import makeHttpError from "../helpers/http-error.js"
import checkingUserType from "../helpers/checking-user-type.js"

export default function handleStudentTest(req, res) {
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
            return acceptStudentTest(httpRequest)

        case 'GET':
            return getDataForTesting(httpRequest)

        default:
          return makeHttpError({
            statusCode: 405,
            errorMessage: `${httpRequest.method} method not allowed.`
          })
    }
    
    async function getDataForTesting(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if ( !await checkingUserType(pool, httpRequest.body.token, 0) ) throw new Error

        const [testingIsAvailable] = await pool.execute(`
        SELECT test_stage
        FROM teacher_student_course
        WHERE id = ?`,
        [httpRequest.queryParams.teacherStudentCourseId]
        );

        //  true 0, 2 Error 1,3
        if ((testingIsAvailable[0].test_stage % 2) != 0) throw new Error

        const [data] = await pool.execute(`
        SELECT question.id, question.question, question_cell_id
        FROM question
        JOIN question_cell ON question.question_cell_id = question_cell.id
        WHERE question_cell.course_id = (SELECT course_id
                                        FROM teacher_student_course
                                        WHERE id = ?)`,
                                        [httpRequest.queryParams.teacherStudentCourseId]
        );
            
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

    async function acceptStudentTest(httpRequest) { // данные запроса в виде obj
        const pool = mysql2.createPool({
            host: "localhost",
            user: "root",
            database: "english_school",
            password: ""
        }).promise();

        if ( !await checkingUserType(pool, httpRequest.body.token, 0) ) throw new Error

        let scores = 0;
        for (const value of httpRequest.body.answer) {
            const [[isСorrect]] = await pool.execute(`    
                SELECT id FROM
                question
                WHERE question.id = ? AND question.answer = ?`, [value.idQuestion, value.answer]);
                scores = (isСorrect.id == undefined) ? scores : scores + 1 
        }

        const date = new Date().toISOString().slice(0, 10);
        await pool.execute(`    
            INSERT INTO testing
            (teacher_student_id, date_of_passage, scores)
            VALUES ( ?, ?, ?)`, [httpRequest.queryParams.teacherStudentCourseId, date, scores]);

        await pool.execute(`
            UPDATE teacher_student_course
            SET test_stage = test_stage + 1
            WHERE id = ?`, [httpRequest.queryParams.teacherStudentCourseId]);
        
        await pool.end((err) => {
            if (err) { return console.error(err); }
        });

        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 200,
            data: JSON.stringify({"message": `кол-во правильных ответов ${scores}`})
        }
    }
}