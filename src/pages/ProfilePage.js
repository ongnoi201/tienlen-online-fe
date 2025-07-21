import React, { useEffect, useState } from 'react';
import { deleteUser, editUser, getUser } from '../UserService';
import { useNavigate } from 'react-router-dom';

function ProfilePage() {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const token = user.token || '';
    const userId = user._id || user.id || '';
    const [profile, setProfile] = useState(user);
    const [editMode, setEditMode] = useState(false);
    const [name, setName] = useState('');
    const [pic, setPic] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    window.alertify.set('notifier','position', 'top-left');
    window.alertify.set('notifier', 'delay', 2);

    useEffect(() => {
        async function fetchUser() {
            const res = await getUser(userId, token);
            if (res && res._id) {
                setProfile(res);
                setPic(res.image);
                setName(res.name);
            }
        }
        fetchUser();
    }, [userId, token]);

    const handleEdit = async (e) => {
        e.preventDefault();

        const updatedFields = {
            name,
            image: pic || profile.image,
        };

        if (password) updatedFields.password = password;

        const res = await editUser(profile._id || user.id, updatedFields, token);

        if (res && res.status === 200) {
            setProfile(prev => ({
                ...prev,
                ...updatedFields,
            }));
            setEditMode(false);
            window.alertify.success(res.message || 'Cập nhật thành công!');
            setName(updatedFields.name);
            setPassword('');
        } else {
            window.alertify.error(res.message || 'Cập nhật thất bại');
        }
    };


    const handleDelete = async () => {
        if (!window.confirm('Bạn chắc chắn muốn xóa tài khoản?')) return;
        const res = await deleteUser(profile._id || user.id, token);
        if (res.message) {
            window.alertify.success(res.message);
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="profile-container">
            <img src={profile.image} alt='profile-pic' />
            <div className='information'>
                <p className='user-name'>
                    <span>{profile.name}</span>
                    <span>@{profile.username}</span>
                    <span>{profile.score}🟡</span>
                </p>
                <p className='user-username'></p>
                <p className='user-create'>{new Date(profile.timestamp).toLocaleString()}</p>
            </div>
            {editMode ? (
                <form onSubmit={handleEdit}>
                    <input
                        type="text"
                        value={pic}
                        onChange={e => setPic(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mật khẩu mới (nếu đổi)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <div className='btn-edit-profile'>
                        <button onClick={handleEdit} className='btn-save' type="submit">Lưu</button>
                        <button className='btn-cancle' type="button" onClick={() => setEditMode(false)}>Hủy</button>
                    </div>
                </form>
            ) : (
                <div className="profile-actions">
                    <button onClick={() => setEditMode(true)}>Chỉnh sửa</button>
                    <button onClick={handleDelete} style={{ color: 'red' }}>Xóa tài khoản</button>
                </div>
            )}
            <button className='btn-login' onClick={handleLogout}>👉</button>
        </div>
    );
}

export default ProfilePage;
