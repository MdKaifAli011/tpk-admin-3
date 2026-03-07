# Mail configuration and lead export email

Add these variables to your `.env` file for SMTP mail and lead export notifications.

## Mail (SMTP)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=donot-reply@testprepkart.in
MAIL_PASSWORD=your_mail_password_here
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=donot-reply@testprepkart.in
MAIL_FROM_NAME=Testprepkart
```

## Lead export notification

When an admin exports selected leads to CSV, the same export is emailed to this address:

```env
LEAD_EXPORT_MAIL_TO=hellomdkaifali@gmail.com
```

If `LEAD_EXPORT_MAIL_TO` is not set, it defaults to `hellomdkaifali@gmail.com`.

## Email subject

The export email subject is: **`YYYY-MM-DD HH:mm (exportCount) & (totalLeads)`**

Example: `2025-01-28 14:30 (10) & (19)` = 10 leads exported, 19 total leads.
