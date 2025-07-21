const soundMap = {
  playCard: ['/audio/danh.mp3'],
  passTurn: ['/audio/khongco.mp3', '/audio/boqua.mp3'],
  cut2: ['/audio/may-ha-buoi.mp3', '/audio/ngu-ne.mp3'],
  win: ['/audio/may-con-ga.mp3', '/audio/thua-di-cung.mp3', '/audio/hehe.mp3'],
  selectCard: ['/audio/click.mp3'],
  deal: ['/audio/chia.mp3'],
};

// Lưu lại instance Audio cho âm thanh loop (chia bài)
let dealAudioInstance = null;

export function playSound(type) {
  const list = soundMap[type];
  if (!list || list.length === 0) return;

  const soundSrc = list.length === 1 ? list[0] : list[Math.floor(Math.random() * list.length)];
  const audio = new Audio(soundSrc);
  audio.volume = 1.0;
  if (type === 'deal') {
    audio.loop = true;
    dealAudioInstance = audio;
  }
  audio.play().catch(err => {
    console.warn('Cannot play sound:', err);
  });
}

export function stopSound(type) {
  if (type === 'deal' && dealAudioInstance) {
    dealAudioInstance.pause();
    dealAudioInstance.currentTime = 0;
    dealAudioInstance = null;
    return;
  }
  const list = soundMap[type];
  if (!list || list.length === 0) return;
  
  const soundSrc = list[0]; // Giả sử chỉ cần dừng âm thanh đầu tiên
  const audio = new Audio(soundSrc);
  audio.pause();
  audio.loop = false; // Dừng lặp lại nếu có
}
