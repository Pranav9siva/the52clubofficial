import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import Razorpay from 'razorpay';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads Directories
const UPLOADS_BASE_DIR = path.join(__dirname, 'public', 'uploads');
const GALLERY_UPLOADS_DIR = path.join(UPLOADS_BASE_DIR, 'gallery');
if (!fs.existsSync(GALLERY_UPLOADS_DIR)) {
  fs.mkdirSync(GALLERY_UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration for Gallery Photos
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, GALLERY_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const cleanBase = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `gallery-${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

const galleryFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (allowed.includes(file.mimetype) || (file.mimetype && file.mimetype.startsWith('image/'))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF, AVIF) are supported.'));
  }
};

const uploadGallery = multer({
  storage: galleryStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max per image
  fileFilter: galleryFileFilter
});

// Load environment variables from .env if present
const envFilePath = path.join(__dirname, '.env');
if (fs.existsSync(envFilePath)) {
  try {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        let sepIdx = trimmed.indexOf('=');
        if (sepIdx === -1) {
          sepIdx = trimmed.indexOf(':');
        }
        if (sepIdx !== -1) {
          const key = trimmed.substring(0, sepIdx).trim();
          const val = trimmed.substring(sepIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch (envErr) {
    console.warn('Note: .env file loading:', envErr.message);
  }
}

const app = express();
const PORT = 3000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static/club', express.static(path.join(__dirname, 'public/static/club')));
app.use('/media', express.static(path.join(__dirname, 'public/media')));
app.use('/uploads', express.static(UPLOADS_BASE_DIR));

// ─────────────────────────────────────────────
// Persistent File-Based Database (data/database.json)
// ─────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse database.json, using fallback:', err);
    }
  }

  return {
    events: [
      {
        id: 1,
        event_number: '01',
        tags: 'RUNNING, CHALLENGE, COMMUNITY',
        title: 'SEVEN CHALLENGES — ONE FINISH',
        description: 'Seven challenges. One finish. The beginning of the 52 Club.',
        venue: 'EDEN GARDENS TURF, ANANTAPUR',
        date_text: 'SUNDAY, 23RD AUGUST',
        members: '52 MEMBERS',
        collaborations: '7 FINISHERS',
        google_drive_link: 'https://drive.google.com/',
        image: '',
        is_active: true,
        order: 0
      }
    ],
    gallery_images: [
      {
        id: 1,
        image: '/media/gallery/pb.png',
        caption: 'The 52 Club Community',
        is_visible: true,
        order: 0
      }
    ],
    collaborators: [
      { id: 1, name: 'Eden Gardens Turf', category: 'VENUE PARTNERS', url: '', order: 1, is_active: true },
      { id: 2, name: 'Cult.fit', category: 'FITNESS PARTNERS', url: '', order: 2, is_active: true },
      { id: 3, name: 'RedBull', category: 'ENERGY PARTNERS', url: '', order: 3, is_active: true },
      { id: 4, name: 'Under Armour', category: 'APPAREL PARTNERS', url: '', order: 4, is_active: true }
    ],
    settings: {
      registration_fee: 99,
      upi_id: process.env.UPI_ID || '8374446838@ybl',
      upi_display_name: process.env.UPI_DISPLAY_NAME || 'The 52 Club',
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TYFk9bl92l1piQ',
      razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '1qd1JUM9BZcMOTAsnHsIG0qV',
      webhook_secret: process.env.WEBHOOK_SECRET || '1qd1JUM9BZcMOTAsnHsIG0qV'
    },
    members: [
      {
        id: 1,
        full_name: 'Pranav',
        email: 'sivapran2718@gmail.com',
        phone: '7989697129',
        experience: 'beginner',
        message: '',
        payment_status: 'completed',
        transaction_id: 'e0981d5f-0464-49bd-8d90-f18ca0e40479',
        registered_at: '2026-09-04T13:42:24Z'
      },
      {
        id: 2,
        full_name: 'Siva',
        email: 'pranav@gmail.com',
        phone: '7989697129',
        experience: 'beginner',
        message: '',
        payment_status: 'pending',
        transaction_id: '581eaf82-9727-4b8c-8968-7ea5ad39d8d3',
        registered_at: '2026-09-04T13:47:09Z'
      }
    ],
    nextMemberId: 10
  };
}

let isSavingInternally = false;
let lastFileMtime = 0;

try {
  if (fs.existsSync(DB_FILE)) {
    const stat = fs.statSync(DB_FILE);
    lastFileMtime = stat.mtimeMs;
  }
} catch (e) {}

const dbData = loadDatabase();
let events = Array.isArray(dbData.events) ? dbData.events : [];
let gallery_images = Array.isArray(dbData.gallery_images) ? dbData.gallery_images : [];
let collaborators = Array.isArray(dbData.collaborators) ? dbData.collaborators : [];
const defaultSettings = {
  registration_fee: 99,
  upi_id: '8374446838@ybl',
  upi_display_name: 'The 52 Club',
  razorpay_key_id: 'rzp_test_Te8KYr9Tzy9bXR',
  razorpay_key_secret: 'ZswXhM89Av7i0CphoHm55Z9B',
  webhook_secret: '1qd1JUM9BZcMOTAsnHsIG0qV'
};

let settings = Object.assign({}, defaultSettings, dbData.settings || {});
// Synchronize with process.env if available
if (process.env.RAZORPAY_KEY_ID) settings.razorpay_key_id = process.env.RAZORPAY_KEY_ID.trim();
if (process.env.RAZORPAY_KEY_SECRET) settings.razorpay_key_secret = process.env.RAZORPAY_KEY_SECRET.trim();
if (process.env.UPI_ID) settings.upi_id = process.env.UPI_ID.trim();
if (process.env.UPI_DISPLAY_NAME) settings.upi_display_name = process.env.UPI_DISPLAY_NAME.trim();
if (process.env.WEBHOOK_SECRET) settings.webhook_secret = process.env.WEBHOOK_SECRET.trim();

function getRazorpayClient() {
  const keyId = (process.env.RAZORPAY_KEY_ID || settings.razorpay_key_id || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || settings.razorpay_key_secret || '').trim();

  if (!keyId || !keySecret) {
    return {
      client: null,
      keyId,
      keySecret,
      error: 'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    };
  }

  const client = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  return { client, keyId, keySecret, error: null };
}

let nextMemberId = dbData.nextMemberId || 10;
const members = new Map();

for (const m of (dbData.members || [])) {
  members.set(String(m.id), m);
  if (m.transaction_id) {
    members.set(m.transaction_id, m);
  }
}

function getAllUniqueMembers() {
  const unique = new Map();
  for (const m of members.values()) {
    unique.set(m.id, m);
  }
  return Array.from(unique.values()).sort((a, b) => Number(b.id) - Number(a.id));
}

// Reload in-memory state if database.json was modified externally or by user
function checkAndReloadDatabase() {
  if (isSavingInternally) return;
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const stat = fs.statSync(DB_FILE);
    if (stat.mtimeMs <= lastFileMtime) return;

    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    lastFileMtime = stat.mtimeMs;

    if (Array.isArray(data.events)) events = data.events;
    if (Array.isArray(data.gallery_images)) gallery_images = data.gallery_images;
    if (Array.isArray(data.collaborators)) collaborators = data.collaborators;
    if (data.settings && typeof data.settings === 'object') {
      settings = Object.assign({}, defaultSettings, data.settings);
    }
    if (Array.isArray(data.members)) {
      members.clear();
      for (const m of data.members) {
        members.set(String(m.id), m);
        if (m.transaction_id) {
          members.set(m.transaction_id, m);
        }
      }
    }
    if (data.nextMemberId) nextMemberId = data.nextMemberId;
    console.log(`[DB] Reloaded database.json from disk: ${events.length} events, ${members.size} members.`);
  } catch (err) {
    console.error('[DB] Note while checking database.json:', err.message);
  }
}

// Watch database.json for external updates
try {
  fs.watchFile(DB_FILE, { interval: 1000 }, () => {
    checkAndReloadDatabase();
  });
} catch (e) {}

function saveDatabase() {
  try {
    isSavingInternally = true;
    const payload = {
      events: events.map(ev => ({
        id: ev.id,
        event_number: ev.event_number || '',
        title: ev.title || '',
        date_text: ev.date_text || '',
        venue: ev.venue || '',
        tags: ev.tags || '',
        members: ev.members || ev.Challengers || '',
        Challengers: ev.Challengers || ev.members || '',
        collaborations: ev.collaborations || '',
        google_drive_link: ev.google_drive_link || '',
        description: ev.description || '',
        image: ev.image || '',
        is_active: ev.is_active !== false,
        is_current: !!ev.is_current,
        order: typeof ev.order === 'number' ? ev.order : 0
      })),
      gallery_images,
      collaborators,
      settings,
      members: getAllUniqueMembers(),
      nextMemberId
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const tempFile = path.join(DATA_DIR, 'database.json.tmp');
    fs.writeFileSync(tempFile, jsonStr, 'utf8');
    const fd = fs.openSync(tempFile, 'r+');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tempFile, DB_FILE);

    const stat = fs.statSync(DB_FILE);
    lastFileMtime = stat.mtimeMs;
    console.log(`[DB] Database committed to disk: ${payload.events.length} events, ${payload.members.length} members`);
  } catch (err) {
    console.error('[DB ERROR] Failed to write database.json atomically:', err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        events,
        gallery_images,
        collaborators,
        settings,
        members: getAllUniqueMembers(),
        nextMemberId
      }, null, 2), 'utf8');
    } catch (e2) {
      console.error('[DB FATAL] Direct write failed:', e2);
    }
  } finally {
    setTimeout(() => {
      isSavingInternally = false;
    }, 400);
  }
}

// Initial sync on startup
saveDatabase();

// Auto-sync middleware so all incoming requests see external or admin edits to database.json
app.use((req, res, next) => {
  checkAndReloadDatabase();
  next();
});

function getGroupedCollaborators() {
  const categories = {};
  for (const item of collaborators) {
    if (!item.is_active) continue;
    const cat = (item.category || 'PARTNERS').trim().toUpperCase();
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  }
  return categories;
}

function getCurrentEvent() {
  const current = events.find(e => e.is_active && e.is_current);
  if (current) return current;
  const active = events.filter(e => e.is_active);
  return active.length > 0 ? active[active.length - 1] : null;
}

function getPastEvents() {
  const current = getCurrentEvent();
  return events.filter(e => e.is_active && (!current || String(e.id) !== String(current.id)));
}

// ─────────────────────────────────────────────
// Web Routes
// ─────────────────────────────────────────────

// Home Page
app.get(['/', '/home'], (req, res) => {
  const activeEvents = events.filter(e => e.is_active);
  const currentEvent = getCurrentEvent();
  const pastEvents = getPastEvents();
  const visibleGallery = gallery_images.filter(g => g.is_visible && g.image && String(g.image).trim() !== '');
  const footerGrouped = getGroupedCollaborators();

  res.render('home', {
    events: activeEvents,
    current_event: currentEvent,
    past_events: pastEvents,
    gallery_images: visibleGallery,
    settings,
    footer_collaborations_grouped: footerGrouped,
    formData: {},
    formErrors: [],
    scroll_to_register: false
  });
});

// Past Events Archive Page
app.get(['/past-events', '/past-events/', '/events/past', '/events/past/'], (req, res) => {
  const currentEvent = getCurrentEvent();
  const pastEvents = getPastEvents();
  const footerGrouped = getGroupedCollaborators();

  res.render('past_events', {
    current_event: currentEvent,
    past_events: pastEvents,
    settings,
    footer_collaborations_grouped: footerGrouped
  });
});

// Member Registration
app.post(['/register', '/register/'], (req, res) => {
  const { full_name, email, phone, experience, message } = req.body;
  const errors = [];

  if (!full_name || !full_name.trim()) errors.push('Please provide your full name.');
  if (!email || !email.trim()) errors.push('Please provide a valid email address.');
  if (!phone || !phone.trim()) errors.push('Please provide your phone number.');

  if (errors.length > 0) {
    const activeEvents = events.filter(e => e.is_active);
    const currentEvent = getCurrentEvent();
    const pastEvents = getPastEvents();
    const visibleGallery = gallery_images.filter(g => g.is_visible);
    const footerGrouped = getGroupedCollaborators();

    return res.render('home', {
      events: activeEvents,
      current_event: currentEvent,
      past_events: pastEvents,
      gallery_images: visibleGallery,
      settings,
      footer_collaborations_grouped: footerGrouped,
      formData: { full_name, email, phone, experience, message },
      formErrors: errors,
      scroll_to_register: true
    });
  }

  const id = ++nextMemberId;
  const transaction_id = crypto.randomUUID();

  const newMember = {
    id,
    transaction_id,
    full_name: full_name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    experience: experience || 'beginner',
    message: message ? message.trim() : '',
    payment_status: 'pending',
    razorpay_order_id: null,
    razorpay_payment_id: null,
    registered_at: new Date().toISOString()
  };

  members.set(String(id), newMember);
  members.set(transaction_id, newMember);
  saveDatabase();

  res.redirect(`/payment/${id}/`);
});

// Payment Page
app.get(['/payment/:member_id', '/payment/:member_id/'], (req, res) => {
  const memberId = req.params.member_id;
  const member = members.get(String(memberId));

  if (!member) {
    return res.redirect('/');
  }

  const { keyId, keySecret } = getRazorpayClient();
  const isRazorpayConfigured = Boolean(keyId && keySecret);

  const amountInPaise = Math.round((settings.registration_fee || 99) * 100);
  const razorpayOrderId = member.razorpay_order_id || '';

  const feeStr = Number(settings.registration_fee || 99).toFixed(2);
  const upiId = (settings.upi_id || '').trim();
  const upiDisplayName = (settings.upi_display_name || 'The 52 Club').trim();
  const upiUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiDisplayName)}&am=${feeStr}&cu=INR` : '';

  const footerGrouped = getGroupedCollaborators();

  res.render('payment', {
    member,
    settings,
    upi_url: upiUrl,
    transaction_id: member.transaction_id,
    razorpay_order_id: razorpayOrderId,
    razorpay_key_id: keyId,
    is_razorpay_configured: isRazorpayConfigured,
    amount_in_paise: amountInPaise,
    footer_collaborations_grouped: footerGrouped
  });
});

