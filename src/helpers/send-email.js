import nodemailer from 'nodemailer'

export default async function sendEmail(code, email) {
    var mail = nodemailer.createTransport({
        service: 'yandex',
        auth: {
            user: 'uasily.lol@yandex.ru', // Your email id
            pass: '866711221' // Your password
        }
    });
    
    var mailOptions = {
        from: 'uasily.lol@yandex.ru',
        to: email,
        subject: 'Подтверждение почты',
        text: `Ваш код подтверждения ${code}`};
    
    mail.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log(1);
    }});
}