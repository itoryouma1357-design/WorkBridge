import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
// public フォルダを静的ファイルとして配信
app.use(express.static('public'));

// =======================
// MongoDB接続
// =======================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// =======================
// スキーマ定義
// =======================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String, // 'client' or 'worker'
  phone: String,
  username: String,
  birthdate: Date,
  parentalConsent: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, default: false }
  ,
  // profile fields
  bio: String,
  achievements: String,
  availability: String
});

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  clientId: mongoose.Schema.Types.ObjectId,
  applicants: [mongoose.Schema.Types.ObjectId],
  acceptedUserId: mongoose.Schema.Types.ObjectId,
  status: { type: String, default: 'open' },
  // 発注向けフィールド
  category: String,
  deliverableFormat: String,
  requirements: String,
  price: Number,
  recruitmentStart: Date,
  recruitmentEnd: Date,
  positions: Number,
  contactMethod: String
});

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);

// =======================
// 認証ミドルウェア
// =======================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'トークンが必要です' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '無効なトークンです' });
  }
}

// =======================
// APIルート
// =======================

// ユーザー登録
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, phone, username, birthdate, parentalConsent, termsAccepted } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    // 生年月日から年齢計算（簡易）
    if (birthdate) {
      const b = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - b.getFullYear();
      const m = today.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
      if (age < 18 && !parentalConsent) {
        return res.status(400).json({ error: '未成年の場合、保護者の同意が必要です' });
      }
    }

    // 利用規約同意が必須
    if (!termsAccepted) {
      return res.status(400).json({ error: '利用規約に同意してください' });
    }

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || 'worker',
      phone: phone || '',
      username: username || '',
      birthdate: birthdate ? new Date(birthdate) : null,
      parentalConsent: !!parentalConsent,
      termsAccepted: !!termsAccepted
    });

    // create token and return it so client can auto-login and continue to profile
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.status(201).json({ message: '登録完了', token });
  } catch (err) {
    res.status(400).json({ error: '登録失敗: ' + err.message });
  }
});

// ログイン
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: '認証失敗' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  res.json({ token });
});

// 仕事の投稿（発注者のみ）
app.post('/api/jobs', auth, async (req, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: '発注者のみ投稿可能' });
  const job = await Job.create({ ...req.body, clientId: req.user.id });
  res.status(201).json(job);
});

// 仕事一覧取得
app.get('/api/jobs', async (req, res) => {
  const jobs = await Job.find();
  res.json(jobs);
});

// 応募（受注者のみ）
app.post('/api/jobs/:id/apply', auth, async (req, res) => {
  if (req.user.role !== 'worker') return res.status(403).json({ error: '受注者のみ応募可能' });
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: '仕事が見つかりません' });

  if (job.applicants.includes(req.user.id)) {
    return res.status(400).json({ error: 'すでに応募済みです' });
  }

  job.applicants.push(req.user.id);
  await job.save();
  res.json({ message: '応募完了' });
});

// 応募承認（発注者のみ）
app.post('/api/jobs/:id/accept', auth, async (req, res) => {
  const { userId } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job || job.clientId.toString() !== req.user.id) {
    return res.status(403).json({ error: '承認権限がありません' });
  }

  if (!job.applicants.includes(userId)) {
    return res.status(400).json({ error: '応募者ではありません' });
  }

  job.acceptedUserId = userId;
  job.status = 'in_progress';
  await job.save();
  res.json({ message: '承認完了' });
});

// ユーザー情報取得（簡易、認証あり）
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    // hide sensitive fields (password, birthdate, parentalConsent, termsAccepted)
    const user = await User.findById(req.params.id).select('-password -birthdate -parentalConsent -termsAccepted');
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 自分のプロフィールを取得
app.get('/api/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -birthdate -parentalConsent -termsAccepted');
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// プロフィール更新（ログインユーザー）
app.post('/api/profile', auth, async (req, res) => {
  const { username, bio, achievements, availability } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { username, bio, achievements, availability }, { new: true }).select('-password -birthdate -parentalConsent -termsAccepted');
    res.json({ message: 'プロフィールを保存しました', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =======================
// サーバー起動
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