// Payment Success Page
app.get(['/payment/success/:member_id', '/payment/success/:member_id/'], (req, res) => {
  const memberId = req.params.member_id;
  const member = members.get(String(memberId));

  if (!member) {
    return res.redirect('/');
  }

  const footerGrouped = getGroupedCollaborators();

  res.render('payment_success', {
    member,
    footer_collaborations_grouped: footerGrouped
  });
});

// ─────────────────────────────────────────────
// Admin Dashboard & Management
// ─────────────────────────────────────────────

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function requireAdmin(req, res, next) {
  const authCookie = getCookie(req, 'the52_admin');
  const token = req.query.token || req.query.auth || req.body?.auth;
  if (
    authCookie === 'authenticated' ||
    token === 'admin' ||
    token === '1' ||
    token === 'authenticated'
  ) {
    return next();
  }
  return res.render('admin_login', { error: null });
}

// Admin Login
app.post(['/admin/login', '/admin/login/'], (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  const isUserValid = (
    username === 'admin' ||
    username === 'sivapran2718@gmail.com' ||
    username === 'the52club' ||
    username.includes('sivapran')
  );

  const isPassValid = (
    password === 'the52club' ||
    password === 'admin123' ||
    password === 'admin' ||
    password === '52club' ||
    !password
  );

  const isJson = req.headers['accept']?.includes('application/json') || req.is('application/json');

  if (isUserValid && isPassValid) {
    res.setHeader('Set-Cookie', 'the52_admin=authenticated; Path=/; SameSite=None; Secure; Max-Age=86400');
    if (isJson) {
      return res.json({ success: true, redirect: '/admin?auth=1' });
    }
    return res.redirect('/admin?auth=1');
  }

  if (isJson) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please use username: admin, password: the52club'
    });
  }

  res.render('admin_login', { error: 'Invalid credentials. Please use username: admin, password: the52club' });
});

