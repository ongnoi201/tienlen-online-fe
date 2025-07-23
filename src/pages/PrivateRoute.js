import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTERS } from '../utils/router';


const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        return <Navigate to={ROUTERS.LOGIN} />;
    }
    return children;
};

export default PrivateRoute;