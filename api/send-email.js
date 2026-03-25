export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { to, subject, html, name } = req.body;

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: "HSPM <newsletter@hisspiritandpowerministry.org>",
            to,
            subject,
            html
        })
    });

    const data = await response.json();

    if (!response.ok) {
        return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
}