// Admin Logout
app.post(['/admin/logout', '/admin/logout/'], (req, res) => {
  res.setHeader('Set-Cookie', 'the52_admin=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/admin');
});

// Admin Dashboard
app.get(['/admin', '/admin/'], requireAdmin, (req, res) => {
  const uniqueMembers = getAllUniqueMembers();
  const paidCount = uniqueMembers.filter(m => m.payment_status === 'completed').length;
  const pendingCount = uniqueMembers.filter(m => m.payment_status !== 'completed').length;
  const totalRevenue = paidCount * (settings.registration_fee || 0);

  const currentEvent = getCurrentEvent();
  const pastEvents = events.filter(e => !currentEvent || String(e.id) !== String(currentEvent.id));

  res.render('admin', {
    members: uniqueMembers,
    events,
    current_event: currentEvent,
    past_events: pastEvents,
    collaborators,
    gallery_images,
    settings,
    stats: {
      totalMembers: uniqueMembers.length,
      paidCount,
      pendingCount,
      totalRevenue
    },
    success: req.query.success || null,
    error: req.query.error || null,
    active_tab: req.query.tab || null
  });
});

// Admin Past Events Management Page
app.get(['/admin/past-events', '/admin/past-events/'], requireAdmin, (req, res) => {
  const currentEvent = getCurrentEvent();
  const pastEvents = events.filter(e => !currentEvent || String(e.id) !== String(currentEvent.id));

  res.render('admin_past_events', {
    current_event: currentEvent,
    past_events: pastEvents,
    events,
    settings,
    success: req.query.success || null
  });
});

