import express from 'express'
import mysql2 from "mysql2"
import adaptRequest from './helpers/adapt-request.js'

import hendleCourse from './course_hendler/index.js'
import handleStudentRecord from './student/handleStudentRecord.js'
import handleStudentProfileRecords from './student/handleStudentProfileRecords.js'
import handleStudentProfileRecordsCompleted from './student/handleStudentProfileRecordsCompleted.js'
import handleStudentProfileCourse from './student/handleStudentProfileCourse.js'
import handleStudentProfilEenrollInCourse from './student/handleStudentProfilEenrollInCourse.js'

const app = express();
app.use(express.json());

app.get('/', hendleMainPage);
app.get('/course/:id', controller);

app.use('/student/record/course/:idCourse/teacher/:idTeacher', handleStudentRecord);

app.use('/student/profile/records', handleStudentProfileRecords);
app.use('/student/profile/records-completed', handleStudentProfileRecordsCompleted);
app.use('/student/profile/course', handleStudentProfileCourse);

app.use('/student/profile/enroll-in-course', handleStudentProfilEenrollInCourse);



function controller(req, res) {
    const httpRequest = adaptRequest(req);
    hendleCourse(httpRequest)
        .then(({ headers, statusCode, data }) =>
            res
                .set(headers)
                .status(statusCode)
                .send(data)
        )
        .catch(e => res.status(500).end())
}

app.listen(3000, () => console.log(`Listening on port 3000`))

async function hendleMainPage(req, res) {
    const pool = mysql2.createPool({
        host: "localhost",
        user: "root",
        database: "english_school",
        password: ""
    }).promise();

    const data = new Object;
    [data.course] = await pool.execute('SELECT `name`, `id`, `discription`, `duraction_month`, `duraction_hour`, `price_hour`, `discount_on_first_payment_entire_course` FROM `english_school`.`course`');
    [data.teacher] = await pool.execute(`
        SELECT teacher.name, teacher.surname, teacher.patronymic, teacher.description,  course.name AS courseName, course.color from teacher
        JOIN course_teacher ON course_teacher.course_id = teacher.id
        JOIN course ON course_teacher.course_id = course.id`)
    // фоточку и аудио добавить надо + какие курсы препод ведёт ( название ) + их цвет
    await pool.end((err) => {
        if (err) { return console.error(err); }
        console.log("конец");
    });

    res.json(data)
};
