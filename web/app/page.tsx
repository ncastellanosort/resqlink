"use client"

import { LoginPage } from "@/components/auth/login-form";
import { RegisterPage } from "@/components/auth/register-form";
import { useState } from "react";

export default function App() {
  const [view, setView] = useState<'login' | 'register'>('login');

  return view === 'login' ? (
    <LoginPage onSwitchToRegister={() => setView('register')} />
  ) : (
    <RegisterPage onSwitchToLogin={() => setView('login')} />
  );
}