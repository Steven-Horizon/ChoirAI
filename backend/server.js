const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const db = require('./db');

const app = express();
const PORT = 3001;

// DeepSeek API config
const DEEPSEEK_API_KEY = process.env.DEEPEEK_API_KEY || 'sk-7fa9ea181c2748d793f26f184fe756de';
const DEEPSEEK_API_URL = 'api.deepseek.com';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Allow all common file types for sheet music, audio, etc.
    cb(null, true);
  }
});

function generateScoreParts(title) {
  return {
    soprano: {
      name: '女高音 (Soprano)', color: '#ef4444',
      notes: [
        { note: 'C4', duration: '4n', time: '0:0:0' },
        { note: 'E4', duration: '4n', time: '0:1:0' },
        { note: 'G4', duration: '4n', time: '0:2:0' },
        { note: 'A4', duration: '4n', time: '0:3:0' },
        { note: 'G4', duration: '2n', time: '1:0:0' },
        { note: 'E4', duration: '4n', time: '1:2:0' },
        { note: 'C4', duration: '2n', time: '1:3:0' },
      ]
    },
    alto: {
      name: '女低音 (Alto)', color: '#3b82f6',
      notes: [
        { note: 'G3', duration: '4n', time: '0:0:0' },
        { note: 'C4', duration: '4n', time: '0:1:0' },
        { note: 'E4', duration: '4n', time: '0:2:0' },
        { note: 'F4', duration: '4n', time: '0:3:0' },
        { note: 'E4', duration: '2n', time: '1:0:0' },
        { note: 'C4', duration: '4n', time: '1:2:0' },
        { note: 'G3', duration: '2n', time: '1:3:0' },
      ]
    },
    tenor: {
      name: '男高音 (Tenor)', color: '#22c55e',
      notes: [
        { note: 'E3', duration: '4n', time: '0:0:0' },
        { note: 'G3', duration: '4n', time: '0:1:0' },
        { note: 'C4', duration: '4n', time: '0:2:0' },
        { note: 'D4', duration: '4n', time: '0:3:0' },
        { note: 'C4', duration: '2n', time: '1:0:0' },
        { note: 'G3', duration: '4n', time: '1:2:0' },
        { note: 'E3', duration: '2n', time: '1:3:0' },
      ]
    },
    bass: {
      name: '男低音 (Bass)', color: '#d97706',
      notes: [
        { note: 'C3', duration: '4n', time: '0:0:0' },
        { note: 'E3', duration: '4n', time: '0:1:0' },
        { note: 'G3', duration: '4n', time: '0:2:0' },
        { note: 'F3', duration: '4n', time: '0:3:0' },
        { note: 'E3', duration: '2n', time: '1:0:0' },
        { note: 'G3', duration: '4n', time: '1:2:0' },
        { note: 'C3', duration: '2n', time: '1:3:0' },
      ]
    },
    tempo: 72, key: 'C大调', timeSignature: '4/4', totalMeasures: 2
  };
}

// ========== SCORES ==========
app.get('/api/scores', (req, res) => {
  const rows = db.prepare('SELECT id, title, composer, file_path, tempo, key_sig, time_signature, total_measures, created_at FROM scores ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/scores/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM scores WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, parts_data: row.parts_data ? JSON.parse(row.parts_data) : null });
});

app.post('/api/scores', upload.single('file'), (req, res) => {
  const { title, composer } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;
  const parts = generateScoreParts(title);
  const result = db.prepare(
    'INSERT INTO scores (title, composer, file_path, parts_data, tempo, key_sig, time_signature, total_measures) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, composer || '', filePath, JSON.stringify(parts), parts.tempo, parts.key, parts.timeSignature, parts.totalMeasures);
  res.json({ id: result.lastInsertRowid, title, composer: composer || '', file_path: filePath, tempo: parts.tempo, key_sig: parts.key, time_signature: parts.timeSignature, total_measures: parts.totalMeasures, parts_data: parts });
});

// ========== DEEPSEEK LLM ==========
function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    });

    const options = {
      hostname: DEEPSEEK_API_URL,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            reject(new Error('No response from DeepSeek'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(postData);
    req.end();
  });
}

