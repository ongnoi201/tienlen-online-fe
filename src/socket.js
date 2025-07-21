import { io } from 'socket.io-client';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const userId = user._id || user.id || null;

const socket = io('http://localhost:3001', {
    auth: { userId }
});

export default socket;
