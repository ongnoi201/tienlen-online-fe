import { io } from 'socket.io-client';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const userId = user._id || user.id || null;

const socket = io('https://tienlen-online-be.onrender.com', {
    auth: { userId }
});

export default socket;
