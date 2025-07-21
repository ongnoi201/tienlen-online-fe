import React from "react";
import { Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MasterLayout from "./pages/theme/masterLayout";
import { ROUTERS } from "./utils/router";
import RegisterPage from "./pages/RegisterPage";
import App from "./App";
import PrivateRoute from "./pages/PrivateRoute";
import ProfilePage from "./pages/ProfilePage";


const RenderUserRouter = () => {
  return (
    <MasterLayout>
      <Routes>
        <Route path={ROUTERS.HOME} element={<PrivateRoute><App /></PrivateRoute>}/>
        <Route path={ROUTERS.PERSONAL} element={<PrivateRoute><ProfilePage /></PrivateRoute>}/>
        <Route path={ROUTERS.LOGIN} element={<LoginPage />}/>
        <Route path={ROUTERS.REGISTER} element={<RegisterPage />}/>
      </Routes>
    </MasterLayout>
  );
};

const RouterCustom = () => <RenderUserRouter />;

export default RouterCustom;
