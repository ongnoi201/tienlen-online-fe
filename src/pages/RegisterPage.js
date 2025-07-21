import React, { useState } from 'react';
import { register } from '../UserService';
import { useNavigate } from 'react-router-dom';
import './style.css';

function RegisterPage() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await register({ name, username, password });
        if (res && res.status === 200) {
            window.alertify.success('Đăng ký thành công!');
            setName('');
            setUsername('');
            setPassword('');
        } else {
            window.alertify.error(res.message || 'Đăng ký thất bại');
        }
    };

    return (
        <div className="register-container">
            <h2>Đăng ký</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Tên hiển thị"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
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
                <button type="submit">Đăng ký</button>
            </form>
            <div className='login-link'>
                Đã có tài khoản? <button onClick={()=>navigate('/login')}>Đăng nhập</button>
            </div>
        </div>
    );
}

export default RegisterPage;