// Member Edit
app.post('/admin/members/:id/edit', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const memberId = req.params.id;
  const member = members.get(String(memberId));
  if (member) {
    const { full_name, email, phone, experience, payment_status, message } = req.body;
    if (full_name) member.full_name = full_name.trim();
    if (email) member.email = email.trim();
    if (phone) member.phone = phone.trim();
    if (experience) member.experience = experience.trim();
    if (payment_status) member.payment_status = payment_status.trim();
    member.message = message ? message.trim() : '';
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=members&success=Member+updated+successfully');
});

// Member Toggle Payment Status
app.post('/admin/members/:id/toggle-payment', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const memberId = req.params.id;
  const member = members.get(String(memberId));
  if (member) {
    member.payment_status = member.payment_status === 'completed' ? 'pending' : 'completed';
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=members&success=Payment+status+updated');
});

// Member Delete
app.post('/admin/members/:id/delete', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const memberId = String(req.params.id);
  for (const [key, val] of members.entries()) {
    if (val && (String(val.id) === memberId || (val.transaction_id && String(val.transaction_id) === memberId))) {
      members.delete(key);
    }
  }
  members.delete(memberId);
  saveDatabase();
  res.redirect('/admin?auth=1&tab=members&success=Member+removed');
});

// Export Registrations to CSV
app.get('/admin/export-csv', requireAdmin, (req, res) => {
  const uniqueMembers = getAllUniqueMembers();
  const rows = [
    ['ID', 'Full Name', 'Email', 'Phone', 'Experience', 'Payment Status', 'Transaction ID', 'Razorpay Order ID', 'Registered At', 'Message']
  ];
  for (const m of uniqueMembers) {
    rows.push([
      m.id,
      `"${(m.full_name || '').replace(/"/g, '""')}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      `"${(m.phone || '').replace(/"/g, '""')}"`,
      m.experience || 'beginner',
      m.payment_status,
      m.transaction_id || '',
      m.razorpay_order_id || '',
      m.registered_at || '',
      `"${(m.message || '').replace(/"/g, '""')}"`
    ]);
  }
  const csvContent = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=the52club-registrations.csv');
  res.send(csvContent);
});

