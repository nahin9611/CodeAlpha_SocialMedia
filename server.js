const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codealpha_social';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

// ==========================================
// 1. DATABASE MODELS
// ==========================================

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  bio: { type: String, default: 'Software Engineering enthusiast & creator ✨' },
  avatar: { type: String, default: '' },
  banner: { type: String, default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80' },
  verified: { type: Boolean, default: true },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shares: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema);

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, name, email, password, bio, avatar } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }

    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const user = await User.create({
      username,
      name,
      email,
      password: hashPassword(password),
      bio: bio || 'Exploring PulseSocial Luxury Edition ✨',
      avatar: defaultAvatar,
      verified: true
    });

    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const query = emailOrUsername.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ email: query }, { username: query }]
    });

    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. USER PROFILE, SETTINGS & FOLLOW ROUTES
// ==========================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'name username avatar verified')
      .populate('following', 'name username avatar verified');

    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = await Post.find({ user: user._id })
      .populate('user', 'name username avatar verified')
      .sort({ createdAt: -1 })
      .lean();

    for (let post of posts) {
      post.comments = await Comment.find({ post: post._id })
        .populate('user', 'name username avatar verified')
        .sort({ createdAt: 1 });
    }

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile & Settings
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, bio, avatar, banner, verified, newPassword } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (banner !== undefined) updateFields.banner = banner;
    if (verified !== undefined) updateFields.verified = verified;
    if (newPassword && newPassword.trim().length >= 4) {
      updateFields.password = hashPassword(newPassword.trim());
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).select('-password');
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow / Unfollow Toggle
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { currentUserId } = req.body;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = targetUser.followers.some(id => id.toString() === currentUserId);

    if (isFollowing) {
      targetUser.followers.pull(currentUserId);
      currentUser.following.pull(targetUserId);
    } else {
      targetUser.followers.push(currentUserId);
      currentUser.following.push(targetUserId);
    }

    await targetUser.save();
    await currentUser.save();

    const updatedCurrentUser = await User.findById(currentUserId).select('-password');
    res.json({
      isFollowing: !isFollowing,
      currentUser: updatedCurrentUser,
      targetFollowersCount: targetUser.followers.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. POSTS, LIKES, SHARES & COMMENTS ROUTES
// ==========================================

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name username avatar verified')
      .sort({ createdAt: -1 })
      .lean();

    for (let post of posts) {
      post.comments = await Comment.find({ post: post._id })
        .populate('user', 'name username avatar verified')
        .sort({ createdAt: 1 });
    }

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { userId, content, image } = req.body;
    if (!content) return res.status(400).json({ error: 'Post content is required' });

    const newPost = await Post.create({
      user: userId,
      content,
      image: image || ''
    });

    const populatedPost = await Post.findById(newPost._id).populate('user', 'name username avatar verified').lean();
    populatedPost.comments = [];
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isLiked = post.likes.some(id => id.toString() === userId);
    if (isLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ likes: post.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment Share Count
app.post('/api/posts/:id/share', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ shares: post.shares });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    const comment = await Comment.create({
      post: req.params.id,
      user: userId,
      text
    });

    const populatedComment = await Comment.findById(comment._id).populate('user', 'name username avatar verified');
    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. DEMO SEEDER
// ==========================================
app.post('/api/seed', async (req, res) => {
  try {
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});

    const u1 = await User.create({
      username: 'nahin_dev',
      name: 'Zuham Nahin',
      email: 'nahin@example.com',
      password: hashPassword('123456'),
      bio: 'Full-Stack Software Engineer 💻 | Building scalable luxury web platforms #CodeAlpha #FullStack',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nahin',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      verified: true
    });

    const u2 = await User.create({
      username: 'sarah_codes',
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      password: hashPassword('123456'),
      bio: 'Principal UI/UX Architect & Design Systems Lead 🎨✨ #Design #UIUX',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1000&q=80',
      verified: true
    });

    const u3 = await User.create({
      username: 'alex_tech',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      password: hashPassword('123456'),
      bio: 'Cloud Infrastructure & Node.js Performance Engineer ☁️⚡ #WebDev',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      banner: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1000&q=80',
      verified: true
    });

    u1.followers.push(u2._id, u3._id);
    u1.following.push(u2._id);
    u2.followers.push(u1._id);
    u2.following.push(u1._id, u3._id);
    u3.followers.push(u2._id);
    u3.following.push(u1._id);
    await Promise.all([u1.save(), u2.save(), u3.save()]);

    const p1 = await Post.create({
      user: u1._id,
      content: 'Just launched the Luxury Edition of PulseSocial for #CodeAlpha! Featuring adaptive Day/Night glassmorphism, custom accent themes, instant post sharing, and full account settings. 🚀✨ #FullStack #WebDev',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
      likes: [u2._id, u3._id],
      shares: 14
    });

    const p2 = await Post.create({
      user: u2._id,
      content: 'Testing out the new Day/Night mode switch and Royal Gold accent palette in Settings. High-contrast glassmorphism feels so smooth! 🎨💎 #UIUX #Design',
      image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=900&q=80',
      likes: [u1._id],
      shares: 6
    });

    await Comment.create({
      post: p1._id,
      user: u2._id,
      text: 'The glassmorphism and theme switcher are next level! Incredible execution 👏🔥'
    });

    await Comment.create({
      post: p1._id,
      user: u3._id,
      text: 'Just shared this post! Everything runs at 60fps with zero latency.'
    });

    const userObj = u1.toObject();
    delete userObj.password;
    res.json({ message: 'Luxury Demo Data Seeded!', demoUser: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 6. REAL-TIME CHATBOX & PULSE-AI ROUTES
// ==========================================
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: String, required: true }, // User ID or 'pulse_ai'
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Get conversation between current user and target user (or AI)
app.get('/api/messages/:userId/:targetId', async (req, res) => {
  try {
    const { userId, targetId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    const userMsg = await Message.create({ sender: senderId, receiver: receiverId, text });
    res.status(201).json(userMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Luxury PulseSocial running at http://localhost:${PORT}`);
});