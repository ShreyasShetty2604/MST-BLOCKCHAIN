import React, { useState, useEffect } from 'react';
import { Role, PatientPersona, CheckupReminder } from './mock/types';
import { mockApi } from './mock/api';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { EmergencySheet } from './components/EmergencySheet';
import { DemoToolsDrawer } from './components/DemoToolsDrawer';
import { BackendVisualizerModal } from './components/BackendVisualizerModal';
import { CameraQrScannerModal } from './components/CameraQrScannerModal';

// Pages
import { LandingOnboardingPage } from './pages/LandingOnboardingPage';
import { LoginPage } from './pages/PatientApp/LoginPage';
import { PatientLayout, PatientTab } from './pages/PatientApp/PatientLayout';
import { HomeTab } from './pages/PatientApp/HomeTab';
import { IdentitySecurityTab } from './pages/PatientApp/IdentitySecurityTab';
import { RecordsTab } from './pages/PatientApp/RecordsTab';
import { AccessTab } from './pages/PatientApp/AccessTab';
import { AssistantTab } from './pages/PatientApp/AssistantTab';
import { WellnessTab } from './pages/PatientApp/WellnessTab';
import { HospitalPortalPage } from './pages/HospitalPortalPage';
import { HospitalLandingPage, HospitalStaffSession } from './pages/HospitalLandingPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { AdminLandingPage, AdminOfficerSession } from './pages/AdminLandingPage';

export function App() {
  const [role, setRole] = useState<Role | 'landing'>('landing');
  const [patientTab, setPatientTab] = useState<PatientTab>('home');
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState<boolean>(false);
  const [isHospitalLoggedIn, setIsHospitalLoggedIn] = useState<boolean>(false);
  const [hospitalSession, setHospitalSession] = useState<HospitalStaffSession | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminSession, setAdminSession] = useState<AdminOfficerSession | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activePersona, setActivePersona] = useState<PatientPersona | null>(null);
  const [reminders, setReminders] = useState<CheckupReminder[]>([]);
  const [emergencyOpen, setEmergencyOpen] = useState<boolean>(false);
  const [backendVisualizerOpen, setBackendVisualizerOpen] = useState<boolean>(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState<boolean>(false);
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
        onOpenScanner={() => setCameraScannerOpen(true)}
        isHospitalLoggedIn={isHospitalLoggedIn}
        hospitalFacilityName={hospitalSession?.facilityName}
        onLogoutHospital={() => {
          setIsHospitalLoggedIn(false);
          showToast('Hospital session closed.');
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        adminOfficerName={adminSession?.officerName}
        onLogoutAdmin={() => {
          setIsAdminLoggedIn(false);
          showToast('Governance session locked.');
        }}
      />

      {/* Main Content View Switcher */}
      <div className="flex-1 flex flex-col">
        {role === 'landing' && (
          <LandingOnboardingPage
            onCompleteOnboarding={async () => {
              await refreshPersona();
              setIsPatientLoggedIn(true);
              setRole('patient');
              setPatientTab('home');
            }}
            onGoHospitalLogin={() => setRole('hospital')}
            onGoAdminLogin={() => setRole('admin')}
            onOpenScanner={() => setCameraScannerOpen(true)}
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
                    onOpenScanner={() => setCameraScannerOpen(true)}
                  />
                )}

                {patientTab === 'identity' && (
                  <IdentitySecurityTab
                    persona={activePersona}
                    onShowToast={showToast}
                    onOpenEmergency={() => setEmergencyOpen(true)}
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

        {role === 'hospital' && (
          !isHospitalLoggedIn ? (
            <HospitalLandingPage
              onLoginSuccess={(session) => {
                setHospitalSession(session);
                setIsHospitalLoggedIn(true);
              }}
              onGoBack={() => setRole('landing')}
              onOpenScanner={() => setCameraScannerOpen(true)}
              onShowToast={showToast}
            />
          ) : (
            <HospitalPortalPage
              onShowToast={showToast}
              session={hospitalSession}
              onLogout={() => {
                setIsHospitalLoggedIn(false);
                showToast('Hospital session closed.');
              }}
            />
          )
        )}

        {role === 'admin' && (
          !isAdminLoggedIn ? (
            <AdminLandingPage
              onLoginSuccess={(session) => {
                setAdminSession(session);
                setIsAdminLoggedIn(true);
              }}
              onGoBack={() => setRole('landing')}
              onShowToast={showToast}
            />
          ) : (
            <AdminPortalPage
              onShowToast={showToast}
              session={adminSession}
              onLogout={() => {
                setIsAdminLoggedIn(false);
                showToast('Governance session locked.');
              }}
            />
          )
        )}
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

      {/* Universal Optical Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        scannerRole={role === 'hospital' ? 'hospital' : 'emergency'}
        title="Universal MediID Optical Camera Scanner"
        onPatientLoaded={(scannedPatient) => {
          showToast(`✓ Scanned Patient: ${scannedPatient.name} (${scannedPatient.mediId})`);
        }}
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
