const API_URL = 'https://tienlen-online-be.onrender.com/api';

export const register = async (data) => {
    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
};

export const login = async (data) => {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
};

export const getUser = async (id, token) => {
    const res = await fetch(`${API_URL}/user/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
};

export const editUser = async (id, data, token) => {
    const res = await fetch(`${API_URL}/user/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return res.json();
};

export const deleteUser = async (id, token) => {
    const res = await fetch(`${API_URL}/user/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
};