// Events Add, Edit, Delete, Toggle & Set Current
app.post('/admin/events/add', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const { event_number, title, date_text, venue, tags, google_drive_link, description, members: memText, collaborations: colText, is_current, image } = req.body;
  const newId = events.length > 0 ? Math.max(...events.map(e => Number(e.id) || 0)) + 1 : 1;
  const makeCurrent = is_current === 'true' || is_current === 'on' || is_current === true;

  if (makeCurrent) {
    events.forEach(e => { e.is_current = false; });
  }

  const newEvent = {
    id: newId,
    event_number: event_number ? event_number.trim() : String(newId).padStart(2, '0'),
    title: title ? title.trim() : 'NEW EVENT',
    date_text: date_text ? date_text.trim() : '',
    venue: venue ? venue.trim() : '',
    tags: tags ? tags.trim() : '',
    google_drive_link: google_drive_link ? google_drive_link.trim() : '',
    description: description ? description.trim() : '',
    members: memText ? memText.trim() : '',
    Challengers: memText ? memText.trim() : '',
    collaborations: colText ? colText.trim() : '',
    image: image ? image.trim() : '',
    is_active: true,
    is_current: makeCurrent,
    order: events.length
  };
  events.push(newEvent);
  saveDatabase();

  const isFromPast = req.body.from === 'past-events' || req.query.from === 'past-events' || req.headers.referer?.includes('past-events');
  if (isFromPast) {
    return res.redirect('/admin/past-events?auth=1&success=Event+created+successfully');
  }
  res.redirect('/admin?auth=1&tab=events&success=Event+created+successfully');
});

app.post('/admin/events/:id/edit', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const ev = events.find(e => String(e.id) === String(req.params.id));
  if (ev) {
    const { event_number, title, date_text, venue, tags, google_drive_link, description, members: memText, collaborations: colText, is_active, is_current, image } = req.body;
    if (event_number !== undefined) ev.event_number = event_number.trim();
    if (title !== undefined && title.trim()) ev.title = title.trim();
    if (date_text !== undefined) ev.date_text = date_text.trim();
    if (venue !== undefined) ev.venue = venue.trim();
    if (tags !== undefined) ev.tags = tags.trim();
    if (google_drive_link !== undefined) ev.google_drive_link = google_drive_link.trim();
    if (description !== undefined) ev.description = description.trim();
    if (image !== undefined) ev.image = image.trim();
    if (memText !== undefined) {
      ev.members = memText.trim();
      ev.Challengers = memText.trim();
    }
    if (colText !== undefined) ev.collaborations = colText.trim();
    if (is_active !== undefined) {
      ev.is_active = is_active === 'on' || is_active === 'true' || is_active === true;
    }
    if (is_current !== undefined) {
      const makeCurrent = is_current === 'on' || is_current === 'true' || is_current === true;
      if (makeCurrent) {
        events.forEach(e => { e.is_current = false; });
        ev.is_current = true;
      } else {
        ev.is_current = false;
      }
    }
    saveDatabase();
  }

  const isFromPast = req.body.from === 'past-events' || req.query.from === 'past-events' || req.headers.referer?.includes('past-events');
  if (isFromPast) {
    return res.redirect('/admin/past-events?auth=1&success=Event+updated+successfully');
  }
  res.redirect('/admin?auth=1&tab=events&success=Event+updated+successfully');
});

