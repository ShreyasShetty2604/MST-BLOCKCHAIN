import React, { useState, useEffect } from 'react';
import { Role, PatientPersona, CheckupReminder } from './mock/types';
import { mockApi } from './mock/api';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { EmergencySheet } from './components/EmergencySheet';
import { DemoToolsDrawer } from './components/DemoToolsDrawer';
import { BackendVisualizerModal } from './components/BackendVisualizerModal';

// Pages
import { LandingOnboardingPage } from './pages/LandingOnboardingPage';
import { LoginPage } from './pages/PatientApp/LoginPage';
import { PatientLayout, PatientTab } from './pages/PatientApp/PatientLayout';
import { HomeTab } from './pages/PatientApp/HomeTab';
import { RecordsTab } from './pages/PatientApp/RecordsTab';
import { AccessTab } from './pages/PatientApp/AccessTab';
import { AssistantTab } from './pages/PatientApp/AssistantTab';
import { WellnessTab } from './pages/PatientApp/WellnessTab';
import { HospitalPortalPage } from './pages/HospitalPortalPage';
import { AdminPortalPage } from './pages/AdminPortalPage';

export function App() {
  const [role, setRole] = useState<Role | 'landing'>('landing');
  const [patientTab, setPatientTab] = useState<PatientTab>('home');
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activePersona, setActivePersona] = useState<PatientPersona | null>(null);
  const [reminders, setReminders] = useState<CheckupReminder[]>([]);
  const [emergencyOpen, setEmergencyOpen] = useState<boolean>(false);
  const [backendVisualizerOpen, setBackendVisualizerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial active persona & data
  const refreshPersona = async () => {
    const p = await mockApi.getCurrentPatient();
    const rems = await mockApi.getReminders();
    setActivePersona(p);
    setReminders(rems);
  };

  useEffect(() => {
    refreshPersona();
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'patient') {
      setPatientTab('home');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleLoginSuccess = (persona: PatientPersona) => {
    setActivePersona(persona);
    setIsPatientLoggedIn(true);
    setRole('patient');
    setPatientTab('home');
  };

  const handleLogoutPatient = () => {
    setIsPatientLoggedIn(false);
    showToast('Patient vault locked.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-teal-500 selection:text-white">
      {/* Global Navigation Header */}
      <Header
        currentRole={role === 'landing' ? 'patient' : role}
        onRoleChange={handleRoleChange}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        activePersona={activePersona}
        isPatientLoggedIn={isPatientLoggedIn}
        onLogoutPatient={handleLogoutPatient}
        onOpenBackendVisualizer={() => setBackendVisualizerOpen(true)}
      />

      {/* Main Content View Switcher */}
      <div className="flex-1 flex flex-col">
        {role === 'landing' && (
          <LandingOnboardingPage
            onCompleteOnboarding={() => {
              setIsPatientLoggedIn(true);
              setRole('patient');
            }}
            onGoHospitalLogin={() => setRole('hospital')}
          />
        )}

        {role === 'patient' && (
          !isPatientLoggedIn ? (
            /* AUTHENTICATION GUARD: Render Login Page if Unauthenticated */
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onGoToOnboarding={() => setRole('landing')}
              onShowToast={showToast}
            />
          ) : (
            /* AUTHENTICATED PATIENT APP */
            activePersona && (
              <PatientLayout activeTab={patientTab} onTabChange={setPatientTab}>
                {patientTab === 'home' && (
                  <HomeTab
                    persona={activePersona}
                    reminders={reminders}
                    onOpenEmergency={() => setEmergencyOpen(true)}
                    onNavigateTab={(t) => setPatientTab(t)}
                  />
                )}

                {patientTab === 'records' && <RecordsTab />}

                {patientTab === 'access' && <AccessTab />}

                {patientTab === 'assistant' && (
                  <AssistantTab
                    persona={activePersona}
                    onOpenEmergencyCard={() => setEmergencyOpen(true)}
                  />
                )}

                {patientTab === 'wellness' && (
                  <WellnessTab persona={activePersona} onShowToast={showToast} />
                )}
              </PatientLayout>
            )
          )
        )}

        {role === 'hospital' && <HospitalPortalPage onShowToast={showToast} />}

        {role === 'admin' && <AdminPortalPage onShowToast={showToast} />}
      </div>

      {/* Full-Screen Emergency Sheet Modal */}
      {activePersona && (
        <EmergencySheet
          isOpen={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          persona={activePersona}
        />
      )}

      {/* Live Backend & Smart Contract Visualizer Modal */}
      <BackendVisualizerModal
        isOpen={backendVisualizerOpen}
        onClose={() => setBackendVisualizerOpen(false)}
      />

      {/* Presenter Demo Toolbox Drawer (Ctrl+K) */}
      <DemoToolsDrawer
        onStateChange={() => refreshPersona()}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
