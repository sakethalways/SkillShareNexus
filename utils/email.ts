import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html,
    });
}