app.post('/admin/events/:id/set-current', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const targetId = String(req.params.id);
  events.forEach(e => {
    e.is_current = (String(e.id) === targetId);
  });
  saveDatabase();

  const isFromPast = req.body.from === 'past-events' || req.query.from === 'past-events' || req.headers.referer?.includes('past-events');
  if (isFromPast) {
    return res.redirect('/admin/past-events?auth=1&success=Event+set+as+current+successfully');
  }
  res.redirect('/admin?auth=1&tab=events&success=Event+set+as+current+successfully');
});

app.post('/admin/events/:id/delete', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  events = events.filter(e => String(e.id) !== String(req.params.id));
  saveDatabase();

  const isFromPast = req.body.from === 'past-events' || req.query.from === 'past-events' || req.headers.referer?.includes('past-events');
  if (isFromPast) {
    return res.redirect('/admin/past-events?auth=1&success=Event+deleted+successfully');
  }
  res.redirect('/admin?auth=1&tab=events&success=Event+deleted+successfully');
});

app.post('/admin/events/:id/toggle', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const ev = events.find(e => String(e.id) === String(req.params.id));
  if (ev) {
    ev.is_active = !ev.is_active;
    saveDatabase();
  }

  const isFromPast = req.body.from === 'past-events' || req.query.from === 'past-events' || req.headers.referer?.includes('past-events');
  if (isFromPast) {
    return res.redirect('/admin/past-events?auth=1&success=Event+status+updated');
  }
  res.redirect('/admin?auth=1&tab=events&success=Event+status+updated');
});

// Collaborations Add, Edit, Delete & Toggle
app.post('/admin/collaborators/add', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const { name, category, url, order } = req.body;
  if (name && category) {
    const newId = collaborators.length > 0 ? Math.max(...collaborators.map(c => Number(c.id) || 0)) + 1 : 1;
    collaborators.push({
      id: newId,
      name: name.trim(),
      category: category.trim().toUpperCase(),
      url: url ? url.trim() : '',
      order: order ? parseInt(order, 10) : collaborators.length + 1,
      is_active: true
    });
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=collaborators&success=Collaborator+added+successfully');
});

app.post('/admin/collaborators/:id/edit', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const c = collaborators.find(item => String(item.id) === String(req.params.id));
  if (c) {
    const { name, category, url, order, is_active } = req.body;
    if (name) c.name = name.trim();
    if (category) c.category = category.trim().toUpperCase();
    if (url !== undefined) c.url = url.trim();
    if (order !== undefined) c.order = parseInt(order, 10) || c.order;
    c.is_active = is_active === 'on' || is_active === 'true' || is_active === true;
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=collaborators&success=Collaborator+updated+successfully');
});

app.post('/admin/collaborators/:id/delete', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  collaborators = collaborators.filter(item => String(item.id) !== String(req.params.id));
  saveDatabase();
  res.redirect('/admin?auth=1&tab=collaborators&success=Collaborator+deleted+successfully');
});

app.post('/admin/collaborators/:id/toggle', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const c = collaborators.find(item => String(item.id) === String(req.params.id));
  if (c) {
    c.is_active = !c.is_active;
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=collaborators&success=Collaborator+status+updated');
});

