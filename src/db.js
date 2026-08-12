const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const EMPTY_DB = { users: [], pets: [], notifications: [] };

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { ...EMPTY_DB };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function id() {
  return crypto.randomBytes(9).toString('base64url');
}

// ---------- users ----------

function findUserByUsername(username) {
  const db = readDB();
  return db.users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
}

function findUserById(userId) {
  const db = readDB();
  return db.users.find((u) => u.id === userId);
}

function createUser({ username, passwordHash }) {
  const db = readDB();
  const user = {
    id: id(),
    username,
    passwordHash,
    createdAt: Date.now(),
  };
  db.users.push(user);
  writeDB(db);
  return user;
}

// ---------- pets ----------

const DECAY_PER_MS = 1 / (15 * 60 * 1000); // 1 point per 15 minutes

function applyDecay(pet) {
  const elapsed = Date.now() - pet.updatedAt;
  const drop = Math.floor(elapsed * DECAY_PER_MS);
  if (drop <= 0) return pet;
  return {
    ...pet,
    hunger: Math.max(0, pet.hunger - drop),
    happiness: Math.max(0, pet.happiness - drop),
    cleanliness: Math.max(0, pet.cleanliness - drop),
  };
}

function createPet({ ownerId, name, hue, aura, accessory }) {
  const db = readDB();
  const pet = {
    id: id(),
    ownerId,
    name,
    hue,
    aura,
    accessory,
    hunger: 70,
    happiness: 70,
    cleanliness: 70,
    status: 'home', // 'home' | 'sent'
    caretakerId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.pets.push(pet);
  writeDB(db);
  return pet;
}

function getPetById(petId) {
  const db = readDB();
  const pet = db.pets.find((p) => p.id === petId);
  return pet ? applyDecay(pet) : null;
}

function getPetsOwnedBy(userId) {
  const db = readDB();
  return db.pets.filter((p) => p.ownerId === userId).map(applyDecay);
}

function getPetsInCareOf(userId) {
  const db = readDB();
  return db.pets
    .filter((p) => p.status === 'sent' && p.caretakerId === userId)
    .map(applyDecay);
}

function sendPetToPartner(petId, partnerId) {
  const db = readDB();
  const pet = db.pets.find((p) => p.id === petId);
  if (!pet) return null;
  pet.status = 'sent';
  pet.caretakerId = partnerId;
  pet.sentAt = Date.now();
  pet.updatedAt = Date.now();
  writeDB(db);
  return pet;
}

const CARE_EFFECTS = {
  feed: { hunger: 25 },
  play: { happiness: 25 },
  clean: { cleanliness: 25 },
};

function careForPet(petId, action) {
  const db = readDB();
  const pet = db.pets.find((p) => p.id === petId);
  if (!pet) return null;
  const decayed = applyDecay(pet);
  pet.hunger = decayed.hunger;
  pet.happiness = decayed.happiness;
  pet.cleanliness = decayed.cleanliness;

  const effect = CARE_EFFECTS[action];
  if (effect) {
    for (const [stat, amount] of Object.entries(effect)) {
      pet[stat] = Math.min(100, pet[stat] + amount);
    }
  }
  pet.updatedAt = Date.now();
  writeDB(db);
  return pet;
}

// ---------- notifications ----------

function createNotification({ userId, message, petId, fromUserId }) {
  const db = readDB();
  const note = {
    id: id(),
    userId,
    message,
    petId,
    fromUserId,
    read: false,
    createdAt: Date.now(),
  };
  db.notifications.push(note);
  writeDB(db);
  return note;
}

function getNotifications(userId) {
  const db = readDB();
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function getUnreadCount(userId) {
  const db = readDB();
  return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}

function markAllRead(userId) {
  const db = readDB();
  let changed = false;
  for (const n of db.notifications) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeDB(db);
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  createPet,
  getPetById,
  getPetsOwnedBy,
  getPetsInCareOf,
  sendPetToPartner,
  careForPet,
  createNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
};
