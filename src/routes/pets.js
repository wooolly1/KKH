const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const HUES = [
  { key: 'original', label: 'أصلي', hue: 0 },
  { key: 'gold', label: 'ذهبي', hue: 40 },
  { key: 'rose', label: 'وردي', hue: 300 },
  { key: 'mint', label: 'نعناعي', hue: 140 },
  { key: 'grape', label: 'عنبي', hue: 260 },
  { key: 'icy', label: 'ثلجي', hue: 190 },
];

const ACCESSORIES = [
  { key: 'none', label: 'بدون', emoji: '' },
  { key: 'tophat', label: 'قبعة', emoji: '🎩' },
  { key: 'crown', label: 'تاج', emoji: '👑' },
  { key: 'bow', label: 'فيونكة', emoji: '🎀' },
  { key: 'shades', label: 'نظارة', emoji: '🕶️' },
  { key: 'flower', label: 'زهرة', emoji: '🌸' },
];

const AURAS = [
  { key: 'none', label: 'بدون', color: 'transparent' },
  { key: 'sun', label: 'شمسي', color: '#ffd76a' },
  { key: 'sky', label: 'سماوي', color: '#7fd6ff' },
  { key: 'blush', label: 'وردي', color: '#ff9ecf' },
  { key: 'leaf', label: 'أخضر', color: '#8be08b' },
  { key: 'grape', label: 'بنفسجي', color: '#c39bff' },
];

function findHue(key) {
  return HUES.find((h) => h.key === key) || HUES[0];
}
function findAccessory(key) {
  return ACCESSORIES.find((a) => a.key === key) || ACCESSORIES[0];
}
function findAura(key) {
  return AURAS.find((a) => a.key === key) || AURAS[0];
}

function decoratePet(pet) {
  return {
    ...pet,
    hueDeg: findHue(pet.hue).hue,
    auraColor: findAura(pet.aura).color,
    accessoryEmoji: findAccessory(pet.accessory).emoji,
  };
}

router.get('/build', requireAuth, (req, res) => {
  res.render('build', { hues: HUES, accessories: ACCESSORIES, auras: AURAS, error: null });
});

router.post('/build', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 24);
  const hue = String(req.body.hue || 'original');
  const aura = String(req.body.aura || 'none');
  const accessory = String(req.body.accessory || 'none');

  if (!name) {
    return res.render('build', {
      hues: HUES,
      accessories: ACCESSORIES,
      auras: AURAS,
      error: 'لازم تدي الخرا حقك اسم أول 💩',
    });
  }

  const pet = db.createPet({ ownerId: req.session.userId, name, hue, aura, accessory });
  res.redirect(`/pet/${pet.id}`);
});

router.get('/dashboard', requireAuth, (req, res) => {
  const myPets = db.getPetsOwnedBy(req.session.userId).map(decoratePet);
  const caringFor = db.getPetsInCareOf(req.session.userId).map((p) => {
    const owner = db.findUserById(p.ownerId);
    return { ...decoratePet(p), ownerName: owner ? owner.username : '؟' };
  });
  const unreadCount = db.getUnreadCount(req.session.userId);

  res.render('dashboard', { myPets, caringFor, unreadCount });
});

router.get('/pet/:id', requireAuth, (req, res) => {
  const pet = db.getPetById(req.params.id);
  if (!pet) return res.status(404).render('error', { message: 'ما لقينا هالخرا 😅' });

  const isOwner = pet.ownerId === req.session.userId;
  const isCaretaker = pet.status === 'sent' && pet.caretakerId === req.session.userId;

  if (!isOwner && !isCaretaker) {
    return res.status(403).render('error', { message: 'هذا مو خرا حقك! 🙅' });
  }

  const owner = db.findUserById(pet.ownerId);
  const caretaker = pet.caretakerId ? db.findUserById(pet.caretakerId) : null;

  res.render('pet', {
    pet: decoratePet(pet),
    isOwner,
    isCaretaker,
    ownerName: owner ? owner.username : '؟',
    caretakerName: caretaker ? caretaker.username : null,
    error: req.query.error || null,
  });
});

router.post('/pet/:id/send', requireAuth, (req, res) => {
  const pet = db.getPetById(req.params.id);
  if (!pet || pet.ownerId !== req.session.userId) {
    return res.status(403).render('error', { message: 'ما تقدر ترسل خرا مو حقك!' });
  }
  if (pet.status === 'sent') {
    return res.redirect(`/pet/${pet.id}`);
  }

  const partnerUsername = String(req.body.partnerUsername || '').trim();
  const partner = db.findUserByUsername(partnerUsername);

  if (!partner) {
    return res.redirect(`/pet/${pet.id}?error=${encodeURIComponent('ما لقينا هذا المستخدم')}`);
  }
  if (partner.id === req.session.userId) {
    return res.redirect(`/pet/${pet.id}?error=${encodeURIComponent('ما تقدر ترسله لنفسك 😂')}`);
  }

  db.sendPetToPartner(pet.id, partner.id);
  db.createNotification({
    userId: partner.id,
    message: `${req.session.username} أرسل لك "${pet.name}" 💩 عشان تعتني فيه!`,
    petId: pet.id,
    fromUserId: req.session.userId,
  });

  res.redirect(`/pet/${pet.id}`);
});

const ACTION_LABELS = {
  feed: { verb: 'أطعم', emoji: '🍔' },
  play: { verb: 'لعب مع', emoji: '🎮' },
  clean: { verb: 'نظّف', emoji: '🧼' },
};

router.post('/pet/:id/care', requireAuth, (req, res) => {
  const pet = db.getPetById(req.params.id);
  if (!pet || pet.status !== 'sent' || pet.caretakerId !== req.session.userId) {
    return res.status(403).render('error', { message: 'ما تقدر تعتني بهالخرا!' });
  }

  const action = String(req.body.action || '');
  if (!ACTION_LABELS[action]) {
    return res.redirect(`/pet/${pet.id}`);
  }

  const updated = db.careForPet(pet.id, action);
  const { verb, emoji } = ACTION_LABELS[action];

  db.createNotification({
    userId: pet.ownerId,
    message: `${req.session.username} جالس يعتني بـ"${pet.name}" 💩 (${verb} ${emoji})`,
    petId: pet.id,
    fromUserId: req.session.userId,
  });

  res.redirect(`/pet/${updated.id}`);
});

module.exports = router;