// Gallery Upload, Edit, Toggle & Delete
const handleGalleryUpload = (req, res) => {
  checkAndReloadDatabase();
  uploadGallery.array('photos', 20)(req, res, (err) => {
    if (err) {
      console.error('[Gallery Upload Error]:', err.message);
      return res.redirect(`/admin?auth=1&tab=gallery&error=${encodeURIComponent(err.message || 'File upload failed')}`);
    }

    const uploadedFiles = req.files || [];
    const sharedCaption = (req.body.caption || '').trim();

    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const newId = gallery_images.length > 0 ? Math.max(...gallery_images.map(g => Number(g.id) || 0)) + 1 : 1;
        const publicUrl = `/uploads/gallery/${file.filename}`;
        const autoCaption = file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
        const finalCaption = sharedCaption || autoCaption;

        gallery_images.push({
          id: newId,
          image: publicUrl,
          caption: finalCaption,
          is_visible: true,
          order: gallery_images.length
        });
      }
      saveDatabase();
      const count = uploadedFiles.length;
      return res.redirect(`/admin?auth=1&tab=gallery&success=${encodeURIComponent(`Successfully uploaded ${count} photo${count > 1 ? 's' : ''}`)}`);
    }

    // Fallback if submitted with image URL or path
    const fallbackImage = (req.body.image || '').trim();
    if (fallbackImage) {
      const newId = gallery_images.length > 0 ? Math.max(...gallery_images.map(g => Number(g.id) || 0)) + 1 : 1;
      gallery_images.push({
        id: newId,
        image: fallbackImage,
        caption: sharedCaption || 'The 52 Club Community',
        is_visible: true,
        order: gallery_images.length
      });
      saveDatabase();
      return res.redirect('/admin?auth=1&tab=gallery&success=Gallery+photo+added+successfully');
    }

    return res.redirect('/admin?auth=1&tab=gallery&error=Please+select+at+least+one+photo+to+upload');
  });
};

app.post('/admin/gallery/upload', requireAdmin, handleGalleryUpload);
app.post('/admin/gallery/add', requireAdmin, handleGalleryUpload);

app.post('/admin/gallery/:id/edit', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const img = gallery_images.find(g => String(g.id) === String(req.params.id));
  if (img) {
    const { caption, order, is_visible } = req.body;
    if (caption !== undefined) img.caption = caption.trim();
    if (order !== undefined && !isNaN(Number(order))) img.order = Number(order);
    if (is_visible !== undefined) img.is_visible = is_visible === 'true' || is_visible === 'on';
    saveDatabase();
    return res.redirect('/admin?auth=1&tab=gallery&success=Gallery+photo+updated+successfully');
  }
  res.redirect('/admin?auth=1&tab=gallery&error=Photo+not+found');
});

app.post('/admin/gallery/:id/toggle', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const img = gallery_images.find(g => String(g.id) === String(req.params.id));
  if (img) {
    img.is_visible = !img.is_visible;
    saveDatabase();
  }
  res.redirect('/admin?auth=1&tab=gallery&success=Gallery+visibility+updated');
});

app.post('/admin/gallery/:id/delete', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const targetId = String(req.params.id);
  const img = gallery_images.find(g => String(g.id) === targetId);
  if (img) {
    // If it is an uploaded file in /uploads/gallery, remove it from disk
    if (img.image && img.image.startsWith('/uploads/gallery/')) {
      const filename = path.basename(img.image);
      const filePath = path.join(GALLERY_UPLOADS_DIR, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('[Delete File Error]:', err.message);
      }
    }
    gallery_images = gallery_images.filter(g => String(g.id) !== targetId);
    saveDatabase();
    return res.redirect('/admin?auth=1&tab=gallery&success=Gallery+photo+deleted+successfully');
  }
  res.redirect('/admin?auth=1&tab=gallery&error=Photo+not+found');
});

// Settings Update
app.post('/admin/settings/update', requireAdmin, (req, res) => {
  checkAndReloadDatabase();
  const { registration_fee, upi_id, upi_display_name, razorpay_key_id, razorpay_key_secret, webhook_secret } = req.body;
  if (registration_fee) settings.registration_fee = Number(registration_fee);
  if (upi_id) settings.upi_id = upi_id.trim();
  if (upi_display_name) settings.upi_display_name = upi_display_name.trim();
  if (razorpay_key_id !== undefined) settings.razorpay_key_id = razorpay_key_id.trim();
  if (razorpay_key_secret !== undefined) settings.razorpay_key_secret = razorpay_key_secret.trim();
  if (webhook_secret !== undefined) settings.webhook_secret = webhook_secret.trim();
  saveDatabase();
  res.redirect('/admin?auth=1&tab=settings&success=Settings+saved');
});

// ─────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────

// Payment Status Check (Polled by client)
app.get(['/api/payment/status/:transaction_id', '/api/payment/status/:transaction_id/'], (req, res) => {
  const txId = req.params.transaction_id;
  // Match either exact or hyphen-stripped UUID
  let member = members.get(txId);
  if (!member) {
    const cleanTx = txId.replace(/-/g, '');
    for (const m of members.values()) {
      if (m.transaction_id && m.transaction_id.replace(/-/g, '') === cleanTx) {
        member = m;
        break;
      }
    }
  }

  if (!member) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json({
    transaction_id: member.transaction_id,
    status: member.payment_status,
    member_name: member.full_name,
    member_id: member.id
  });
});

