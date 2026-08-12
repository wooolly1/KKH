const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_ء-ي]+$/.test(username)) {
    return res.render('register', {
      error: 'اسم المستخدم لازم يكون بين 3 و20 حرف (حروف وأرقام فقط).',
    });
  }
  if (password.length < 4) {
    return res.render('register', { error: 'كلمة المرور لازم تكون 4 أحرف على الأقل.' });
  }
  if (db.findUserByUsername(username)) {
    return res.render('register', { error: 'اسم المستخدم موجود من قبل، جرّب اسم ثاني.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser({ username, passwordHash });
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = db.findUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.render('login', { error: 'اسم المستخدم أو كلمة المرور غلط.' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
