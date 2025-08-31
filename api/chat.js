// paint-guru.js - client for Paint Guru chat

async function sendPaintGuruMessage(message, opts = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      ...opts
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Paint Guru unavailable');
  }
  const data = await res.json();
  return data.reply;
}

// Example usage: wire up to a chat UI
window.paintGuru = {
  send: sendPaintGuruMessage
};
// CREATE TABLE IF NOT EXISTS chat_log (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   ts TEXT,
//   session TEXT,
//   question TEXT,
//   answer TEXT,
//   ai_provider TEXT,
//   user_agent TEXT,
//   page TEXT
// );
// Optionally, you can add UI integration here, e.g.:
// document.querySelector('#paint-guru-form').onsubmit = async function(e) {
//   e.preventDefault();
//   const input = document.querySelector('#paint-guru-input');
//   const chat = document.querySelector('#paint-guru-chat');
//   chat.innerHTML += `<div class="user-msg">${input.value}</div>`;
//   try {
//     const reply = await sendPaintGuruMessage(input.value);
//     chat.innerHTML += `<div class="guru-msg">${reply}</div>`;
//   } catch (err) {
//     chat.innerHTML += `<div class="guru-msg error">${err.message}</div>`;
//   }
//   input.value = '';
// };
