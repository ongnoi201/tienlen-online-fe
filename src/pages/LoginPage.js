import React, { useState } from 'react';
import './style.css';
import { login } from '../UserService';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login({ username, password });
        if (res && res.status === 200) {
            window.alertify.success('Đăng nhập thành công!');
            localStorage.setItem('user', JSON.stringify(res.data));
            setUsername('');
            setPassword('');
            navigate('/');
        } else {
            window.alertify.error(res.message || 'Đăng nhập thất bại');
        }
    };

    return (
        <div className="login-container">
            <h2>Đăng nhập</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Đăng nhập</button>
            </form>
            <div className='register-link'>
                Chưa có tài khoản? <button onClick={()=>navigate('/register')}>Đăng ký.</button>
            </div>
        </div>
    );
}

export default LoginPage;
