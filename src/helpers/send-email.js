import nodemailer from 'nodemailer'

export default async function sendEmail(code, email) {
    var mail = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'capitalonlineschool@gmail.com', // Your email id
            pass: 'wnzi qmuz gvwm ywbr' // Your password
        }
    });
    
    var mailOptions = {
        from: 'capitalonlineschool@gmail.com',
        to: email,
        subject: 'Подтверждение почты',
        text: `Ваш код подтверждения ${code}`};
    
    mail.sendMail(mailOptions, function(error, info) {
        if (error) console.log(error)
    });
}