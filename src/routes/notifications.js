const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/notifications', requireAuth, (req, res) => {
  const notifications = db.getNotifications(req.session.userId);
  db.markAllRead(req.session.userId);
  res.render('notifications', { notifications });
});

router.get('/api/notifications/unread-count', requireAuth, (req, res) => {
  res.json({ count: db.getUnreadCount(req.session.userId) });
});

router.get('/api/notifications/latest', requireAuth, (req, res) => {
  const notifications = db.getNotifications(req.session.userId).slice(0, 5);
  res.json({ notifications });
});

module.exports = router;
