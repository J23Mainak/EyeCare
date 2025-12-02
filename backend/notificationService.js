import nodemailer from "nodemailer";
import Reminder from "./models/Reminder.js";
import schedule from "node-schedule";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class NotificationService {
  constructor() {
    const emailUser = process.env.EMAIL_USER;
    const rawEmailPass = process.env.EMAIL_PASSWORD || "";
    const emailPass = rawEmailPass.replace(/\s+/g, "").trim();

    this.scheduledJobs = new Map();

    // Only configure transporter if we have credentials
    if (!emailUser || !emailPass) {
      console.warn(
        "EMAIL_USER or EMAIL_PASSWORD missing/empty. Email notifications will not be sent. " +
          "Set EMAIL_USER and a 16-char Gmail App Password (no spaces) in .env."
      );
      this.emailTransporter = null;
      return;
    }

    this.emailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      logger: process.env.NODE_ENV !== "production", // reduce logs in production
      debug: false,
    });

    if (process.env.NODE_ENV !== "production") {
      // Verify transporter immediately so we know at startup if credentials are invalid
      this.emailTransporter
        .verify()
        .then(() =>
          console.log("Email transporter verified and ready to send emails")
        )
        .catch((err) =>
          console.error(
            "Email transporter verification failed:",
            err && err.message ? err.message : err
          )
        );
    } else {
      // In production, still try verify but don't spam logs
      this.emailTransporter.verify().catch(() => {
        console.warn("Email transporter verification failed (production)");
      });
    }
  }

  generateEmailTemplate(title, note, dateTime) {
    return `<html>
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width,initial-scale=1" />
                    <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 40px 20px;
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: #fff;
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 25px 15px;
                        text-align: center;
                    }
                    .bell-icon {
                        width: 50px;
                        height: 50px;
                        background: #fff;
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 30px;
                        margin-bottom: 15px;
                    }
                    .header h1 {
                        color: #fff;
                        margin: 0;
                        font-size: 20px;
                        font-weight: bold;
                    }
                    .content {
                        padding: 30px 20px;
                        color: #2d3748;
                    }
                    .reminder-box {
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        border-left: 5px solid #667eea;
                        padding: 25px;
                        border-radius: 12px;
                        margin: 25px 0;
                    }
                    .reminder-title {
                        font-size: 22px;
                        font-weight: bold;
                        color: #2d3748;
                        margin-bottom: 12px;
                        display: flex;
                        align-items: center;
                    }
                    .reminder-title img {
                        width: 28px;
                        height: 28px;
                        object-fit: contain;
                        border-radius: 6px;
                        margin-right: 10px;
                        flex-shrink: 0;
                    }
                    .reminder-note {
                        font-size: 16px;
                        color: #4a5568;
                        line-height: 1.6;
                        margin-bottom: 15px;
                    }
                    .datetime {
                        display: inline-block;
                        background: #fff;
                        padding: 10px 20px;
                        border-radius: 25px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #667eea;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                    }
                    .footer {
                        background: #f7fafc;
                        padding: 20px 15px;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                        font-size: 13px;
                        color: #718096;
                    }
                    .health-tip {
                        background: #fff5f5;
                        border-left: 4px solid #fc8181;
                        padding: 15px;
                        margin-top: 25px;
                        border-radius: 8px;
                    }
                    </style>
                </head>
                <body>
                    <div class="container">
                    <div class="header">
                        <div class="bell-icon">🔔</div>
                        <h1>Health Reminder</h1>
                    </div>
                    <div class="content">
                        <p>
                        Hi there! 👋<br /><br />This is your friendly reminder to take care of
                        your health.
                        </p>

                        <!-- Reminder Box -->
                        <div class="reminder-box">
                        <div class="reminder-title">
                            <img
                            src="https://cvlc.in/wp-content/uploads/2018/06/b1.png"
                            alt="EyeCare"
                            />
                            ${title}
                        </div>
                        <div class="reminder-note">${note}</div>
                        <div class="datetime">
                            📅 ${new Date(dateTime).toLocaleString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                        </div>
                        </div>

                        <div class="health-tip">
                        <strong>💡 Health Tip:</strong>
                        <p style="margin: 6px 0 0 0">
                            Take medications on time to maximize effectiveness.
                        </p>
                        </div>
                    </div>
                    <div class="footer">
                        <p><strong>Clarity Retina Care</strong></p>
                        <p>Your trusted health companion 💙</p>
                        <p style="margin-top: 5px; font-size: 11px">
                        This is an automated reminder. Please do not reply to this email.
                        </p>
                    </div>
                    </div>
                </body>
            </html>`;
  }

  // send with retries (3 attempts, incremental backoff)
  async sendEmailNotification(email, title, note, dateTime) {
    if (!this.emailTransporter) {
      console.warn(
        "Email transporter not configured; cannot send email to",
        email
      );
      return { success: false, error: "Transporter not configured" };
    }

    const mailOptions = {
      from: `"EyeCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Reminder: ${title}`,
      html: this.generateEmailTemplate(title, note, dateTime),
    };

    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const info = await this.emailTransporter.sendMail(mailOptions);
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `Email sent successfully to ${email} (attempt ${attempt})`,
            info && info.response ? info.response : ""
          );
        } else {
          console.log(`Email sent to ${email} (attempt ${attempt})`);
        }
        return { success: true };
      } catch (error) {
        const msg = error && error.message ? error.message : String(error);
        console.error(
          `Email sending failed (attempt ${attempt}) for ${email}:`,
          msg
        );
        if (attempt < maxAttempts) {
          const backoff = attempt * 700; // ms
          console.log(`   ↻ Retrying in ${backoff}ms...`);
          await sleep(backoff);
          continue;
        }
        return {
          success: false,
          error: msg,
        };
      }
    }
  }

  async _processReminder(reminder) {
    console.log(`\n📨 Processing: ${reminder.title}`);

    let result;
    if (reminder.notificationType === "email") {
      result = await this.sendEmailNotification(
        reminder.contactInfo,
        reminder.title,
        reminder.note,
        reminder.dateTime
      );
    } else if (reminder.notificationType === "sms") {
      // SMS not implemented yet - mark as failed
      result = { success: false, error: "SMS not implemented" };
    }

    if (result && result.success) {
      reminder.status = "sent";
      reminder.sentAt = new Date();
      reminder.error = undefined;
      console.log(`Status: Sent successfully`);
    } else {
      reminder.status = "failed";
      reminder.error = result?.error || "Unknown error";
      console.log(`Status: Failed - ${reminder.error}`);
    }

    try {
      await reminder.save();
    } catch (err) {
      console.error(
        "Failed to save reminder status:",
        err && err.message ? err.message : err
      );
    }
  }

  scheduleReminder(reminder) {
    try {
      const reminderIdStr = reminder._id.toString();

      // Cancel existing job if present
      if (this.scheduledJobs.has(reminderIdStr)) {
        const existing = this.scheduledJobs.get(reminderIdStr);
        try {
          existing.cancel();
        } catch (e) {}
        this.scheduledJobs.delete(reminderIdStr);
        console.log(`Cancelled existing job for reminder: ${reminderIdStr}`);
      }

      const reminderDate = new Date(reminder.dateTime);
      if (isNaN(reminderDate.getTime())) {
        console.error(
          `Invalid dateTime for reminder ${reminderIdStr}: ${reminder.dateTime}`
        );
        return false;
      }
      if (reminderDate <= new Date()) {
        console.warn(
          `Reminder ${reminderIdStr} date is in the past; skipping scheduling.`
        );
        return false;
      }

      console.log(
        `Scheduling "${reminder.title}" for ${reminderDate.toLocaleString()}`
      );

      // Use node-schedule for better reliability
      const job = schedule.scheduleJob(reminderDate, async () => {
        try {
          // Verify reminder still exists before processing
          const existingReminder = await Reminder.findById(reminder._id);
          if (existingReminder && existingReminder.status === "pending") {
            await this._processReminder(existingReminder);
          } else {
            console.log(
              `Reminder ${reminderIdStr} was deleted or already processed`
            );
          }
        } catch (err) {
          console.error(
            `Error processing reminder ${reminderIdStr}:`,
            err && err.message ? err.message : err
          );
        } finally {
          // Clean up after execution
          this.scheduledJobs.delete(reminderIdStr);
        }
      });

      if (!job) {
        console.error(`Failed to schedule job for reminder ${reminderIdStr}`);
        return false;
      }

      // Store the job for potential cancellation
      this.scheduledJobs.set(reminderIdStr, job);
      return true;
    } catch (err) {
      console.error(
        "scheduleReminder unexpected error:",
        err && err.message ? err.message : err
      );
      return false;
    }
  }

  // Cancel a scheduled reminder
  cancelScheduledReminder(reminderId) {
    const reminderIdStr = reminderId.toString();
    const job = this.scheduledJobs.get(reminderIdStr);
    if (job) {
      try {
        job.cancel();
      } catch (e) {}
      this.scheduledJobs.delete(reminderIdStr);
      console.log(`Cancelled scheduled reminder: ${reminderIdStr}`);
      return true;
    }
    return false;
  }

  // Cancel ALL scheduled reminders (useful for graceful shutdown)
  cancelAllScheduled() {
    for (const [id, job] of this.scheduledJobs.entries()) {
      try {
        job.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.scheduledJobs.clear();
    console.log("All scheduled reminder jobs cleared.");
  }

  async restorePendingReminders() {
    try {
      const now = new Date();
      const pendingReminders = await Reminder.find({
        status: "pending",
        dateTime: { $gt: now }, // Only future reminders
      });

      console.log(
        `\nRestoring ${pendingReminders.length} pending reminders...`
      );

      for (const reminder of pendingReminders) {
        this.scheduleReminder(reminder);
      }

      console.log(`✅ All pending reminders restored\n`);
    } catch (error) {
      console.error(
        "❌ Error restoring reminders:",
        error && error.message ? error.message : error
      );
    }
  }
}

export default new NotificationService();