const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./src/routes/auth');
const petRoutes = require('./src/routes/pets');
const notificationRoutes = require('./src/routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'poop-buddy-super-secret-💩',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);

app.use((req, res, next) => {
  res.locals.currentUsername = req.session.username || null;
  next();
});

app.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/dashboard' : '/login');
});

app.use(authRoutes);
app.use(petRoutes);
app.use(notificationRoutes);

app.use((req, res) => {
  res.status(404).render('error', { message: 'الصفحة ضايعة 💨' });
});

app.listen(PORT, () => {
  console.log(`💩 Poop Buddy running on http://localhost:${PORT}`);
});