// ========== CHAT with DeepSeek ==========
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let sid = sessionId;
  if (!sid) {
    const result = db.prepare('INSERT INTO chat_sessions (title) VALUES (?)').run(message.slice(0, 30));
    sid = result.lastInsertRowid;
  }

  // Save user message
  db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
    .run(sid, 'user', message);

  // Get conversation history
  const history = db.prepare(
    'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 20'
  ).all(sid);

  // Build messages for DeepSeek
  const systemPrompt = `你是 ChoirAI 合唱智能训练助手。你具备以下专业能力：

1. 合唱训练指导：制定个性化训练计划、指导音准/节奏/发声技巧
2. 乐理知识：调式调性、和声学、视唱练耳
3. 谱面分析：分析合唱谱子的调性、拍号、和声走向、难点段落、声部安排
4. 声部协调：多声部配合建议、音量平衡、音色融合

回复时请使用中文，保持专业但亲切。如果用户提到谱子，尝试分析谱子的音乐特征。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
  ];

  try {
    const aiContent = await callDeepSeek(messages);

    db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sid, 'assistant', aiContent);

    res.json({ sessionId: sid, content: aiContent });
  } catch (err) {
    console.error('DeepSeek error:', err.message);
    // Fallback to keyword-based response
    const lower = message.toLowerCase();
    let fallback = '';
    if (lower.includes('计划') || lower.includes('训练')) {
      fallback = '## 14天合唱训练计划\n\n### 第1-3天：基础熟悉\n- 慢速(60BPM)跟唱3遍\n- 重点：第1-4小节音准\n\n### 第4-7天：音准强化\n- 音阶模唱10分钟\n- 提速至72BPM\n\n### 第8-10天：声部融合\n- 完整跟唱2遍\n- 录音自查\n\n### 第11-14天：合排准备\n- 模拟合排\n- 准备考核';
    } else if (lower.includes('音准')) {
      fallback = '## 音准训练建议\n1. 慢速练习，逐步加快\n2. 使用App音高检测实时看偏差\n3. 大跳音程单独练习\n4. 每日音阶上下行';
    } else {
      fallback = '我是你的合唱训练助手。你可以问我关于：\n- 制定训练计划\n- 音准/节奏训练方法\n- 谱面分析\n- 声部协调建议\n\n也可以上传乐谱让我帮你分析难点。';
    }

    db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sid, 'assistant', fallback);

    res.json({ sessionId: sid, content: fallback, _fallback: true });
  }
});

app.get('/api/chat/sessions', (req, res) => {
  const sessions = db.prepare('SELECT * FROM chat_sessions ORDER BY created_at DESC').all();
  res.json(sessions);
});

app.get('/api/chat/sessions/:id/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(messages);
});

// ========== REHEARSAL RECORDS ==========
app.post('/api/rehearsal/start', (req, res) => {
  const { scoreId, settings } = req.body;
  const result = db.prepare('INSERT INTO rehearsal_records (score_id, start_time, settings) VALUES (?, datetime("now"), ?)').run(scoreId, JSON.stringify(settings || {}));
  res.json({ id: result.lastInsertRowid });
});

app.post('/api/rehearsal/:id/end', (req, res) => {
  const { issues } = req.body;
  db.prepare('UPDATE rehearsal_records SET end_time = datetime("now"), issues = ? WHERE id = ?').run(JSON.stringify(issues || []), req.params.id);
  res.json({ success: true });
});

app.get('/api/rehearsal/records', (req, res) => {
  const rows = db.prepare('SELECT r.*, s.title as score_title FROM rehearsal_records r LEFT JOIN scores s ON r.score_id = s.id ORDER BY r.created_at DESC').all();
  res.json(rows.map(r => ({ ...r, settings: r.settings ? JSON.parse(r.settings) : null, issues: r.issues ? JSON.parse(r.issues) : null })));
});

// ========== SERVE FRONTEND ==========
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

app.listen(PORT, () => console.log(`ChoirAI backend on http://localhost:${PORT}`));
