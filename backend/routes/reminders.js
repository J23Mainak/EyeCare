import express from 'express';
import { body, validationResult } from 'express-validator';
import Reminder from '../models/Reminder.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reminders
// @desc    Get all reminders for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user.id })
      .sort({ dateTime: 1 });
    
    console.log(`📋 Found ${reminders.length} reminders for user ${req.user.id}`);
    res.json({ reminders });
  } catch (error) {
    console.error('Fetch reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// @route   POST /api/reminders
// @desc    Create new reminder
// @access  Private
router.post('/', [
  auth,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('note').trim().notEmpty().withMessage('Note is required'),
  body('dateTime').isISO8601().withMessage('Valid date and time required'),
  body('notificationType').isIn(['email', 'sms']).withMessage('Notification type must be email or sms'),
  body('contactInfo').trim().notEmpty().withMessage('Contact info is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, note, dateTime, notificationType, contactInfo } = req.body;

    const reminderDate = new Date(dateTime);
    const now = new Date();
    
    if (reminderDate <= now) {
      return res.status(400).json({ success: false, error: 'Reminder date must be in the future' });
    }

    const reminder = new Reminder({
      userId: req.user.id,
      title,
      note,
      dateTime: reminderDate,
      notificationType,
      contactInfo
    });

    await reminder.save();
    
    console.log(`✅ Reminder created: ${title} for ${reminderDate.toLocaleString()}`);
    console.log(`   Type: ${notificationType}, Contact: ${contactInfo}`);
    
    // 🔹 Schedule the reminder (no polling needed)
    const notificationService = (await import('../notificationService.js')).default;
    notificationService.scheduleReminder(reminder);
    
    res.status(201).json({ success: true, reminder });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create reminder' });
  }
});

// @route   DELETE /api/reminders/:id
// @desc    Delete reminder
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Cancel scheduled notification if exists
    const notificationService = (await import('../notificationService.js')).default;
    notificationService.cancelScheduledReminder(req.params.id);

    // Delete from database
    await Reminder.deleteOne({ _id: req.params.id });
    console.log(`🗑️ Reminder deleted: ${reminder.title}`);
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;