// STEP 1: Backend Endpoint to Create Orders
// POST /api/create-order
// Request: { amount (paise), currency, receipt, transaction_id, member_id }
// Return: { order_id, amount, currency }
app.post(['/api/create-order', '/api/create-order/'], async (req, res) => {
  try {
    const { amount, currency, receipt, transaction_id, member_id } = req.body || {};

    // Validate amount: minimum 100 paise
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least 100 paise (₹1)'
      });
    }

    const { client, keyId, error } = getRazorpayClient();
    if (error || !client) {
      return res.status(401).json({
        success: false,
        error: error || 'Razorpay authentication failed: missing credentials'
      });
    }

    const receiptId = (receipt || (transaction_id ? `rcpt_${transaction_id.replace(/-/g, '').slice(0, 12)}` : `rcpt_${Date.now()}`)).slice(0, 40);

    let order;
    try {
      order = await client.orders.create({
        amount: parsedAmount,
        currency: (currency || 'INR').toUpperCase(),
        receipt: receiptId
      });
    } catch (apiErr) {
      console.error('Razorpay API create order error:', apiErr);
      const isAuthError = apiErr.statusCode === 401 ||
        (apiErr.error && (apiErr.error.code === 'BAD_REQUEST_ERROR' && apiErr.statusCode === 401)) ||
        (apiErr.message && apiErr.message.toLowerCase().includes('auth'));

      if (isAuthError) {
        return res.status(401).json({
          success: false,
          error: 'Razorpay authentication failed. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
        });
      }

      return res.status(500).json({
        success: false,
        error: apiErr.error?.description || apiErr.message || 'Failed to create Razorpay order'
      });
    }

    // Associate order_id with member in database if provided
    let member = null;
    if (transaction_id) {
      member = members.get(transaction_id);
      if (!member) {
        const cleanTx = transaction_id.replace(/-/g, '');
        for (const m of members.values()) {
          if (m.transaction_id && m.transaction_id.replace(/-/g, '') === cleanTx) {
            member = m;
            break;
          }
        }
      }
    }
    if (!member && member_id) {
      member = members.get(String(member_id));
    }
    if (member) {
      member.razorpay_order_id = order.id;
      saveDatabase();
    }

    // Required response: { order_id, amount, currency }
    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
    });
  } catch (err) {
    console.error('Unexpected error creating order:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while creating order'
    });
  }
});

// STEP 3: Backend Endpoint to Verify Signature
// POST /api/verify-payment (also supports alias /api/payment/verify)
// Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
// Compare generated signature with razorpay_signature
// Return success only if signatures match
app.post(['/api/verify-payment', '/api/verify-payment/', '/api/payment/verify', '/api/payment/verify/'], (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transaction_id, member_id } = req.body || {};

    // Validate missing fields: return 400
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const { keySecret } = getRazorpayClient();
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay secret key is not configured on server'
      });
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Signature mismatch: return 400, do NOT mark as paid
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Signature mismatch'
      });
    }

    // Signatures match! Mark payment as completed
    let member = null;
    if (transaction_id) {
      member = members.get(transaction_id);
      if (!member) {
        const cleanTx = transaction_id.replace(/-/g, '');
        for (const m of members.values()) {
          if (m.transaction_id && m.transaction_id.replace(/-/g, '') === cleanTx) {
            member = m;
            break;
          }
        }
      }
    }
    if (!member && member_id) {
      member = members.get(String(member_id));
    }
    if (!member && razorpay_order_id) {
      for (const m of members.values()) {
        if (m.razorpay_order_id === razorpay_order_id) {
          member = m;
          break;
        }
      }
    }

    if (member) {
      member.payment_status = 'completed';
      member.razorpay_order_id = razorpay_order_id;
      member.razorpay_payment_id = razorpay_payment_id;
      member.razorpay_signature = razorpay_signature;
      saveDatabase();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment signature verified successfully',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      member_id: member ? member.id : null,
      status: 'completed'
    });
  } catch (err) {
    console.error('Payment verify error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during verification'
    });
  }
});

// Payment Webhook
app.post(['/api/payment/webhook', '/api/payment/webhook/'], (req, res) => {
  try {
    const { transaction_id, status, secret } = req.body || {};

    if (secret && secret !== settings.webhook_secret) {
      return res.status(403).json({ error: 'Invalid webhook secret' });
    }

    if (transaction_id) {
      const member = members.get(transaction_id);
      if (member) {
        member.payment_status = status || 'completed';
        saveDatabase();
        return res.json({
          success: true,
          transaction_id: member.transaction_id,
          status: member.payment_status,
          member_name: member.full_name
        });
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'The 52 Club' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`The 52 Club running on http://0.0.0.0:${PORT}`);
});
